import fs from 'fs';
import { setWorldConstructor, World } from '@cucumber/cucumber';
import { chromium, firefox, webkit } from 'playwright';
import config from '../config/env.config.js';
import {
  clickFirstMatching,
  fillFirstMatching,
  firstMatchingLocator,
} from '../shared/locators/fallback-locator.js';

/**
 * Shared browser state — single browser instance for the entire test run.
 * Login happens once in BeforeAll; all scenarios reuse the same authenticated page.
 */
export const shared = {
  browser: null,
  context: null,
  page: null,
};

const heal = { logFallback: config.selfHeal.logFallbacks };

const signInButtonStrategies = [
  { name: 'button_has_text_sign_in', locator: (p) => p.locator('button:has-text("Sign in")') },
  {
    name: 'role_button_sign_in_google',
    locator: (p) => p.getByRole('button', { name: /sign in with google|google.*sign in/i }),
  },
  { name: 'role_button_sign_in', locator: (p) => p.getByRole('button', { name: /sign in/i }) },
];

const identifierNextStrategies = [
  { name: 'identifierNext', locator: (p) => p.locator('#identifierNext') },
  { name: 'identifierNext_button', locator: (p) => p.locator('#identifierNext button') },
  { name: 'next_button', locator: (p) => p.getByRole('button', { name: /^Next$/i }) },
];

const passwordFieldStrategies = [
  { name: 'input_passwd', locator: (p) => p.locator('input[name="Passwd"]') },
  { name: 'input_password', locator: (p) => p.locator('input[type="password"]') },
];

const passwordNextStrategies = [
  { name: 'passwordNext_button', locator: (p) => p.locator('#passwordNext button') },
  { name: 'passwordNext', locator: (p) => p.locator('#passwordNext') },
  { name: 'next_after_password', locator: (p) => p.getByRole('button', { name: /^Next$/i }) },
];

const oauthContinueStrategies = [
  { name: 'button_continue', locator: (p) => p.locator('button:has-text("Continue")') },
  { name: 'submit_continue', locator: (p) => p.locator('[type="submit"]:has-text("Continue")') },
];

/**
 * @param {{ useBundledChromium?: boolean }} [options]
 */
async function createSharedBrowserContextPage(options = {}) {
  const { useBundledChromium = false } = options;
  const browserType = { chromium, firefox, webkit }[config.browser.type] || chromium;
  const chromePath =
    process.env.CHROME_EXECUTABLE_PATH ||
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

  const launchOptions = {
    headless: config.browser.headless,
    slowMo: config.browser.headless ? 0 : 50,
    args: ['--no-first-run', '--no-default-browser-check'],
  };

  if (!useBundledChromium && config.browser.type === 'chromium' && fs.existsSync(chromePath)) {
    launchOptions.executablePath = chromePath;
  }

  shared.browser = await browserType.launch(launchOptions);
  shared.context = await shared.browser.newContext({
    viewport: { width: 1366, height: 768 },
    ignoreHTTPSErrors: true,
  });

  shared.context.setDefaultTimeout(config.timeouts.default);
  shared.context.setDefaultNavigationTimeout(config.timeouts.navigation);
  shared.page = await shared.context.newPage();
}

export async function launchAndLogin(product) {
  await createSharedBrowserContextPage();
  await performGoogleSSO(config.products[product].baseUrl);
}

export async function launchBrowserWithoutLogin() {
  await createSharedBrowserContextPage({ useBundledChromium: true });
}

async function performGoogleSSO(baseUrl) {
  const page = shared.page;
  const { username, password } = config.credentials;

  const loginUrl = `${baseUrl}/login`;
  const openLoginPage = async () => {
    await page.goto(loginUrl, { waitUntil: 'domcontentloaded' });
  };

  await openLoginPage();

  await clickFirstMatching(page, signInButtonStrategies, {
    context: 'SSO: Sign in',
    ...heal,
    perTryTimeouts: [15000, 10000, 8000],
    retryRecovery: openLoginPage,
  });

  await page.waitForURL(/accounts\.google\.com/, { timeout: 15000 });

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

  const emailStrategies = [
    { name: 'input_email', locator: (p) => p.locator('input[type="email"]') },
    { name: 'input_identifier', locator: (p) => p.locator('input[name="identifier"]') },
  ];
  try {
    const { locator: emailField } = await firstMatchingLocator(page, emailStrategies, {
      context: 'SSO: email field',
      ...heal,
      perTryTimeout: 5000,
    });
    await emailField.fill(username);
    await clickFirstMatching(page, identifierNextStrategies, {
      context: 'SSO: email Next',
      ...heal,
      perTryTimeout: 8000,
    });
    await Promise.race([
      page
        .locator('input[name="Passwd"], input[type="password"]')
        .first()
        .waitFor({ state: 'visible', timeout: 8000 })
        .catch(() => {}),
      page.waitForURL(/challenge\/pwd|signin\/v2\/challenge\/pwd/i, { timeout: 8000 }).catch(() => {}),
    ]);
  } catch {
    // Already past email entry.
  }

  await fillFirstMatching(page, passwordFieldStrategies, password, {
    context: 'SSO: password',
    ...heal,
    perTryTimeouts: [15000, 12000],
  });

  await clickFirstMatching(page, passwordNextStrategies, {
    context: 'SSO: password Next',
    ...heal,
    perTryTimeouts: [12000, 10000, 8000],
  });

  await page.waitForURL(/signin\/oauth/, { timeout: 15000 }).catch(() => {});
  await clickFirstMatching(page, oauthContinueStrategies, {
    context: 'SSO: OAuth Continue',
    ...heal,
    perTryTimeouts: [15000, 12000],
  });

  await page.waitForURL(
    (u) => u.hostname.endsWith('farmartos.com') && !u.pathname.includes('/login'),
    { timeout: 90000 }
  );
}

export async function closeSharedBrowser() {
  if (shared.page) await shared.page.close().catch(() => {});
  if (shared.context) await shared.context.close().catch(() => {});
  if (shared.browser) await shared.browser.close().catch(() => {});
  shared.browser = null;
  shared.context = null;
  shared.page = null;
}

class CustomWorld extends World {
  constructor(options) {
    super(options);
    this.scenarioData = {};
    this.currentProduct = null;
    this.designAuditContext = null;
  }

  get page() {
    return shared.page;
  }
}

setWorldConstructor(CustomWorld);
