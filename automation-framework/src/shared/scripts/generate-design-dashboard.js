import fs from 'fs';
import path from 'path';
import { buildDesignSummary } from '../design/design-report-summary.js';

const [, , functionalReportPath, designReportPath, dashboardPath, suiteName = 'Automation'] = process.argv;

function readJson(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function percentage(numerator, denominator) {
  if (!denominator) {
    return 0;
  }

  return Math.round((Number(numerator || 0) / Number(denominator || 0)) * 100);
}

function parseFunctionalStats(features) {
  if (!Array.isArray(features)) {
    return {
      totalScenarios: 0,
      passed: 0,
      passRate: 0,
    };
  }

  let totalScenarios = 0;
  let passed = 0;

  for (const feature of features) {
    for (const scenario of feature.elements || []) {
      totalScenarios += 1;
      const failedStep = (scenario.steps || []).some((step) => step.result?.status === 'failed');
      if (!failedStep) {
        passed += 1;
      }
    }
  }

  return {
    totalScenarios,
    passed,
    passRate: totalScenarios > 0 ? Math.round((passed / totalScenarios) * 100) : 0,
  };
}

function buildMetricCards(functionalReport, designReport) {
  const designSummary = buildDesignSummary(designReport);
  const summary = designSummary.summary || {};
  const auditSummary = designReport?.audit_summary || {};
  const functionalStats = parseFunctionalStats(functionalReport);

  return [
    {
      label: 'Design Score',
      value: auditSummary.design_score ?? 0,
      detail: 'Token adherence, component consistency, and hierarchy',
    },
    {
      label: 'Accessibility Score',
      value: auditSummary.accessibility_score ?? 0,
      detail: 'Labels, alt text, and safe linking coverage',
    },
    {
      label: 'Component Match',
      value: `${percentage(summary.matching_central_component_library, summary.components_used)}%`,
      detail: 'Matching rendered instances / total rendered instances',
    },
    {
      label: 'Unmapped Component Count',
      value: summary.unmapped_components ?? 0,
      detail: 'Rendered UI found outside CCL mapping',
    },
    {
      label: 'Variant Mismatch Count',
      value: summary.variant_components ?? 0,
      detail: 'Inconsistent component signatures on screen',
    },
    {
      label: 'Functional Pass Rate',
      value: `${functionalStats.passRate}%`,
      detail: `${functionalStats.passed}/${functionalStats.totalScenarios} scenarios passed`,
    },
  ];
}

function buildAuditSnapshot(functionalReport, designReport) {
  const designSummary = buildDesignSummary(designReport);
  const summary = designSummary.summary || {};
  const functionalStats = parseFunctionalStats(functionalReport);

  return [
    ['No. of Components Used', summary.components_used ?? 0],
    ['CCL', summary.ccl_component_count ?? 0],
    ['Matching', summary.matching_central_component_library ?? 0],
    ['Mismatching', summary.mismatching_central_component_library ?? 0],
    ['Run Time', `${summary.runtime_sec ?? 0}s`],
    ['Total Findings', summary.total_findings ?? 0],
    ['Audited Scenarios', summary.scenarios_audited ?? functionalStats.totalScenarios ?? 0],
    ['Release Risk', designSummary.releaseRisk],
    ['Evidence Screenshots', designSummary.screenshotCount],
  ];
}

function renderPills(items = [], emptyLabel = '—') {
  if (!Array.isArray(items) || items.length === 0) {
    return `<span class="pill pill--muted">${escapeHtml(emptyLabel)}</span>`;
  }

  return items.map((item) => `<span class="pill">${escapeHtml(item)}</span>`).join('');
}

function buildScoreImprovementChecklist() {
  return [
    'Fix typography drift by restoring the approved CCL base font across tabs, inputs, buttons, and table text.',
    'Align spacing, padding, gap, and margin values to the 4px token grid and remove hardcoded spacing overrides.',
    'Bring border radius back to approved token values and remove non-standard rounded styles.',
    'Map or replace unmapped components like MenuButton with approved CCL components.',
    'Add visible or accessible labels to interactive controls such as icon buttons, menu triggers, and inputs.',
    'Fix root component issues once so repeated findings disappear across multiple scenarios in the same screen.',
  ];
}

function buildDashboardHtml(functionalReport, designReport, suiteLabel) {
  const cards = buildMetricCards(functionalReport, designReport);
  const designSummary = buildDesignSummary(designReport);
  const summary = designSummary.summary || {};
  const snapshot = buildAuditSnapshot(functionalReport, designReport);
  const checklist = buildScoreImprovementChecklist();
  const generatedAt = designReport?.generated_at || new Date().toISOString();

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(suiteLabel)} Design Metrics Dashboard</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f5f8fc;
      --card: #ffffff;
      --line: #d9e3f0;
      --text: #10243e;
      --muted: #5d7390;
      --shadow: 0 10px 30px rgba(16, 36, 62, 0.08);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Arial, sans-serif;
      background: linear-gradient(180deg, #f8fbff 0%, var(--bg) 100%);
      color: var(--text);
    }
    .page {
      max-width: 1320px;
      margin: 0 auto;
      padding: 28px;
    }
    .hero, .card, .section {
      background: var(--card);
      border: 1px solid var(--line);
      border-radius: 18px;
      box-shadow: var(--shadow);
    }
    .hero {
      padding: 28px;
      margin-bottom: 18px;
    }
    .hero h1 {
      margin: 0 0 10px;
      font-size: 34px;
    }
    .hero p {
      margin: 0;
      color: var(--muted);
      line-height: 1.6;
      max-width: 860px;
    }
    .meta {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 14px;
    }
    .pill {
      padding: 7px 12px;
      border-radius: 999px;
      background: #eef5fc;
      color: #254666;
      font-size: 13px;
    }
    .pill--muted {
      background: #f3f6fa;
      color: var(--muted);
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 16px;
    }
    .section {
      padding: 22px;
      margin-top: 18px;
    }
    .section h2 {
      margin: 0 0 14px;
      font-size: 24px;
    }
    .snapshot-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px 24px;
      margin-bottom: 18px;
    }
    .snapshot-item {
      padding: 12px 0;
      border-bottom: 1px solid #edf2f8;
    }
    .snapshot-label {
      display: block;
      color: var(--muted);
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 4px;
    }
    .snapshot-value {
      font-size: 28px;
      font-weight: 700;
      color: var(--text);
    }
    .name-group + .name-group {
      margin-top: 18px;
    }
    .name-group h3 {
      margin: 0 0 10px;
      font-size: 17px;
    }
    .pill-wrap {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .checklist {
      margin: 0;
      padding-left: 20px;
      color: var(--muted);
      line-height: 1.7;
      font-size: 15px;
    }
    .checklist li + li {
      margin-top: 8px;
    }
    .card {
      padding: 18px;
    }
    .label {
      display: block;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--muted);
      margin-bottom: 10px;
    }
    .value {
      font-size: 34px;
      font-weight: 700;
      margin-bottom: 8px;
    }
    .detail {
      color: var(--muted);
      line-height: 1.5;
      font-size: 14px;
    }
    .details {
      border: 1px solid #e4edf6;
      border-radius: 14px;
      background: #fbfdff;
      padding: 14px 16px;
    }
    .details summary {
      cursor: pointer;
      font-weight: 700;
      color: var(--text);
      list-style: none;
    }
    .details summary::-webkit-details-marker {
      display: none;
    }
    .details summary::after {
      content: 'Show';
      float: right;
      font-weight: 600;
      font-size: 13px;
      color: var(--muted);
    }
    .details[open] summary::after {
      content: 'Hide';
    }
    .details-body {
      margin-top: 16px;
    }
    .table-wrap {
      overflow: auto;
      border: 1px solid #edf2f8;
      border-radius: 12px;
      background: #fff;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      min-width: 760px;
    }
    th, td {
      padding: 12px 14px;
      text-align: left;
      border-bottom: 1px solid #edf2f8;
      vertical-align: top;
      font-size: 14px;
    }
    th {
      background: #f6faff;
      color: #294b6f;
      position: sticky;
      top: 0;
    }
    .details-list {
      margin: 0;
      padding-left: 22px;
      color: var(--muted);
      line-height: 1.75;
      font-size: 16px;
    }
    .details-list li + li {
      margin-top: 10px;
    }
    .muted-text {
      color: var(--muted);
    }
    @media (max-width: 1100px) {
      .grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
    @media (max-width: 700px) {
      .grid {
        grid-template-columns: 1fr;
      }
      .snapshot-grid {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <div class="page">
    <section class="hero">
      <h1>${escapeHtml(suiteLabel)} Design Metrics Dashboard</h1>
      <p>Metrics-only dashboard for design, development, and testing review. This view intentionally replaces the older issue tables and evidence sections with the key system metrics used to judge UI health.</p>
      <div class="meta">
        <span class="pill">Generated: ${escapeHtml(generatedAt)}</span>
        <span class="pill">Mode: Non-blocking design audit</span>
        <span class="pill">Source: CCL</span>
      </div>
    </section>

    <section class="grid">
      ${cards
        .map(
          (card) => `
            <article class="card">
              <span class="label">${escapeHtml(card.label)}</span>
              <div class="value">${escapeHtml(card.value)}</div>
              <div class="detail">${escapeHtml(card.detail)}</div>
            </article>
          `
        )
        .join('')}
    </section>

    <section class="section">
      <h2>Audit Snapshot</h2>
      <div class="snapshot-grid">
        ${snapshot
          .map(
            ([label, value]) => `
              <div class="snapshot-item">
                <span class="snapshot-label">${escapeHtml(label)}</span>
                <div class="snapshot-value">${escapeHtml(value)}</div>
              </div>
            `
          )
          .join('')}
      </div>

      <div class="name-group">
        <h3>Matching component names</h3>
        <div class="pill-wrap">${renderPills(summary.matching_component_names || [], 'No matching components')}</div>
      </div>

      <div class="name-group">
        <h3>Mismatching component names</h3>
        <div class="pill-wrap">${renderPills(summary.mismatching_component_names || [], 'No mismatching components')}</div>
      </div>
    </section>

    <section class="section">
      <details class="details">
        <summary>Issues</summary>
        <div class="details-body table-wrap">
          <table>
            <thead>
              <tr>
                <th>Severity</th>
                <th>Title</th>
                <th>Component</th>
                <th>Screen</th>
                <th>Impact</th>
                <th>Fix Suggestion</th>
              </tr>
            </thead>
            <tbody>
              ${(designReport?.issues || [])
                .map(
                  (issue) => `
                    <tr>
                      <td>${escapeHtml(issue.severity)}</td>
                      <td>${escapeHtml(issue.title)}</td>
                      <td>${escapeHtml(issue.component)}</td>
                      <td>${escapeHtml(issue.screen)}</td>
                      <td>${escapeHtml(issue.impact)}</td>
                      <td>${escapeHtml(issue.fix_suggestion)}</td>
                    </tr>
                  `
                )
                .join('') || '<tr><td colspan="6" class="muted-text">No design issues found.</td></tr>'}
            </tbody>
          </table>
        </div>
      </details>
    </section>

    <section class="section">
      <details class="details">
        <summary>Design System Gaps</summary>
        <div class="details-body">
          <ul class="details-list">
            ${(designReport?.design_system_gaps || [])
              .map(
                (gap) => `
                  <li><strong>${escapeHtml(gap.gap || gap.type || 'Gap')}</strong>: ${escapeHtml(gap.recommendation || gap.description || '')}</li>
                `
              )
              .join('') || '<li>No design system gaps recorded.</li>'}
          </ul>
        </div>
      </details>
    </section>
    <section class="section">
      <h2>Score Improvement Checklist</h2>
      <ol class="checklist">
        ${checklist.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
      </ol>
    </section>
  </div>
</body>
</html>`;
}

function generateDashboard(functionalPath, designPath, outputPath, suiteLabel) {
  const functionalReport = readJson(functionalPath);
  const designReport = readJson(designPath);
  if (!designReport) {
    return false;
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, buildDashboardHtml(functionalReport, designReport, suiteLabel));
  return true;
}

const success = generateDashboard(functionalReportPath, designReportPath, dashboardPath, suiteName);
if (success) {
  console.log(`Design dashboard generated at ${dashboardPath}`);
}
