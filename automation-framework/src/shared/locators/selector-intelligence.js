/**
 * Selector intelligence — learn preferred strategy names after fallbacks,
 * persist optional cache, and write structured reports for Slack / HTML.
 */

import fs from 'fs';
import path from 'path';
import config from '../../config/env.config.js';

const REPORT_NAME = 'selector-resolution-report.json';
const SUMMARY_NAME = 'selector-intelligence-summary.md';
const CACHE_NAME = 'selector-overrides.json';

export function getSelectorReportPath() {
  return path.resolve(process.cwd(), config.reporting.reportDir, REPORT_NAME);
}

export function getSelectorSummaryPath() {
  return path.resolve(process.cwd(), config.reporting.reportDir, SUMMARY_NAME);
}

function getCachePath() {
  return path.resolve(process.cwd(), 'config', CACHE_NAME);
}

function loadCache() {
  if (!config.selectorIntelligence?.cacheEnabled) return {};
  const p = getCachePath();
  if (!fs.existsSync(p)) return {};
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return {};
  }
}

function saveCache(cache) {
  if (!config.selectorIntelligence?.cacheEnabled) return;
  const p = getCachePath();
  const dir = path.dirname(p);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(p, JSON.stringify(cache, null, 2), 'utf8');
}

/**
 * Move cached preferred strategy to the front so the next run tries it first.
 * @param {string} context Stable key e.g. "PO: search input"
 */
export function reorderStrategies(context, strategies) {
  if (!strategies?.length || !config.selectorIntelligence?.cacheEnabled) {
    return { ordered: strategies, reorderedFromCache: false };
  }
  const cache = loadCache();
  const pref = cache[context]?.preferredStrategy;
  if (!pref) return { ordered: strategies, reorderedFromCache: false };

  const idx = strategies.findIndex((s) => (s.name || '') === pref);
  if (idx <= 0) return { ordered: strategies, reorderedFromCache: false };

  const copy = [...strategies];
  const [picked] = copy.splice(idx, 1);
  return { ordered: [picked, ...copy], reorderedFromCache: true };
}

/**
 * @param {{
 *   context: string,
 *   originalPrimaryStrategy: string,
 *   resolvedStrategy: string,
 *   resolvedIndex: number,
 *   fallbackUsed: boolean,
 *   reorderedFromCache: boolean,
 *   url: string,
 *   continued: boolean,
 * }} entry
 */
export function recordSelectorResolution(entry) {
  const resolved = String(entry.resolvedStrategy || '');
  const isCdpDerived = resolved.startsWith('cdp_ax_');
  if (entry.fallbackUsed && config.selectorIntelligence?.cacheEnabled && !isCdpDerived) {
    updateCachePreferred(entry.context, entry.resolvedStrategy);
  }

  if (!config.selectorIntelligence?.reportEnabled) return;
  if (!entry.fallbackUsed && !entry.reorderedFromCache) return;

  const reportPath = getSelectorReportPath();
  let list = [];
  if (fs.existsSync(reportPath)) {
    try {
      list = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
      if (!Array.isArray(list)) list = [];
    } catch {
      list = [];
    }
  }

  const row = {
    ts: new Date().toISOString(),
    context: entry.context,
    originalPrimaryStrategy: entry.originalPrimaryStrategy,
    resolvedStrategy: entry.resolvedStrategy,
    resolvedIndex: entry.resolvedIndex,
    fallbackUsed: entry.fallbackUsed,
    reorderedFromCache: entry.reorderedFromCache,
    cdpRecovery: isCdpDerived,
    url: entry.url,
    continued: entry.continued,
  };

  list.push(row);
  fs.writeFileSync(reportPath, JSON.stringify(list, null, 2), 'utf8');
}

function updateCachePreferred(context, strategyName) {
  const cache = loadCache();
  cache[context] = {
    preferredStrategy: strategyName,
    updatedAt: new Date().toISOString(),
  };
  saveCache(cache);
}

export function initSelectorIntelligence() {
  if (!config.selectorIntelligence?.reportEnabled) return;
  const reportPath = getSelectorReportPath();
  const dir = path.dirname(reportPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(reportPath, '[]', 'utf8');
}

/**
 * Markdown summary for humans + CI artifacts (written AfterAll).
 */
export function writeSelectorIntelligenceSummary() {
  if (!config.selectorIntelligence?.reportEnabled) return;
  const reportPath = getSelectorReportPath();
  if (!fs.existsSync(reportPath)) return;

  let list = [];
  try {
    list = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    if (!Array.isArray(list)) list = [];
  } catch {
    return;
  }

  const lines = [
    '# Selector intelligence summary',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    'Runtime automation uses ordered locator strategies. When the **primary** strategy fails but a **fallback** succeeds, the run continues and this report records what resolved.',
    '',
  ];

  if (list.length === 0) {
    lines.push('No fallback or cache-reorder events in this run (all primary selectors matched, or no resolution recorded).', '');
  } else {
    lines.push(
      `## Summary`,
      `- Total resolution events logged: **${list.length}**`,
      '',
      '## Detail',
      ''
    );
    for (const r of list) {
      lines.push(
        `### ${r.context}`,
        `- **Original primary (code order):** \`${r.originalPrimaryStrategy}\``,
        `- **Resolved with:** \`${r.resolvedStrategy}\` (index ${r.resolvedIndex})`,
        `- **Fallback used:** ${r.fallbackUsed ? 'yes' : 'no'} | **Cache reorder:** ${r.reorderedFromCache ? 'yes' : 'no'} | **CDP recovery:** ${r.cdpRecovery ? 'yes' : 'no'}`,
        `- **URL:** ${r.url}`,
        '',
      );
    }
  }

  lines.push(
    '---',
    '**Note:** This file is produced by **Playwright** at runtime.',
    ''
  );

  fs.writeFileSync(getSelectorSummaryPath(), lines.join('\n'), 'utf8');
}
