import { setWorldConstructor, World } from '@cucumber/cucumber';
import { chromium, firefox, webkit } from 'playwright';
import config from '../config/env.config.js';

/**
 * Shared browser state — single browser instance for the entire test run.
 * Login happens once in BeforeAll; all scenarios reuse the same authenticated page.
 */
export const shared = {
  browser: null,
  context: null,
  page: null,
};

/**
 * Launches Chrome and completes Google SSO login.
 * Called once before all scenarios via BeforeAll hook.
 */
export async function launchAndLogin(product) {
  const browserType = { chromium, firefox, webkit }[config.browser.type] || chromium;

  shared.browser = await browserType.launch({
    headless: config.browser.headless,
    slowMo: config.browser.headless ? 0 : 50,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: [
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-blink-features=AutomationControlled',
    ],
  });

  shared.context = await shared.browser.newContext({
    viewport: { width: 1366, height: 768 },
    ignoreHTTPSErrors: true,
  });

  shared.context.setDefaultTimeout(config.timeouts.default);
  shared.context.setDefaultNavigationTimeout(config.timeouts.navigation);
  shared.page = await shared.context.newPage();

  await performGoogleSSO(config.products[product].baseUrl);
}

async function performGoogleSSO(baseUrl) {
  const page = shared.page;
  const { username, password } = config.credentials;

  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

  await page.waitForSelector('button:has-text("Sign in")', { timeout: 15000 });
  await page.click('button:has-text("Sign in")');

  await page.waitForURL(/accounts\.google\.com/, { timeout: 15000 });

  // Handle account chooser if present
  const url = page.url();
  if (url.includes('accountchooser') || url.includes('ServiceLogin')) {
    const existing = page.locator(`[data-email="${username}"], [data-identifier="${username}"]`).first();
    if (await existing.isVisible({ timeout: 3000 }).catch(() => false)) {
      await existing.click();
    } else {
      const useAnother = page.locator('button:has-text("Use another account"), #identifierLink').first();
      if (await useAnother.isVisible({ timeout: 3000 }).catch(() => false)) {
        await useAnother.click();
      }
    }
  }

  // Enter email
  const emailInput = page.locator('input[type="email"]');
  if (await emailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
    await emailInput.fill(username);
    await page.locator('#identifierNext, button:has-text("Next")').first().click();
    await page.waitForTimeout(1500);
  }

  // Enter password
  await page.waitForSelector('input[name="Passwd"], input[type="password"]', { timeout: 15000 });
  await page.fill('input[name="Passwd"], input[type="password"]', password);
  await page.locator('#passwordNext button, #passwordNext, button:has-text("Next")').first().click();

  // Click Continue on OAuth consent screen
  await page.waitForURL(/signin\/oauth/, { timeout: 15000 }).catch(() => {});
  await page.waitForSelector('button:has-text("Continue")', { timeout: 15000 });
  await page.click('button:has-text("Continue")');

  // Wait for app — use hostname check to avoid false match on Google redirect URLs
  await page.waitForURL(
    (url) => url.hostname.endsWith('farmartos.com') && !url.pathname.includes('/login'),
    { timeout: 90000 }
  );

  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
}

export async function closeSharedBrowser() {
  if (shared.page) await shared.page.close().catch(() => {});
  if (shared.context) await shared.context.close().catch(() => {});
  if (shared.browser) await shared.browser.close().catch(() => {});
  shared.browser = null;
  shared.context = null;
  shared.page = null;
}

/**
 * CustomWorld — provides shared browser page to every step definition via `this.page`.
 */
class CustomWorld extends World {
  constructor(options) {
    super(options);
  }

  get page() { return shared.page; }
  get browser() { return shared.browser; }
  get context() { return shared.context; }
}

setWorldConstructor(CustomWorld);
