import fs from 'fs';
import path from 'path';
import { BeforeAll, AfterAll, After, Status, setDefaultTimeout } from '@cucumber/cucumber';
import {
  getSelfHealDriftLogPath,
  truncateSelfHealDriftLog,
} from '../shared/locators/fallback-locator.js';
import {
  getSelectorSummaryPath,
  initSelectorIntelligence,
  writeSelectorIntelligenceSummary,
} from '../shared/locators/selector-intelligence.js';
import { launchAndLogin, closeSharedBrowser } from './world.js';

setDefaultTimeout(120 * 1000);

/**
 * Runs ONCE before all scenarios.
 * Launches Chrome and logs in via Google SSO — one login for the entire run.
 */
BeforeAll(async function () {
  truncateSelfHealDriftLog();
  initSelectorIntelligence();
  console.log('\n  [setup] Launching browser and logging in (once for all scenarios)...');
  await launchAndLogin('fmt-os');
  console.log('  [setup] Login complete — all scenarios will reuse this session.\n');
});

/**
 * Runs ONCE after all scenarios — closes the shared browser.
 */
AfterAll(async function () {
  writeSelectorIntelligenceSummary();
  await closeSharedBrowser();
});

/**
 * On scenario failure: attach markdown to the HTML report (visible in Cucumber HTML formatter).
 * Includes page URL and self-heal drift hint.
 */
After(async function (scenario) {
  if (scenario.result?.status !== Status.FAILED || !this.page) return;

  let pageUrl = '(page unavailable)';
  try {
    pageUrl = this.page.url();
  } catch {
    /* closed */
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
          /* raw line */
        }
        driftBlock = `\n**Self-heal (this run):** ${lines.length} fallback event(s). Latest:\n\`\`\`json\n${parsed.slice(0, 1200)}${parsed.length > 1200 ? '\n…' : ''}\n\`\`\`\n`;
      }
    }
  } catch {
    /* ignore */
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
