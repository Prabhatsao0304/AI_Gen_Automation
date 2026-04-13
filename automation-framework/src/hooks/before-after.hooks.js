import { BeforeAll, AfterAll, Before, After, AfterStep, Status, setDefaultTimeout } from '@cucumber/cucumber';
import fs from 'fs';
import path from 'path';
import config from '../config/env.config.js';
import { launchAndLogin, closeSharedBrowser } from './world.js';

setDefaultTimeout(120 * 1000);

const screenshotDir = path.resolve(config.reporting.screenshotDir);
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

/**
 * Runs ONCE before all scenarios.
 * Launches Chrome and logs in via Google SSO — one login for the entire run.
 */
BeforeAll(async function () {
  console.log('\n  [setup] Launching browser and logging in (once for all scenarios)...');
  await launchAndLogin('fmt-os');
  console.log('  [setup] Login complete — all scenarios will reuse this session.\n');
});

/**
 * Runs ONCE after all scenarios — closes the shared browser.
 */
AfterAll(async function () {
  await closeSharedBrowser();
});

/**
 * Runs before every scenario.
 * Browser is already open and logged in — just set the product tag.
 */
Before(async function (scenario) {
  this.scenarioData = {};

  const tags = scenario.pickle.tags.map((t) => t.name);
  if (tags.includes('@fmt-os')) {
    this.currentProduct = 'fmt-os';
  } else if (tags.includes('@fmt-pro')) {
    this.currentProduct = 'fmt-pro';
  }
});

/**
 * Runs after every scenario.
 * On failure: saves a screenshot and attaches it to the HTML report.
 */
After(async function (scenario) {
  if (scenario.result?.status === Status.FAILED && this.page) {
    const scenarioName = scenario.pickle.name
      .replace(/[^a-zA-Z0-9]/g, '_')
      .toLowerCase()
      .slice(0, 80);
    const screenshotPath = path.join(screenshotDir, `${scenarioName}_${Date.now()}.png`);

    try {
      const screenshot = await this.page.screenshot({ path: screenshotPath, fullPage: true });
      await this.attach(screenshot, 'image/png');
    } catch {
      // Page may already be closed
    }
  }
});

/**
 * Runs after every individual step.
 * On failure: attaches a viewport screenshot for quick visual debugging.
 */
AfterStep(async function ({ result }) {
  if (result?.status === Status.FAILED && this.page) {
    try {
      const screenshot = await this.page.screenshot({ fullPage: false });
      await this.attach(screenshot, 'image/png');
    } catch {
      // Ignore
    }
  }
});
