import fs from 'fs';
import path from 'path';
import {
  After,
  AfterAll,
  AfterStep,
  Before,
  BeforeAll,
  setDefaultTimeout,
  Status,
} from '@cucumber/cucumber';
import {
  getSelfHealDriftLogPath,
  truncateSelfHealDriftLog,
} from '../shared/locators/fallback-locator.js';
import {
  getSelectorSummaryPath,
  initSelectorIntelligence,
  writeSelectorIntelligenceSummary,
} from '../shared/locators/selector-intelligence.js';
import { captureScreenshot } from '../shared/utils/screenshot.utils.js';
import {
  finalizeDesignAuditScenario,
  maybeAuditVisibleScreen,
  resetDesignAuditRun,
  startDesignAuditScenario,
  writeDesignAuditReport,
} from '../shared/design/design-audit.engine.js';
import { closeSharedBrowser, launchAndLogin } from './world.js';

setDefaultTimeout(120 * 1000);

const screenshotDir = path.resolve(process.cwd(), 'screenshots');

BeforeAll(async function () {
  truncateSelfHealDriftLog();
  initSelectorIntelligence();
  resetDesignAuditRun();
  console.log('\n  [setup] Launching browser and logging in (once for all scenarios)...');
  await launchAndLogin('fmt-os');
  console.log('  [setup] Login complete — all scenarios will reuse this session.\n');
});

AfterAll(async function () {
  writeSelectorIntelligenceSummary();
  writeDesignAuditReport();
  await closeSharedBrowser();
});

Before(async function (scenario) {
  this.scenarioData = {};
  this.designAuditContext = null;

  const tags = scenario.pickle.tags.map((tag) => tag.name);
  if (tags.includes('@fmt-os')) {
    this.currentProduct = 'fmt-os';
  } else if (tags.includes('@fmt-pro')) {
    this.currentProduct = 'fmt-pro';
  }

  this.designAuditContext = startDesignAuditScenario({
    scenarioName: scenario.pickle.name,
    featureUri: scenario.pickle.uri,
    product: this.currentProduct,
    tags,
  });
});

After(async function (scenario) {
  await maybeAuditVisibleScreen({
    page: this.page,
    scenarioContext: this.designAuditContext,
  });

  finalizeDesignAuditScenario({
    scenarioContext: this.designAuditContext,
    functionalStatus: scenario.result?.status || 'UNKNOWN',
  });

  if (scenario.result?.status === Status.FAILED && this.page) {
    const scenarioName = scenario.pickle.name
      .replace(/[^a-zA-Z0-9]/g, '_')
      .toLowerCase()
      .slice(0, 80);
    const screenshotPath = path.join(screenshotDir, `${scenarioName}_${Date.now()}.png`);

    try {
      const screenshot = await captureScreenshot(this.page, {
        path: screenshotPath,
        fullPage: true,
      });
      await this.attach(screenshot, 'image/png');
    } catch {
      // Page may already be closed.
    }
  }

  if (scenario.result?.status !== Status.FAILED || !this.page) {
    return;
  }

  let pageUrl = '(page unavailable)';
  try {
    pageUrl = this.page.url();
  } catch {
    // closed
  }

  let driftBlock = '';
  try {
    const driftPath = getSelfHealDriftLogPath();
    if (fs.existsSync(driftPath)) {
      const lines = fs.readFileSync(driftPath, 'utf8').trim().split('\n').filter(Boolean);
      if (lines.length > 0) {
        const last = lines[lines.length - 1];
        let parsed = last;
        try {
          parsed = JSON.stringify(JSON.parse(last), null, 2);
        } catch {
          // keep raw line
        }
        driftBlock = `\n**Self-heal (this run):** ${lines.length} fallback event(s). Latest:\n\`\`\`json\n${parsed.slice(0, 1200)}${parsed.length > 1200 ? '\n…' : ''}\n\`\`\`\n`;
      }
    }
  } catch {
    // ignore
  }

  const md = [
    '### Automation debug context',
    '',
    `**Scenario:** ${scenario.pickle.name}`,
    `**Page URL:** ${pageUrl}`,
    driftBlock,
    '**Suggested next steps:**',
    '- Update page objects / `fallback-locator` strategies or `rulesets/` as needed.',
    `- Selector intelligence summary (if generated): \`${path.relative(process.cwd(), getSelectorSummaryPath())}\``,
  ].join('\n');

  await this.attach(md, 'text/markdown');
});

AfterStep(async function ({ result }) {
  await maybeAuditVisibleScreen({
    page: this.page,
    scenarioContext: this.designAuditContext,
  });

  if (result?.status === Status.FAILED && this.page) {
    try {
      const screenshot = await captureScreenshot(this.page, { fullPage: false });
      await this.attach(screenshot, 'image/png');
    } catch {
      // ignore
    }
  }
});
