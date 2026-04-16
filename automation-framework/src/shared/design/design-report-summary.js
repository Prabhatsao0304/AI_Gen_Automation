function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function countBy(items = [], key) {
  return items.reduce((acc, item) => {
    const bucket = item?.[key];
    if (!bucket) return acc;
    acc[bucket] = (acc[bucket] || 0) + 1;
    return acc;
  }, {});
}

function countIssueTitles(findings = []) {
  return findings.reduce((acc, finding) => {
    const title = String(finding?.title || '').trim();
    if (!title) return acc;
    acc[title] = (acc[title] || 0) + 1;
    return acc;
  }, {});
}

function collectFindings(designReport = {}) {
  return safeArray(designReport?.scenarios).flatMap((scenario) => safeArray(scenario?.findings));
}

function collectScreenshotPaths(findings = []) {
  return [
    ...new Set(
      findings
        .map((finding) => finding?.evidence?.screenshot_path || finding?.report_context?.screenshot_path || '')
        .filter(Boolean)
    ),
  ];
}

export function computeReleaseRisk(summary = {}) {
  const bySeverity = summary?.by_severity || {};
  if ((bySeverity.critical || 0) > 0 || (bySeverity.high || 0) > 0) {
    return 'High';
  }
  if ((bySeverity.medium || 0) > 0 || (summary?.unmapped_components || 0) > 0) {
    return 'Medium';
  }
  return 'Low';
}

export function buildDesignSummary(designReport = {}) {
  const summary = designReport?.summary || {};
  const findings = collectFindings(designReport);
  const titleCounts = countIssueTitles(findings);
  const screenshotPaths = collectScreenshotPaths(findings);
  const byCategory = Object.keys(summary.by_category || {}).length > 0
    ? summary.by_category
    : countBy(findings, 'category');
  const bySeverity = Object.keys(summary.by_severity || {}).length > 0
    ? summary.by_severity
    : countBy(findings, 'severity');

  return {
    summary,
    findings,
    byCategory,
    bySeverity,
    releaseRisk: computeReleaseRisk({ ...summary, by_severity: bySeverity }),
    screenshotCount: screenshotPaths.length,
    screenshotPaths,
    tokenDrift: {
      spacing: titleCounts['Spacing values outside token scale'] || 0,
      radius: titleCounts['Border radius outside approved token scale'] || 0,
      typography: titleCounts['Base font family drift'] || 0,
    },
    accessibility: {
      unlabeledControls: titleCounts['Interactive controls without visible or accessible labels'] || 0,
      missingAlt: titleCounts['Visible images missing alt text'] || 0,
    },
    security: {
      linkProtections: titleCounts['External links missing rel protections'] || 0,
      secretExposure: titleCounts['Secret-like values visible in UI text'] || 0,
    },
  };
}

