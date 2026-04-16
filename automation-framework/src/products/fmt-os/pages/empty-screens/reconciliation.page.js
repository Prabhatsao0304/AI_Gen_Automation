import config from '../../../../config/env.config.js';
import {
  clickFirstMatching,
  escapeForRegExp,
  fillFirstMatching,
  firstMatchingLocator,
} from '../../../../shared/locators/fallback-locator.js';
import { bugError } from '../../../../shared/utils/bug-tags.js';

export class ReconciliationPage {
  constructor(page) {
    this.page = page;
    this.url = `${config.products['fmt-os'].baseUrl}/finance/reconciliation`;
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
      { name: 'any_tab_or_button_hasText', locator: (p) => p.locator('[role="tab"], button', { hasText: pattern }) },
      { name: 'button_has_text', locator: (p) => p.locator(`button:has-text("${tabName}")`) },
      { name: 'role_button_name', locator: (p) => p.getByRole('button', { name: pattern }) },
      {
        name: 'generic_clickable_hasText',
        locator: (p) => p.locator('button, [role="button"], a, div', { hasText: pattern }),
      },
    ];
  }

  async navigateToReconciliation() {
    await this.page.goto(this.url, { waitUntil: 'domcontentloaded' });
    await firstMatchingLocator(this.page, this._anyTabStrategies(), {
      context: 'Reconciliation: tabs visible',
      logFallback: this._healLog,
      perTryTimeouts: [15000, 8000],
      retryRecovery: async () => {
        await this.page.goto(this.url, { waitUntil: 'domcontentloaded' });
      },
    });
  }

  async search(text) {
    await fillFirstMatching(this.page, this._searchStrategies(), text, {
      context: 'Reconciliation: search input',
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
        context: `Reconciliation: click tab "${tabName}"`,
        logFallback: this._healLog,
        perTryTimeout: 8000,
      });
    } catch {
      throw bugError('EMPTY_SCREEN_TAB_MISSING', `Reconciliation: expected tab "${tabName}" to exist/be clickable.`);
    }

    try {
      await this.page
        .getByText(primaryText, { exact: false })
        .first()
        .waitFor({ state: 'visible', timeout: 4000 });
    } catch {
      throw bugError(
        'EMPTY_SCREEN_COPY_MISSING',
        `Reconciliation "${tabName}": primary text missing/changed. Expected: "${primaryText}".`
      );
    }

    try {
      await this.page
        .getByText(supportingText, { exact: false })
        .first()
        .waitFor({ state: 'visible', timeout: 4000 });
    } catch {
      throw bugError(
        'EMPTY_SCREEN_COPY_MISSING',
        `Reconciliation "${tabName}": supporting text missing/changed. Expected: "${supportingText}".`
      );
    }
  }
}

