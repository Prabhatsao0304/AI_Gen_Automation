/**
 * Slack Reporter
 * Reads a Cucumber JSON report and posts a formatted summary to Slack.
 * Triggered automatically after every test run via package.json scripts.
 *
 * Usage: node src/shared/scripts/slack-reporter.js <report.json> <suite-name>
 */

import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { getSelfHealDriftLogPath } from '../locators/fallback-locator.js';
import { getSelectorReportPath, getSelectorSummaryPath } from '../locators/selector-intelligence.js';

dotenv.config({ path: new URL('../../../.env', import.meta.url).pathname });

const WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;
const [, , reportPath, suiteName = 'Automation'] = process.argv;

if (!WEBHOOK_URL) {
  console.error('Missing SLACK_WEBHOOK_URL in .env');
  process.exit(1);
}

if (!reportPath || !fs.existsSync(reportPath)) {
  console.error(`Report not found: ${reportPath}`);
  process.exit(1);
}

function countSelfHealDriftEvents() {
  const driftPath = getSelfHealDriftLogPath();
  if (!fs.existsSync(driftPath)) return 0;
  const raw = fs.readFileSync(driftPath, 'utf8').trim();
  if (!raw) return 0;
  return raw.split('\n').filter(Boolean).length;
}

/** Rows from `selector-resolution-report.json` (fallback + cache reorder). */
function loadSelectorResolutionReport() {
  const p = getSelectorReportPath();
  if (!fs.existsSync(p)) return [];
  try {
    const j = JSON.parse(fs.readFileSync(p, 'utf8'));
    return Array.isArray(j) ? j : [];
  } catch {
    return [];
  }
}

/** Optional file written by developers after MCP investigation; included in Slack when present. */
function parseReport(filePath) {
  let features;
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    features = JSON.parse(raw);
  } catch (err) {
    return {
      totalScenarios: 0,
      passed: 0,
      failed: 0,
      totalSteps: 0,
      passedSteps: 0,
      failedSteps: 0,
      durationSec: '0.0',
      passRate: 0,
      failures: [
        {
          feature: 'N/A',
          scenario: 'N/A',
          step: 'Report generation',
          error: `Unable to parse JSON report. Cucumber may have failed before writing it. (${String(err?.message || err).slice(0, 120)})`,
        },
      ],
      reportParseError: true,
    };
  }
  let totalScenarios = 0, passed = 0, failed = 0;
  let totalSteps = 0, passedSteps = 0, failedSteps = 0;
  let totalDurationNs = 0;
  const failures = [];

  for (const feature of features) {
    for (const scenario of feature.elements || []) {
      totalScenarios++;
      let scenarioFailed = false;

      for (const step of scenario.steps || []) {
        totalSteps++;
        totalDurationNs += step.result?.duration || 0;

        if (step.result?.status === 'passed') {
          passedSteps++;
        } else if (step.result?.status === 'failed') {
          failedSteps++;
          scenarioFailed = true;
          failures.push({
            feature: feature.name,
            scenario: scenario.name,
            step: step.name,
            error: (step.result?.error_message || '').split('\n')[0].trim().slice(0, 120),
          });
        }
      }

      scenarioFailed ? failed++ : passed++;
    }
  }

  return {
    totalScenarios, passed, failed,
    totalSteps, passedSteps, failedSteps,
    durationSec: (totalDurationNs / 1e9).toFixed(1),
    passRate: totalScenarios > 0 ? Math.round((passed / totalScenarios) * 100) : 0,
    failures,
    reportParseError: false,
  };
}

function buildPayload(stats, suiteName, selfHealFallbacks, selectorEvents) {
  const allPassed = stats.failed === 0 && stats.reportParseError !== true;
  const now = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  const blocks = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `${allPassed ? '✅' : '❌'} ${suiteName} — Automation Report`,
        emoji: true,
      },
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Status*\n${allPassed ? 'ALL PASSED' : 'SOME FAILED'}` },
        { type: 'mrkdwn', text: `*Pass Rate*\n${stats.passRate}%` },
        { type: 'mrkdwn', text: `*Scenarios*\n✅ ${stats.passed}  ❌ ${stats.failed}  📋 ${stats.totalScenarios} total` },
        { type: 'mrkdwn', text: `*Steps*\n✅ ${stats.passedSteps}  ❌ ${stats.failedSteps}  📋 ${stats.totalSteps} total` },
        { type: 'mrkdwn', text: `*Duration*\n⏱ ${stats.durationSec}s` },
        { type: 'mrkdwn', text: `*Run At*\n🕐 ${now} IST` },
      ],
    },
    { type: 'divider' },
  ];

  if (selfHealFallbacks > 0) {
    const driftRel = path.relative(process.cwd(), getSelfHealDriftLogPath()) || 'self-heal-events.jsonl';
    blocks.splice(2, 0, {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text:
          `*Locator fallbacks (self-heal)*\n⚠️ *${selfHealFallbacks}* secondary locator strateg${selfHealFallbacks === 1 ? 'y' : 'ies'} used during this run. ` +
          `See \`${driftRel}\` for timestamps, context, and URL.`,
      },
    });
  }

  if (selectorEvents.length > 0) {
    const reportRel = path.relative(process.cwd(), getSelectorReportPath()) || 'selector-resolution-report.json';
    const summaryRel = path.relative(process.cwd(), getSelectorSummaryPath()) || 'selector-intelligence-summary.md';
    const fallbackCount = selectorEvents.filter((e) => e.fallbackUsed).length;
    const cacheReorderCount = selectorEvents.filter((e) => e.reorderedFromCache).length;
    const allContinued = selectorEvents.every((e) => e.continued !== false);
    const lines = selectorEvents.slice(0, 8).map((e) => {
      const kind = e.cdpRecovery ? 'cdp recovery' : e.fallbackUsed ? 'fallback' : 'cache reorder';
      return `• *\`${e.context}\`* (${kind}): \`${e.originalPrimaryStrategy}\` → \`${e.resolvedStrategy}\``;
    });
    if (selectorEvents.length > 8) {
      lines.push(`_…and ${selectorEvents.length - 8} more (see JSON)._`);
    }
    const statusLine = allContinued
      ? '✅ Automation *continued successfully* after resolving with updated strategy order or fallbacks.'
      : '⚠️ Some resolution rows may need review (`continued` flag).';
    blocks.splice(selfHealFallbacks > 0 ? 3 : 2, 0, {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text:
          `*Selector intelligence*\n` +
          `${statusLine}\n` +
          `Events: *${selectorEvents.length}* (fallback: *${fallbackCount}*, cache reorder: *${cacheReorderCount}*).\n` +
          `${lines.join('\n')}\n` +
          `_Artifacts: \`${reportRel}\`, \`${summaryRel}\`_`,
      },
    });
  }

  if (stats.failures.length > 0) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text:
          '*🔧 Debug workflow*\n' +
          (stats.reportParseError
            ? 'Cucumber failed before producing a valid JSON report. Fix the underlying runtime error (browser install, env, hooks) and rerun.'
            : 'HTML report includes an *Automation debug context* attachment (URL + self-heal info). Check the page-object selectors / fallback strategies and rerun.'),
      },
    });
    blocks.push({ type: 'section', text: { type: 'mrkdwn', text: '*❌ Failed Scenarios*' } });
    for (const f of stats.failures) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Feature:* ${f.feature}\n*Scenario:* ${f.scenario}\n*Step:* \`${f.step}\`\n*Error:* ${f.error}`,
        },
      });
    }
    blocks.push({ type: 'divider' });
  }

  blocks.push({
    type: 'context',
    elements: [{ type: 'mrkdwn', text: `🤖 FarMart Automation  •  ${suiteName}  •  ${now}` }],
  });

  return { attachments: [{ color: allPassed ? '#2EB67D' : '#E01E5A', blocks }] };
}

const stats = parseReport(reportPath);
const selfHealFallbacks = countSelfHealDriftEvents();
const selectorEvents = loadSelectorResolutionReport();
const res = await fetch(WEBHOOK_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(buildPayload(stats, suiteName, selfHealFallbacks, selectorEvents)),
});

if (!res.ok) throw new Error(`Slack webhook failed: ${res.status}`);
console.log(
  `✅ Slack report sent — ${stats.passed}/${stats.totalScenarios} passed` +
    (selectorEvents.length ? ` (selector intelligence: ${selectorEvents.length} event(s))` : '')
);
