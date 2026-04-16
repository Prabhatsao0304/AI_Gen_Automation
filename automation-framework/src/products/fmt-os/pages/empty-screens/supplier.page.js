import config from '../../../../config/env.config.js';
import {
  clickFirstMatching,
  escapeForRegExp,
  fillFirstMatching,
  firstMatchingLocator,
} from '../../../../shared/locators/fallback-locator.js';
import { bugError } from '../../../../shared/utils/bug-tags.js';
import { defaultAnyTabStrategies, defaultTabStrategies } from './empty-screen.strategies.js';

export class SupplierPage {
  constructor(page) {
    this.page = page;
    this.url = `${config.products['fmt-os'].baseUrl}/procurement/supplier`;
    this._healLog = config.selfHeal.logFallbacks;
  }

  _searchStrategies() {
    return [
      {
        name: 'placeholder_business_name',
        locator: (p) => p.getByPlaceholder(/Search by Business Name|Supplier ID|POC/i),
      },
      { name: 'type_search', locator: (p) => p.locator('input[type="search"]') },
      { name: 'role_searchbox', locator: (p) => p.getByRole('searchbox') },
      { name: 'first_input', locator: (p) => p.locator('input').first() },
    ];
  }

  _anyTabStrategies() {
    return defaultAnyTabStrategies();
  }

  _tabStrategies(tabName) {
    return defaultTabStrategies(tabName);
  }

  _emptyTextStrategies(text) {
    const pattern = new RegExp(escapeForRegExp(String(text).slice(0, 120)), 'i');
    return [
      { name: 'getByText_substring', locator: (p) => p.getByText(text, { exact: false }) },
      { name: 'getByText_regex', locator: (p) => p.getByText(pattern) },
    ];
  }

  async search(text) {
    await fillFirstMatching(this.page, this._searchStrategies(), text, {
      context: 'Supplier: search input',
      logFallback: this._healLog,
      perTryTimeout: 6000,
      retryRecovery: async () => {
        await this.page.goto(this.url, { waitUntil: 'domcontentloaded' });
      },
    });
    await this.page.keyboard.press('Enter');
  }

  async navigateToSupplier() {
    await this.page.goto(this.url, { waitUntil: 'domcontentloaded' });
    await firstMatchingLocator(this.page, this._anyTabStrategies(), {
      context: 'Supplier: tabs visible',
      logFallback: this._healLog,
      perTryTimeouts: [15000, 8000],
      retryRecovery: async () => {
        await this.page.goto(this.url, { waitUntil: 'domcontentloaded' });
      },
    });
  }

  async clickTabAndVerifyEmptyState(tabName, primaryText, supportingText) {
    try {
      await clickFirstMatching(this.page, this._tabStrategies(tabName), {
        context: `Supplier: click tab "${tabName}"`,
        logFallback: this._healLog,
        perTryTimeout: 8000,
      });
    } catch {
      throw bugError(
        'EMPTY_SCREEN_TAB_MISSING',
        `Supplier: expected tab "${tabName}" to exist/be clickable.`
      );
    }

    try {
      await firstMatchingLocator(this.page, this._emptyTextStrategies(primaryText), {
        context: `Supplier: empty primary — ${String(primaryText).slice(0, 48)}`,
        logFallback: this._healLog,
        perTryTimeouts: [8000, 8000],
      });
    } catch {
      throw bugError(
        'EMPTY_SCREEN_COPY_MISSING',
        `Supplier "${tabName}": primary text missing/changed. Expected: "${primaryText}".`
      );
    }

    try {
      await firstMatchingLocator(this.page, this._emptyTextStrategies(supportingText), {
        context: `Supplier: empty supporting — ${String(primaryText).slice(0, 48)}`,
        logFallback: this._healLog,
        perTryTimeouts: [8000, 8000],
      });
    } catch {
      throw bugError(
        'EMPTY_SCREEN_COPY_MISSING',
        `Supplier "${tabName}": supporting text missing/changed. Expected: "${supportingText}".`
      );
    }
  }
}

