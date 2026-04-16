import { setWorldConstructor, World } from '@cucumber/cucumber';
import { chromium, firefox, webkit } from 'playwright';
import fs from 'fs';
import path from 'path';
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

  shared.browser = await launchBrowserWithFallback(browserType);

  shared.context = await shared.browser.newContext({
    viewport: { width: 1366, height: 768 },
    ignoreHTTPSErrors: true,
  });

  shared.context.setDefaultTimeout(config.timeouts.default);
  shared.context.setDefaultNavigationTimeout(config.timeouts.navigation);
  shared.page = await shared.context.newPage();

  await performGoogleSSO(config.products[product].baseUrl, config.credentials[product]);
}

async function launchBrowserWithFallback(browserType) {
  const commonOptions = {
    headless: config.browser.headless,
    slowMo: config.browser.slowMoMs,
    args: [
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-blink-features=AutomationControlled',
    ],
  };

  const candidates = [];
  if (config.browser.executablePath) {
    candidates.push({ ...commonOptions, executablePath: config.browser.executablePath });
  } else {
    candidates.push({
      ...commonOptions,
      executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    });
  }

  // Fallback for environments where system Chrome cannot be launched (e.g. restricted sandbox).
  candidates.push(commonOptions);

  // Last-resort fallback with isolated writable HOME for crashpad/profile writes.
  const isolatedHome = path.resolve(process.cwd(), '.browser-home');
  fs.mkdirSync(isolatedHome, { recursive: true });
  candidates.push({
    ...commonOptions,
    env: {
      ...process.env,
      HOME: isolatedHome,
    },
  });

  let lastError = null;
  for (const options of candidates) {
    try {
      return await browserType.launch(options);
    } catch (error) {
      lastError = error;
      const launchTarget = options.executablePath || 'playwright-bundled-browser';
      console.warn(`[setup] Browser launch failed for ${launchTarget}. Trying fallback...`);
    }
  }

  throw lastError;
}

async function performGoogleSSO(baseUrl, credentials) {
  const page = shared.page;
  const { username, password } = credentials;
  const loginUrl = buildLoginUrl(baseUrl);

  await page.goto(loginUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 2500 }).catch(() => {});

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
    await page.waitForTimeout(400);
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

  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
}

function buildLoginUrl(baseUrl) {
  const parsed = new URL(baseUrl);

  if (parsed.pathname.endsWith('/login')) {
    return parsed.toString();
  }

  if (!parsed.pathname.endsWith('/')) {
    parsed.pathname = `${parsed.pathname}/`;
  }

  return new URL('login', parsed).toString();
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
