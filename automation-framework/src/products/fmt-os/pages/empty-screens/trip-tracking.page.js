import config from '../../../../config/env.config.js';
import {
  clickFirstMatching,
  escapeForRegExp,
  fillFirstMatching,
  firstMatchingLocator,
} from '../../../../shared/locators/fallback-locator.js';

export class TripTrackingPage {
  constructor(page) {
    this.page = page;
    this.url = `${config.products['fmt-os'].baseUrl}/logistics/trip-tracking`;
    this._healLog = config.selfHeal.logFallbacks;
  }

  _searchStrategies() {
    return [
      { name: 'type_search', locator: (p) => p.locator('input[type="search"]') },
      { name: 'role_searchbox', locator: (p) => p.getByRole('searchbox') },
      { name: 'getByPlaceholder_search', locator: (p) => p.getByPlaceholder(/search/i) },
      { name: 'first_input', locator: (p) => p.locator('input').first() },
    ];
  }

  _anyTabStrategies() {
    return [
      { name: 'role_tab', locator: (p) => p.locator('[role="tab"]') },
      { name: 'getByRole_tab', locator: (p) => p.getByRole('tab') },
    ];
  }

  _tabStrategies(tabName) {
    const pattern = new RegExp(escapeForRegExp(tabName), 'i');
    return [
      { name: 'role_tab_has_text', locator: (p) => p.locator(`[role="tab"]:has-text("${tabName}")`) },
      { name: 'role_tab_hasText_regex', locator: (p) => p.locator('[role="tab"]', { hasText: pattern }) },
      { name: 'getByRole_tab_name', locator: (p) => p.getByRole('tab', { name: pattern }) },
      { name: 'tab_button_mui', locator: (p) => p.locator(`button[role="tab"]:has-text("${tabName}")`) },
      {
        name: 'tablist_descendant_hasText',
        locator: (p) => p.locator('[role="tablist"]').locator('[role="tab"], button', { hasText: pattern }),
      },
      // Keep this scoped to tab-like elements only; broad fallbacks can be slow and click unrelated UI.
      { name: 'any_tab_or_button_hasText', locator: (p) => p.locator('[role="tab"], button', { hasText: pattern }) },
    ];
  }

  _emptyTextStrategies(text) {
    const pattern = new RegExp(escapeForRegExp(String(text).slice(0, 120)), 'i');
    return [
      { name: 'getByText_substring', locator: (p) => p.getByText(text, { exact: false }) },
      { name: 'getByText_regex', locator: (p) => p.getByText(pattern) },
    ];
  }

  async navigateToTripTracking() {
    await this.page.goto(this.url, { waitUntil: 'domcontentloaded' });
    await firstMatchingLocator(this.page, this._anyTabStrategies(), {
      context: 'TripTracking: tabs visible',
      logFallback: this._healLog,
      perTryTimeouts: [15000, 8000],
      retryRecovery: async () => {
        await this.page.goto(this.url, { waitUntil: 'domcontentloaded' });
      },
    });
  }

  async search(text) {
    await fillFirstMatching(this.page, this._searchStrategies(), text, {
      context: 'TripTracking: search input',
      logFallback: this._healLog,
      perTryTimeout: 6000,
      retryRecovery: async () => {
        await this.page.goto(this.url, { waitUntil: 'domcontentloaded' });
      },
    });
    await this.page.keyboard.press('Enter');
  }

  async clickTabAndVerifyEmptyState(tabName, primaryText, supportingText) {
    try {
      await clickFirstMatching(this.page, this._tabStrategies(tabName), {
        context: `TripTracking: click tab "${tabName}"`,
        logFallback: this._healLog,
        perTryTimeouts: [2500, 2500, 2500, 2500, 2500, 2500],
      });
    } catch {
      throw new Error(`[BUG][EMPTY_SCREEN_TAB_MISSING] Trip Tracking: expected tab "${tabName}" to exist/be clickable.`);
    }

    try {
      // Fast-fail on copy regressions: don't spend time in self-heal/CDP for assertions.
      await this.page
        .getByText(primaryText, { exact: false })
        .first()
        .waitFor({ state: 'visible', timeout: 4000 });
    } catch (err) {
      throw new Error(
        `[BUG][EMPTY_SCREEN_COPY_MISSING] Trip Tracking "${tabName}" primary text missing/changed. Expected: "${primaryText}".`
      );
    }

    try {
      await this.page
        .getByText(supportingText, { exact: false })
        .first()
        .waitFor({ state: 'visible', timeout: 4000 });
    } catch (err) {
      throw new Error(
        `[BUG][EMPTY_SCREEN_COPY_MISSING] Trip Tracking "${tabName}" supporting text missing/changed. Expected: "${supportingText}".`
      );
    }
  }
}

