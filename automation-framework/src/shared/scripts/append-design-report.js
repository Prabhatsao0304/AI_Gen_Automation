import fs from 'fs';
import path from 'path';

const [, , htmlReportPath, designReportPath, suiteName = 'Automation'] = process.argv;

const START_MARKER = '<!-- CODEX_DESIGN_REPORT_START -->';
const END_MARKER = '<!-- CODEX_DESIGN_REPORT_END -->';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

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

function formatDictionary(values = {}) {
  const entries = Object.entries(values);
  if (entries.length === 0) {
    return '<span class="codex-design-report__muted">—</span>';
  }

  return entries
    .map(([key, count]) => `<span><strong>${escapeHtml(key)}</strong>: ${escapeHtml(count)}</span>`)
    .join('<span class="codex-design-report__dot">•</span>');
}

function formatNameList(names = [], emptyLabel = '—') {
  if (!Array.isArray(names) || names.length === 0) {
    return `<span class="codex-design-report__muted">${escapeHtml(emptyLabel)}</span>`;
  }

  return names.map((name) => `<span>${escapeHtml(name)}</span>`).join(', ');
}

function buildComponentRows(components = []) {
  if (components.length === 0) {
    return `
      <tr>
        <td colspan="5" class="codex-design-report__muted">No mapped components were observed on this screen.</td>
      </tr>
    `;
  }

  return components
    .map(
      (component) => `
        <tr>
          <td>${escapeHtml(component.display_name || component.component_name)}</td>
          <td>${escapeHtml(component.instance_count ?? component.instances_observed ?? 0)}</td>
          <td>${escapeHtml(component.match_status || 'Unknown')}</td>
          <td>${escapeHtml(
            typeof component.confidence_score === 'number'
              ? component.confidence_score.toFixed(2)
              : component.confidence_score || '—'
          )}</td>
          <td>${escapeHtml(component.storybook_status || 'unknown')}</td>
        </tr>
      `
    )
    .join('');
}

function summarizeComponents(components = []) {
  const merged = new Map();

  for (const component of components) {
    const key = component?.component_name;
    if (!key) {
      continue;
    }

    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, {
        ...component,
      });
      continue;
    }

    merged.set(key, {
      ...existing,
      display_name: existing.display_name || component.display_name,
      instance_count: Math.max(existing.instance_count || 0, component.instance_count || 0),
      instances_observed: Math.max(existing.instances_observed || 0, component.instances_observed || 0),
      match_status: existing.match_status || component.match_status,
      confidence_score:
        typeof existing.confidence_score === 'number'
          ? existing.confidence_score
          : component.confidence_score,
      storybook_status: existing.storybook_status || component.storybook_status,
      matching_central_component_library:
        existing.matching_central_component_library && component.matching_central_component_library,
      mismatching_central_component_library:
        existing.mismatching_central_component_library || component.mismatching_central_component_library,
      check_failures: [...new Set([...(existing.check_failures || []), ...(component.check_failures || [])])],
    });
  }

  return Array.from(merged.values()).sort((left, right) =>
    String(left.component_name).localeCompare(String(right.component_name))
  );
}

function buildReportSection(designReport, suiteName) {
  const summary = designReport?.summary || {};
  const components = summarizeComponents(
    designReport?.component_analysis ||
      (designReport?.scenarios || []).flatMap((scenario) => scenario.components || [])
  );

  return `
${START_MARKER}
<section id="codex-design-report" class="codex-design-report">
  <style>
    .codex-design-report {
      margin: 32px auto 48px;
      max-width: 1200px;
      padding: 24px;
      border-radius: 16px;
      border: 1px solid #d9e3f0;
      background: #f8fbff;
      color: #10243e;
      font-family: Arial, sans-serif;
      box-shadow: 0 8px 28px rgba(16, 36, 62, 0.08);
    }
    .codex-design-report h2,
    .codex-design-report h3 {
      margin: 0 0 16px;
    }
    .codex-design-report p {
      margin: 0 0 20px;
      color: #38506d;
      line-height: 1.5;
    }
    .codex-design-report__grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
      margin: 20px 0 28px;
    }
    .codex-design-report__card {
      background: #ffffff;
      border: 1px solid #d9e3f0;
      border-radius: 12px;
      padding: 16px;
    }
    .codex-design-report__label {
      display: block;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #5d7390;
      margin-bottom: 8px;
    }
    .codex-design-report__value {
      font-size: 28px;
      font-weight: 700;
      color: #10243e;
    }
    .codex-design-report__meta-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin: 0 0 24px;
      color: #38506d;
    }
    .codex-design-report__dot {
      color: #93a7bf;
    }
    .codex-design-report__table {
      width: 100%;
      min-width: 100%;
      border-collapse: collapse;
      background: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      margin-bottom: 24px;
    }
    .codex-design-report__table th,
    .codex-design-report__table td {
      padding: 12px 14px;
      border-bottom: 1px solid #e4edf6;
      text-align: left;
      font-size: 14px;
    }
    .codex-design-report__table th {
      background: #eef5fc;
      color: #254666;
    }
    .codex-design-report__muted {
      color: #6c819b;
    }
  </style>
  <h2>Design Report</h2>
  <p>Separate from the functional test result for <strong>${escapeHtml(suiteName)}</strong>. Design mismatches are reported here without failing the automation run.</p>
  <div class="codex-design-report__grid">
    <div class="codex-design-report__card">
      <span class="codex-design-report__label">No. of Components Used (Rendered Instances)</span>
      <div class="codex-design-report__value">${escapeHtml(summary.components_used ?? 0)}</div>
    </div>
    <div class="codex-design-report__card">
      <span class="codex-design-report__label">No. of Components in CCLDS</span>
      <div class="codex-design-report__value">${escapeHtml(summary.cclds_component_count ?? 0)}</div>
    </div>
    <div class="codex-design-report__card">
      <span class="codex-design-report__label">Matching Central Component Library</span>
      <div class="codex-design-report__value">${escapeHtml(summary.matching_central_component_library ?? 0)}</div>
    </div>
    <div class="codex-design-report__card">
      <span class="codex-design-report__label">Mismatching Central Component Library</span>
      <div class="codex-design-report__value">${escapeHtml(summary.mismatching_central_component_library ?? 0)}</div>
    </div>
    <div class="codex-design-report__card">
      <span class="codex-design-report__label">Run Time</span>
      <div class="codex-design-report__value">${escapeHtml(summary.runtime_sec ?? 0)}s</div>
    </div>
  </div>
  <div class="codex-design-report__meta-row">
    <span><strong>Component types detected</strong>: ${escapeHtml(summary.component_types_detected ?? 0)}</span>
    <span class="codex-design-report__dot">•</span>
    <span><strong>Variant components</strong>: ${escapeHtml(summary.variant_components ?? 0)}</span>
    <span class="codex-design-report__dot">•</span>
    <span><strong>Missing expected components</strong>: ${escapeHtml(summary.missing_expected_components ?? 0)}</span>
    <span class="codex-design-report__dot">•</span>
    <span><strong>Unmapped components</strong>: ${escapeHtml(summary.unmapped_components ?? 0)}</span>
  </div>
  <div class="codex-design-report__meta-row">
    <span><strong>Matching component names</strong>: ${formatNameList(summary.matching_component_names || [], 'No matching components')}</span>
  </div>
  <div class="codex-design-report__meta-row">
    <span><strong>Mismatching component names</strong>: ${formatNameList(summary.mismatching_component_names || [], 'No mismatching components')}</span>
  </div>
  <div class="codex-design-report__meta-row">
    ${formatDictionary(summary.by_category || {})}
  </div>
  <div class="codex-design-report__meta-row">
    ${formatDictionary(summary.by_severity || {})}
  </div>
  <h3>Observed Components</h3>
  <table class="codex-design-report__table">
    <thead>
      <tr>
        <th>Component</th>
        <th>Instance Count</th>
        <th>Match Status</th>
        <th>Confidence</th>
        <th>Central Library Status</th>
      </tr>
    </thead>
    <tbody>
      ${buildComponentRows(components)}
    </tbody>
  </table>
</section>
${END_MARKER}
`;
}

function appendDesignReport(htmlReportPath, designReportPath, suiteName) {
  if (!htmlReportPath || !designReportPath) {
    return false;
  }

  if (!fs.existsSync(htmlReportPath)) {
    return false;
  }

  const designReport = readJson(designReportPath);
  if (!designReport?.summary) {
    return false;
  }

  let html = fs.readFileSync(htmlReportPath, 'utf8');
  const existingPattern = new RegExp(
    `${START_MARKER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?${END_MARKER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`,
    'g'
  );
  html = html.replace(existingPattern, '');

  const section = buildReportSection(designReport, suiteName);
  if (html.includes('</body>')) {
    html = html.replace('</body>', `${section}\n</body>`);
  } else {
    html = `${html}\n${section}`;
  }

  fs.writeFileSync(htmlReportPath, html);
  return true;
}

const updated = appendDesignReport(htmlReportPath, designReportPath, suiteName);
if (updated) {
  console.log(`Design report appended to ${htmlReportPath}`);
}
