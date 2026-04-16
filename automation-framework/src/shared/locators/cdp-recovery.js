/**
 * Optional runtime recovery: when all scripted locator strategies fail, derive
 * extra candidates from CDP Accessibility.getFullAXTree or Playwright accessibility snapshot.
 */

import fs from 'fs';
import path from 'path';
import config from '../../config/env.config.js';

/** @param {string} s */
function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const RECOVERY_ROLES = new Set([
  'button',
  'checkbox',
  'link',
  'menuitem',
  'radio',
  'searchbox',
  'tab',
  'textbox',
  'combobox',
  'switch',
]);

/**
 * @param {string} raw
 * @returns {string}
 */
function normalizeRole(raw) {
  if (!raw) return '';
  const s = String(raw).trim().toLowerCase().replace(/\s+/g, '');
  if (s === 'none' || s === 'generic' || s === 'ignored') return '';
  const map = {
    textbox: 'textbox',
    searchbox: 'searchbox',
    button: 'button',
    tab: 'tab',
    link: 'link',
  };
  return map[s] || (RECOVERY_ROLES.has(s) ? s : '');
}

/**
 * @typedef {{ role?: string, name?: string, ignored?: boolean }} AxLike
 */

/**
 * @param {AxLike[]} nodes
 * @param {string} contextHint
 * @returns {AxLike[]}
 */
function scoreAndPick(nodes, contextHint) {
  const hint = (contextHint || '').toLowerCase();
  const tokens = hint
    .split(/[^a-z0-9]+/i)
    .filter((t) => t.length > 1)
    .slice(0, 12);

  const scored = nodes
    .map((n) => {
      const role = normalizeRole(n.role);
      const name = (n.name && String(n.name).trim()) || '';
      if (!role || !name || n.ignored) return { n: null, score: -1 };
      let score = 0;
      const nl = name.toLowerCase();
      for (const t of tokens) {
        if (nl.includes(t)) score += 2;
      }
      if (hint.includes('search') && (role === 'searchbox' || role === 'textbox')) score += 2;
      if (hint.includes('tab') && role === 'tab') score += 2;
      return { n: { ...n, role, name }, score };
    })
    .filter((x) => x.n && x.score >= 0);

  scored.sort((a, b) => b.score - a.score);
  const max = config.runtimeCdpRecovery.maxExtraStrategies;
  return scored.slice(0, max).map((x) => x.n);
}

/**
 * @param {import('playwright').Page} page
 * @returns {Promise<AxLike[]>}
 */
async function fetchAxNodesFromCdp(page) {
  const session = await page.context().newCDPSession(page);
  await session.send('Accessibility.enable');
  const res = await session.send('Accessibility.getFullAXTree', {});
  const raw = res.nodes || [];
  return raw
    .filter((n) => n && !n.ignored && n.role && n.name)
    .map((n) => {
      const rl = n.role;
      const roleStr =
        typeof rl === 'string'
          ? rl
          : rl && typeof rl === 'object' && 'value' in rl && typeof rl.value === 'string'
            ? rl.value
            : '';
      const nm = n.name;
      const nameStr =
        typeof nm === 'string'
          ? nm
          : nm && typeof nm === 'object' && 'value' in nm && typeof nm.value === 'string'
            ? nm.value
            : '';
      return {
        role: roleStr,
        name: nameStr,
        ignored: !!n.ignored,
      };
    })
    .filter((n) => n.name);
}

/**
 * @param {Record<string, unknown> | null | undefined} node
 * @param {AxLike[]} out
 */
function flattenSnapshot(node, out) {
  if (!node) return;
  const role = typeof node.role === 'string' ? node.role : '';
  const name = node.name != null ? String(node.name) : '';
  if (role && name) {
    out.push({ role, name: String(name), ignored: false });
  }
  const children = node.children;
  if (Array.isArray(children)) {
    for (const c of children) flattenSnapshot(/** @type {Record<string, unknown>} */ (c), out);
  }
}

/**
 * @param {import('playwright').Page} page
 * @returns {Promise<AxLike[]>}
 */
async function fetchAxNodesFromPlaywrightSnapshot(page) {
  const snap = await page.accessibility.snapshot();
  const out = [];
  flattenSnapshot(snap, out);
  return out;
}

/**
 * @param {AxLike[]} picked
 */
function toStrategies(picked) {
  const seen = new Set();
  /** @type {Array<{ name?: string, locator: (page: import('playwright').Page) => import('playwright').Locator }>} */
  const strategies = [];

  for (let i = 0; i < picked.length; i++) {
    const { role, name } = picked[i];
    const pr = normalizeRole(role);
    if (!pr || !name) continue;
    const shortName = name.slice(0, 60);
    const key = `${pr}:${shortName}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const safeRe = escapeRe(shortName);
    const roleFinal = pr;
    const idx = i;
    strategies.push({
      name: `cdp_ax_${roleFinal}_${idx}`,
      locator: (p) => p.getByRole(roleFinal, { name: new RegExp(safeRe, 'i') }),
    });
  }
  return strategies;
}

/**
 * @param {import('playwright').Page} page
 * @param {string} contextHint
 */
export async function buildCdpRecoveryStrategies(page, contextHint) {
  if (!config.runtimeCdpRecovery?.enabled) return [];

  let nodes = [];
  try {
    nodes = await fetchAxNodesFromCdp(page);
  } catch {
    try {
      nodes = await fetchAxNodesFromPlaywrightSnapshot(page);
    } catch {
      return [];
    }
  }

  if (!nodes.length) return [];

  const picked = scoreAndPick(nodes, contextHint);
  const strategies = toStrategies(picked);

  if (config.runtimeCdpRecovery.writeDebugArtifact) {
    try {
      const dir = path.resolve(process.cwd(), config.reporting.reportDir);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const file = path.join(dir, 'cdp-recovery-context.json');
      fs.writeFileSync(
        file,
        JSON.stringify(
          {
            ts: new Date().toISOString(),
            contextHint,
            url: page.url(),
            nodeCount: nodes.length,
            pickedPreview: picked.slice(0, 20),
          },
          null,
          2
        ),
        'utf8'
      );
    } catch {
      /* ignore */
    }
  }

  return strategies;
}
