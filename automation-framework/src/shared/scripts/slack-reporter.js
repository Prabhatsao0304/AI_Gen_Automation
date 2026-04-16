/**
 * Slack Reporter
 * Reads a Cucumber JSON report and posts a formatted summary to Slack.
 * Triggered automatically after every test run via package.json scripts.
 *
 * Usage: node src/shared/scripts/slack-reporter.js <report.json> <suite-name> [design-report.json]
 */

import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { getSelfHealDriftLogPath } from '../locators/fallback-locator.js';
import { getSelectorReportPath, getSelectorSummaryPath } from '../locators/selector-intelligence.js';
import { buildDesignSummary } from '../design/design-report-summary.js';

dotenv.config({ path: new URL('../../../.env', import.meta.url).pathname });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../../..');
const WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const SLACK_CHANNEL_ID = process.env.SLACK_CHANNEL_ID;
const SHOW_DETAILED_DESIGN_SLACK_SECTION = false;
const [, , reportPath, suiteName = 'Automation', designAuditPath] = process.argv;

const resolveProjectPath = (inputPath) => {
  if (!inputPath) return '';
  return path.isAbsolute(inputPath) ? inputPath : path.resolve(projectRoot, inputPath);
};

const resolvedReportPath = resolveProjectPath(reportPath);
const inferredDesignAuditPath = resolvedReportPath?.replace(/\.json$/i, '.design.json');
const resolvedDesignAuditPath = resolveProjectPath(designAuditPath || inferredDesignAuditPath);

if (!WEBHOOK_URL && !(SLACK_BOT_TOKEN && SLACK_CHANNEL_ID)) {
  console.error('Missing Slack configuration. Provide SLACK_WEBHOOK_URL, or SLACK_BOT_TOKEN + SLACK_CHANNEL_ID.');
  process.exit(1);
}

if (!resolvedReportPath || !fs.existsSync(resolvedReportPath)) {
  console.error(`Report not found: ${resolvedReportPath || reportPath}`);
  process.exit(1);
}

function countSelfHealDriftEvents() {
  const driftPath = getSelfHealDriftLogPath();
  if (!fs.existsSync(driftPath)) return 0;
  const raw = fs.readFileSync(driftPath, 'utf8').trim();
  if (!raw) return 0;
  return raw.split('\n').filter(Boolean).length;
}

function loadSelectorResolutionReport() {
  const reportPathForSelectors = getSelectorReportPath();
  if (!fs.existsSync(reportPathForSelectors)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(reportPathForSelectors, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseReport(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8').trim();
    if (!raw) {
      return {
        totalScenarios: 0,
        passed: 0,
        failed: 0,
        totalSteps: 0,
        passedSteps: 0,
        failedSteps: 0,
        durationSec: '0.0',
        passRate: 0,
        failures: [],
        modules: [],
      };
    }

    const features = JSON.parse(raw);
    let totalScenarios = 0;
    let passed = 0;
    let failed = 0;
    let totalSteps = 0;
    let passedSteps = 0;
    let failedSteps = 0;
    let totalDurationNs = 0;
    const failures = [];
    const modulesMap = new Map();
    const bugTypeCounts = new Map();

    for (const feature of features) {
      const featureName = feature?.name || 'Unnamed feature';
      const scenarios = feature?.elements || [];
      if (!modulesMap.has(featureName)) {
        modulesMap.set(featureName, { feature: featureName, scenarios: 0, failed: 0 });
      }
      const mod = modulesMap.get(featureName);

      for (const scenario of feature.elements || []) {
        totalScenarios += 1;
        mod.scenarios += 1;
        let scenarioFailed = false;

        for (const step of scenario.steps || []) {
          totalSteps += 1;
          totalDurationNs += step.result?.duration || 0;

          if (step.result?.status === 'passed') {
            passedSteps += 1;
          } else if (step.result?.status === 'failed') {
            failedSteps += 1;
            scenarioFailed = true;
            const firstLine = (step.result?.error_message || '').split('\n')[0].trim();
            const bugMatch = firstLine.match(/^\[BUG\]\[([A-Z0-9_]+)\]\s+/);
            if (bugMatch?.[1]) {
              const k = bugMatch[1];
              bugTypeCounts.set(k, (bugTypeCounts.get(k) || 0) + 1);
            }
            failures.push({
              feature: feature.name,
              scenario: scenario.name,
              step: step.name,
              error: firstLine.slice(0, 160),
            });
          }
        }

        if (scenarioFailed) mod.failed += 1;
        scenarioFailed ? failed++ : passed++;
      }
    }

    return {
      totalScenarios,
      passed,
      failed,
      totalSteps,
      passedSteps,
      failedSteps,
      durationSec: (totalDurationNs / 1e9).toFixed(1),
      passRate: totalScenarios > 0 ? Math.round((passed / totalScenarios) * 100) : 0,
      failures,
      modules: Array.from(modulesMap.values())
        .sort((a, b) => b.scenarios - a.scenarios)
        .slice(0, 12),
      bugTypes: Array.from(bugTypeCounts.entries())
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count),
    };
  } catch (error) {
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
          error: `Unable to parse JSON report. ${String(error?.message || error).slice(0, 120)}`,
        },
      ],
      modules: [],
      bugTypes: [],
    };
  }
}

function parseDesignAudit(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

function summarizeDesignFindings(designAudit, limit = 4) {
  const grouped = new Map();

  for (const scenario of designAudit?.scenarios || []) {
    for (const finding of scenario.findings || []) {
      const key = [
        finding.title,
        finding.category,
        finding.report_context?.summary_title || finding.message,
      ].join('::');

      const existing = grouped.get(key);
      if (!existing) {
        grouped.set(key, {
          ...finding,
          scenarios: [scenario.scenario_name],
        });
        continue;
      }

      existing.scenarios = [...new Set([...existing.scenarios, scenario.scenario_name])];
    }
  }

  return Array.from(grouped.values()).slice(0, limit);
}

function summarizeComponentAnalysis(designAudit) {
  const components = designAudit?.component_analysis || [];
  return components
    .map((component) => ({
      component_name: component.display_name || component.component_name,
      instance_count: component.instance_count ?? component.instances_observed ?? 0,
      match_status: component.match_status || 'Unknown',
      storybook_status: component.storybook_status || 'unknown',
    }))
    .sort((left, right) => right.instance_count - left.instance_count)
    .slice(0, 12);
}

function formatComponentNames(names = [], emptyLabel = '—', limit = 20) {
  if (!Array.isArray(names) || names.length === 0) {
    return emptyLabel;
  }

  const visibleNames = names.slice(0, limit);
  const suffix = names.length > limit ? `  •  +${names.length - limit} more` : '';
  return `${visibleNames.join('  •  ')}${suffix}`;
}

function collectDesignEvidenceFiles(designAudit, limit = 10) {
  const evidenceFiles = [];
  const seenPaths = new Set();

  for (const finding of summarizeDesignFindings(designAudit, 10)) {
    const context = finding.report_context || {};
    const rawPath = context.screenshot_path || finding.evidence?.screenshot_path || '';
    const resolvedPath = resolveProjectPath(rawPath);
    if (!resolvedPath || !fs.existsSync(resolvedPath) || seenPaths.has(resolvedPath)) {
      continue;
    }

    seenPaths.add(resolvedPath);
    evidenceFiles.push({
      filePath: resolvedPath,
      title: context.summary_title || finding.title || path.basename(resolvedPath),
      altText: context.possible_real_issue || finding.message || 'Design mismatch evidence',
      initialComment: [
        `Design mismatch evidence: ${context.summary_title || finding.title}`,
        context.pixel_evidence ? `Pixel evidence: ${context.pixel_evidence}` : null,
      ]
        .filter(Boolean)
        .join('\n'),
    });
  }

  return evidenceFiles.slice(0, limit);
}

function buildDashboardUrl(reportFilePath) {
  const dashboardFile = path.basename(String(reportFilePath || '').replace(/\.json$/i, '.dashboard.html'));
  return `http://127.0.0.1:4173/${dashboardFile}`;
}

async function slackApiCall(method, body, options = {}) {
  const bodyType = options.bodyType || 'json';
  const headers = {
    Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
  };

  let payload = body;
  if (bodyType === 'form') {
    headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=utf-8';
    payload = new URLSearchParams(
      Object.entries(body || {}).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== null) {
          acc[key] = String(value);
        }
        return acc;
      }, {})
    ).toString();
  } else {
    headers['Content-Type'] = 'application/json; charset=utf-8';
    payload = JSON.stringify(body);
  }

  const response = await fetch(`https://slack.com/api/${method}`, {
    method: 'POST',
    headers,
    body: payload,
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.ok) {
    throw new Error(`Slack API ${method} failed: ${result.error || response.status}`);
  }

  return result;
}

async function postMessageWithBot(payload) {
  return slackApiCall('chat.postMessage', {
    channel: SLACK_CHANNEL_ID,
    text: payload.text || `${suiteName} automation report`,
    attachments: payload.attachments,
    unfurl_links: false,
    unfurl_media: false,
  });
}

async function postMessageWithWebhook(payload) {
  const response = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Slack webhook failed: ${response.status}`);
  }

  return null;
}

async function uploadFileToSlackChannel({ filePath, title, initialComment, threadTs = null }) {
  const fileBuffer = fs.readFileSync(filePath);
  const filename = path.basename(filePath);

  const uploadTarget = await slackApiCall(
    'files.getUploadURLExternal',
    {
      filename,
      length: fileBuffer.length,
    },
    { bodyType: 'form' }
  );

  const uploadResponse = await fetch(uploadTarget.upload_url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Length': String(fileBuffer.length),
    },
    body: fileBuffer,
  });

  if (!uploadResponse.ok) {
    throw new Error(`Slack file upload failed: ${uploadResponse.status}`);
  }

  return slackApiCall('files.completeUploadExternal', {
    files: [{ id: uploadTarget.file_id, title }],
    channel_id: SLACK_CHANNEL_ID,
    ...(threadTs ? { thread_ts: threadTs } : {}),
    initial_comment: initialComment,
  });
}

function buildPayload(stats, suiteName, designAudit, designReportState = {}, selfHealFallbacks = 0, selectorEvents = []) {
  const allPassed = stats.failed === 0;
  const now = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  const summary = designAudit?.summary || {};
  const auditSummary = designAudit?.audit_summary || {};
  const designSummaryState = buildDesignSummary(designAudit);
  const componentRows = summarizeComponentAnalysis(designAudit);

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

  if (Array.isArray(stats.modules) && stats.modules.length > 0) {
    const lines = stats.modules.map((m) => {
      const status = m.failed > 0 ? `❌ ${m.failed}` : '✅ 0';
      return `• *${m.feature}* — ${m.scenarios} scenario(s) (${status} failed)`;
    });
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Modules run*\n${lines.join('\n')}`,
      },
    });
  }

  if (Array.isArray(stats.bugTypes) && stats.bugTypes.length > 0) {
    const rows = stats.bugTypes.slice(0, 8).map((b) => `• *${b.type}*: ${b.count}`);
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Bug classification (from failures)*\n${rows.join('\n')}`,
      },
    });
  }

  if (selfHealFallbacks > 0) {
    const driftRel = path.relative(process.cwd(), getSelfHealDriftLogPath()) || 'self-heal-events.jsonl';
    blocks.push({
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
    const fallbackCount = selectorEvents.filter((event) => event.fallbackUsed).length;
    const cacheReorderCount = selectorEvents.filter((event) => event.reorderedFromCache).length;
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text:
          `*Selector intelligence*\nEvents: *${selectorEvents.length}* (fallback: *${fallbackCount}*, cache reorder: *${cacheReorderCount}*).\n` +
          `_Artifacts: \`${reportRel}\`, \`${summaryRel}\`_`,
      },
    });
  }

  if (stats.failures.length > 0) {
    blocks.push({ type: 'section', text: { type: 'mrkdwn', text: '*❌ Failed Scenarios*' } });
    for (const failure of stats.failures) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Feature:* ${failure.feature}\n*Scenario:* ${failure.scenario}\n*Step:* \`${failure.step}\`\n*Error:* ${failure.error}`,
        },
      });
    }
    blocks.push({ type: 'divider' });
  }

  blocks.push({
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: '*🎨 Non-blocking Design Report*\nSeparate from functional status. Design findings do not fail the suite.',
    },
  });

  blocks.push({
    type: 'section',
    fields: [
      { type: 'mrkdwn', text: `*No. of Components Used (Rendered Instances)*\n${summary.components_used ?? 0}` },
      { type: 'mrkdwn', text: `*CCL*\n${summary.ccl_component_count ?? 0}` },
      { type: 'mrkdwn', text: `*Matching*\n${summary.matching_central_component_library ?? 0}` },
      { type: 'mrkdwn', text: `*Mismatching*\n${summary.mismatching_central_component_library ?? 0}` },
      { type: 'mrkdwn', text: `*Run Time*\n${summary.runtime_sec ?? 0}s` },
      { type: 'mrkdwn', text: `*Total Findings*\n${summary.total_findings ?? 0}` },
      { type: 'mrkdwn', text: `*Audited Scenarios*\n${summary.scenarios_audited ?? 0}` },
      { type: 'mrkdwn', text: `*Release Risk*\n${designSummaryState.releaseRisk}` },
      { type: 'mrkdwn', text: `*Evidence Screenshots*\n${designSummaryState.screenshotCount}` },
    ],
  });

  blocks.push({
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `*Dashboard URL*\n${buildDashboardUrl(resolvedReportPath)}`,
    },
  });

  const categorySummary = Object.entries(summary.by_category || {})
    .map(([name, count]) => `${name}: ${count}`)
    .join('  •  ');
  const severitySummary = Object.entries(summary.by_severity || {})
    .map(([name, count]) => `${name}: ${count}`)
    .join('  •  ');

  if (SHOW_DETAILED_DESIGN_SLACK_SECTION) {
    blocks.push({
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Findings*\n${summary.total_findings ?? 0}` },
        { type: 'mrkdwn', text: `*Audited Scenarios*\n${summary.scenarios_audited ?? 0}` },
        { type: 'mrkdwn', text: `*Categories*\n${categorySummary || '—'}` },
        { type: 'mrkdwn', text: `*Severity*\n${severitySummary || '—'}` },
      ],
    });

    blocks.push({
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Component Types Detected*\n${summary.component_types_detected ?? 0}` },
        { type: 'mrkdwn', text: `*Variant Components*\n${summary.variant_components ?? 0}` },
        { type: 'mrkdwn', text: `*Missing Expected Components*\n${summary.missing_expected_components ?? 0}` },
        { type: 'mrkdwn', text: `*Unmapped Components*\n${summary.unmapped_components ?? 0}` },
      ],
    });

    blocks.push({
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Token Drift*\nSpacing ${designSummaryState.tokenDrift.spacing}  •  Radius ${designSummaryState.tokenDrift.radius}  •  Typography ${designSummaryState.tokenDrift.typography}`,
        },
        {
          type: 'mrkdwn',
          text: `*Accessibility*\nUnlabeled controls ${designSummaryState.accessibility.unlabeledControls}  •  Missing alt ${designSummaryState.accessibility.missingAlt}`,
        },
        {
          type: 'mrkdwn',
          text: `*Security Signals*\nLink protections ${designSummaryState.security.linkProtections}  •  Secret exposure ${designSummaryState.security.secretExposure}`,
        },
      ],
    });

    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: designReportState.evidence_count > 0
          ? designReportState.slack_image_upload_enabled
            ? `*Focused mismatch screenshots*\n${designReportState.evidence_count} screenshot(s) will be attached in this Slack thread for the mismatched design findings.`
            : '*Focused mismatch screenshots*\nCaptured for the design report, but not attached here because this run is using webhook-only Slack config. Add `SLACK_BOT_TOKEN` and `SLACK_CHANNEL_ID` to attach the focused mismatch screenshots in Slack.'
          : '*Focused mismatch screenshots*\nNo focused mismatch screenshots were generated in this run.',
      },
    });
  }

  const componentTable = [
    '```',
    'Component          | Count   | Match      | Library',
    '-------------------|---------|------------|------------------------',
    ...componentRows.map((component) =>
      [
        String(component.component_name).padEnd(18, ' ').slice(0, 18),
        String(component.instance_count).padStart(5, ' '),
        String(component.match_status).padEnd(10, ' ').slice(0, 10),
        String(component.storybook_status).slice(0, 24),
      ].join(' | ')
    ),
    '```',
  ].join('\n');

  blocks.push({
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `*Component Analysis*\n${componentTable}`,
    },
  });

  blocks.push({ type: 'divider' });
  blocks.push({
    type: 'context',
    elements: [{ type: 'mrkdwn', text: `🤖 FarMart Automation  •  ${suiteName}  •  ${now}` }],
  });

  return { attachments: [{ color: allPassed ? '#2EB67D' : '#E01E5A', blocks }] };
}

const stats = parseReport(resolvedReportPath);
const designAudit = parseDesignAudit(resolvedDesignAuditPath);
const selfHealFallbacks = countSelfHealDriftEvents();
const selectorEvents = loadSelectorResolutionReport();
const designEvidenceFiles = collectDesignEvidenceFiles(designAudit);
const designReportState = {
  path: resolvedDesignAuditPath,
  found: Boolean(designAudit?.summary),
  slack_image_upload_enabled: Boolean(SLACK_BOT_TOKEN && SLACK_CHANNEL_ID),
  evidence_count: designEvidenceFiles.length,
};

if (!designAudit && resolvedDesignAuditPath) {
  console.warn(`Design report not found or invalid: ${resolvedDesignAuditPath}`);
}

const payload = buildPayload(stats, suiteName, designAudit, designReportState, selfHealFallbacks, selectorEvents);
let threadTs = null;
let usedWebhookFallback = false;

if (SLACK_BOT_TOKEN && SLACK_CHANNEL_ID) {
  try {
    const postResult = await postMessageWithBot(payload);
    threadTs = postResult.ts || null;
  } catch (error) {
    if (!WEBHOOK_URL) {
      throw error;
    }

    console.warn(`Slack bot delivery failed, falling back to webhook-only report: ${error.message}`);
    usedWebhookFallback = true;
    await postMessageWithWebhook(payload);
  }

  if (designEvidenceFiles.length > 0) {
    for (const evidenceFile of designEvidenceFiles) {
      try {
        await uploadFileToSlackChannel({
          ...evidenceFile,
          threadTs,
          initialComment: threadTs
            ? evidenceFile.initialComment
            : [
                evidenceFile.initialComment,
                usedWebhookFallback
                  ? 'Shared as standalone design evidence because threaded Slack upload was unavailable for the main report.'
                  : null,
              ]
                .filter(Boolean)
                .join('\n'),
        });
      } catch (error) {
        console.warn(
          `Failed to upload design mismatch screenshot to Slack (${path.basename(evidenceFile.filePath)}): ${error.message}`
        );
      }
    }
  }
} else {
  await postMessageWithWebhook(payload);
  if (designEvidenceFiles.length > 0) {
    console.warn(
      'Design mismatch screenshots were not uploaded to Slack. Add SLACK_BOT_TOKEN and SLACK_CHANNEL_ID to enable threaded screenshot uploads.'
    );
  }
}

console.log(`✅ Slack report sent — ${stats.passed}/${stats.totalScenarios} passed`);
