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

function parseReport(filePath) {
  const features = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
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
  };
}

function buildPayload(stats, suiteName, selfHealFallbacks) {
  const allPassed = stats.failed === 0;
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

  if (stats.failures.length > 0) {
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
const res = await fetch(WEBHOOK_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(buildPayload(stats, suiteName, selfHealFallbacks)),
});

if (!res.ok) throw new Error(`Slack webhook failed: ${res.status}`);
console.log(`✅ Slack report sent — ${stats.passed}/${stats.totalScenarios} passed`);
