/**
 * Wait utilities — thin wrappers around Playwright waits for consistent timeouts.
 */

/** @param {import('playwright').Page} page @param {string} selector @param {number} [timeout] */
export async function waitForVisible(page, selector, timeout = 10000) {
  await page.waitForSelector(selector, { state: 'visible', timeout });
}

/** @param {import('playwright').Page} page @param {number} [timeout] */
export async function waitForNetworkIdle(page, timeout = 30000) {
  await page.waitForLoadState('networkidle', { timeout });
}

/**
 * Retries an async function up to maxAttempts times before throwing.
 * @param {() => Promise<*>} fn
 * @param {number} [maxAttempts=3]
 * @param {number} [delayMs=1000]
 */
export async function retry(fn, maxAttempts = 3, delayMs = 1000) {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
  throw lastError;
}
