import config from '../../../../config/env.config.js';
import {
  clickFirstMatching,
  escapeForRegExp,
  fillFirstMatching,
  firstMatchingLocator,
} from '../../../../shared/locators/fallback-locator.js';
import { bugError } from '../../../../shared/utils/bug-tags.js';

export class PaymentsPage {
  constructor(page) {
    this.page = page;
    this.url = `${config.products['fmt-os'].baseUrl}/finance/payment`;
    this._healLog = config.selfHeal.logFallbacks;
  }

  _selectStatesButtonStrategies() {
    return [
      { name: 'role_button_select_states', locator: (p) => p.getByRole('button', { name: /select states/i }) },
      { name: 'button_has_text_select_states', locator: (p) => p.locator('button:has-text("Select States")') },
      { name: 'role_button_select', locator: (p) => p.getByRole('button', { name: /select/i }) },
    ];
  }

  _selectAllOptionStrategies() {
    return [
      { name: 'role_option_all', locator: (p) => p.getByRole('option', { name: /^All$/i }) },
      { name: 'role_menuitem_all', locator: (p) => p.getByRole('menuitem', { name: /^All$/i }) },
      { name: 'text_all', locator: (p) => p.getByText(/^All$/i) },
      { name: 'listitem_all', locator: (p) => p.locator('li:has-text("All")') },
    ];
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

  _emptyTextStrategies(text) {
    const pattern = new RegExp(escapeForRegExp(String(text).slice(0, 120)), 'i');
    return [
      { name: 'getByText_substring', locator: (p) => p.getByText(text, { exact: false }) },
      { name: 'getByText_regex', locator: (p) => p.getByText(pattern) },
    ];
  }

  async navigateToPayments() {
    await this.page.goto(this.url, { waitUntil: 'domcontentloaded' });
    await firstMatchingLocator(this.page, this._anyTabStrategies(), {
      context: 'Payments: tabs visible',
      logFallback: this._healLog,
      perTryTimeouts: [15000, 8000],
      retryRecovery: async () => {
        await this.page.goto(this.url, { waitUntil: 'domcontentloaded' });
      },
    });
  }

  async search(text) {
    await fillFirstMatching(this.page, this._searchStrategies(), text, {
      context: 'Payments: search input',
      logFallback: this._healLog,
      perTryTimeout: 6000,
      retryRecovery: async () => {
        await this.page.goto(this.url, { waitUntil: 'domcontentloaded' });
      },
    });
    await this.page.keyboard.press('Enter');
  }

  async selectAllState() {
    await clickFirstMatching(this.page, this._selectStatesButtonStrategies(), {
      context: 'Payments: open Select States',
      logFallback: this._healLog,
      perTryTimeout: 6000,
    });
    await clickFirstMatching(this.page, this._selectAllOptionStrategies(), {
      context: 'Payments: select All state',
      logFallback: this._healLog,
      perTryTimeout: 6000,
    });
  }

  async clickTabAndVerifyEmptyState(tabName, primaryText, supportingText) {
    if (String(tabName).trim().toLowerCase() === 'all') {
      try {
        await this.selectAllState();
      } catch {
        throw bugError('EMPTY_SCREEN_TAB_MISSING', 'Payments: expected "All" state to be selectable.');
      }
    } else {
      try {
        await clickFirstMatching(this.page, this._tabStrategies(tabName), {
          context: `Payments: click tab "${tabName}"`,
          logFallback: this._healLog,
          perTryTimeout: 8000,
        });
      } catch {
        throw bugError(
          'EMPTY_SCREEN_TAB_MISSING',
          `Payments: expected tab "${tabName}" to exist/be clickable.`
        );
      }
    }

    try {
      await firstMatchingLocator(this.page, this._emptyTextStrategies(primaryText), {
        context: `Payments: empty primary — ${String(primaryText).slice(0, 48)}`,
        logFallback: this._healLog,
        perTryTimeouts: [8000, 8000],
      });
    } catch {
      throw bugError(
        'EMPTY_SCREEN_COPY_MISSING',
        `Payments "${tabName}": primary text missing/changed. Expected: "${primaryText}".`
      );
    }

    try {
      await firstMatchingLocator(this.page, this._emptyTextStrategies(supportingText), {
        context: `Payments: empty supporting — ${String(primaryText).slice(0, 48)}`,
        logFallback: this._healLog,
        perTryTimeouts: [8000, 8000],
      });
    } catch {
      throw bugError(
        'EMPTY_SCREEN_COPY_MISSING',
        `Payments "${tabName}": supporting text missing/changed. Expected: "${supportingText}".`
      );
    }
  }
}

