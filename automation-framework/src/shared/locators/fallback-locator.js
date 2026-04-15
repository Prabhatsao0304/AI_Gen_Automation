/**
 * Deterministic self-heal: ordered locator strategies, scroll, wait state, one chain retry, drift log.
 * Integrates with selector-intelligence.js for reporting and optional cache reorder.
 */

import fs from 'fs';
import path from 'path';
import config from '../../config/env.config.js';
import { reorderStrategies, recordSelectorResolution } from './selector-intelligence.js';
import { buildCdpRecoveryStrategies } from './cdp-recovery.js';

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

  const originalPrimaryName = strategies[0]?.name || 'strategy_0';
  const { ordered, reorderedFromCache } = reorderStrategies(context, strategies);
  const baseLen = ordered.length;

  /**
   * @param {typeof ordered} list
   * @param {number} indexOffset global index of list[0] in the combined strategy list
   */
  const attemptChain = async (list, indexOffset = 0) => {
    let lastError;
    for (let i = 0; i < list.length; i++) {
      const globalIdx = indexOffset + i;
      const { name = `strategy_${globalIdx}`, locator } = list[i];
      const timeout = perTryTimeouts?.[globalIdx] ?? perTryTimeout;
      const loc = locator(page).first();

      try {
        if (scrollFirst) {
          await loc.scrollIntoViewIfNeeded({ timeout: Math.min(timeout, 8000) }).catch(() => {});
        }
        await loc.waitFor({ state: waitState, timeout });

        if (globalIdx > 0) {
          if (logFallback) {
            const tag = indexOffset >= baseLen ? '[cdp-recovery]' : '[self-heal]';
            console.warn(`${tag} ${context}: primary failed — using "${name}" (index ${globalIdx})`);
          }
          recordFallbackDrift(page, context, name, globalIdx);
        }

        const shouldIntelRecord = globalIdx > 0 || reorderedFromCache;
        if (shouldIntelRecord) {
          recordSelectorResolution({
            context,
            originalPrimaryStrategy: originalPrimaryName,
            resolvedStrategy: name,
            resolvedIndex: globalIdx,
            fallbackUsed: globalIdx > 0,
            reorderedFromCache,
            url: page.url(),
            continued: true,
          });
        }

        return { locator: loc, usedIndex: globalIdx, usedName: name };
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError ?? new Error(`[self-heal] ${context}: no locator strategy matched`);
  };

  const tryCdpRecovery = async (lastError) => {
    if (!config.runtimeCdpRecovery?.enabled) throw lastError;
    const extra = await buildCdpRecoveryStrategies(page, context);
    if (!extra.length) throw lastError;
    if (logFallback) {
      console.warn(`[cdp-recovery] ${context}: trying ${extra.length} AX-derived locator(s)`);
    }
    return await attemptChain(extra, baseLen);
  };

  try {
    return await attemptChain(ordered, 0);
  } catch (firstFailure) {
    if (retryRecovery) {
      await retryRecovery();
      try {
        return await attemptChain(ordered, 0);
      } catch (secondFailure) {
        return await tryCdpRecovery(secondFailure);
      }
    }
    return await tryCdpRecovery(firstFailure);
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
