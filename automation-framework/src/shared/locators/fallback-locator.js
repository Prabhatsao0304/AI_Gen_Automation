/**
 * Deterministic self-heal: ordered locator strategies, scroll, wait state, one chain retry, drift log.
 */

import fs from 'fs';
import path from 'path';
import config from '../../config/env.config.js';

/**
 * @typedef {{ name?: string, locator: (page: import('playwright').Page) => import('playwright').Locator }} LocatorStrategy
 */

export function getSelfHealDriftLogPath() {
  return path.resolve(process.cwd(), config.reporting.reportDir, 'self-heal-events.jsonl');
}

/** Truncate drift log at the start of each test run so Slack counts only this run. */
export function truncateSelfHealDriftLog() {
  const filePath = getSelfHealDriftLogPath();
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, '', 'utf8');
}

/**
 * @param {import('playwright').Page} page
 * @param {string} context
 * @param {string} usedName
 * @param {number} usedIndex
 */
function recordFallbackDrift(page, context, usedName, usedIndex) {
  if (!config.selfHeal.driftLogEnabled || usedIndex === 0) return;
  const line = `${JSON.stringify({
    ts: new Date().toISOString(),
    context,
    strategy: usedName,
    strategyIndex: usedIndex,
    url: page.url(),
  })}\n`;
  try {
    fs.appendFileSync(getSelfHealDriftLogPath(), line, 'utf8');
  } catch {
    // ignore disk errors
  }
}

/**
 * @param {import('playwright').Page} page
 * @param {LocatorStrategy[]} strategies
 * @param {{
 *   context?: string,
 *   logFallback?: boolean,
 *   perTryTimeout?: number,
 *   perTryTimeouts?: number[],
 *   waitState?: 'visible' | 'attached',
 *   scrollFirst?: boolean,
 *   retryRecovery?: () => Promise<void>,
 * }} [options]
 */
export async function firstMatchingLocator(page, strategies, options = {}) {
  const {
    context = 'element',
    logFallback = false,
    perTryTimeout = 4000,
    perTryTimeouts,
    waitState = 'visible',
    scrollFirst = true,
    retryRecovery,
  } = options;

  if (!strategies?.length) {
    throw new Error(`[self-heal] ${context}: no strategies provided`);
  }

  const attemptChain = async () => {
    let lastError;
    for (let i = 0; i < strategies.length; i++) {
      const { name = `strategy_${i}`, locator } = strategies[i];
      const timeout = perTryTimeouts?.[i] ?? perTryTimeout;
      const loc = locator(page).first();

      try {
        if (scrollFirst) {
          await loc.scrollIntoViewIfNeeded({ timeout: Math.min(timeout, 8000) }).catch(() => {});
        }
        await loc.waitFor({ state: waitState, timeout });

        if (i > 0) {
          if (logFallback) {
            console.warn(
              `[self-heal] ${context}: primary failed — using fallback "${name}" (${i}/${strategies.length - 1})`
            );
          }
          recordFallbackDrift(page, context, name, i);
        }
        return { locator: loc, usedIndex: i, usedName: name };
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError ?? new Error(`[self-heal] ${context}: no locator strategy matched`);
  };

  try {
    return await attemptChain();
  } catch (firstFailure) {
    if (!retryRecovery) throw firstFailure;
    await retryRecovery();
    return await attemptChain();
  }
}

/**
 * @param {import('playwright').Page} page
 * @param {LocatorStrategy[]} strategies
 * @param {string} value
 * @param {Parameters<typeof firstMatchingLocator>[2]} [options]
 */
export async function fillFirstMatching(page, strategies, value, options) {
  const { locator } = await firstMatchingLocator(page, strategies, options);
  await locator.fill(value);
}

/**
 * @param {import('playwright').Page} page
 * @param {LocatorStrategy[]} strategies
 * @param {Parameters<typeof firstMatchingLocator>[2]} [options]
 */
export async function clickFirstMatching(page, strategies, options) {
  const { locator } = await firstMatchingLocator(page, strategies, options);
  await locator.click();
}

/** @param {string} s */
export function escapeForRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
