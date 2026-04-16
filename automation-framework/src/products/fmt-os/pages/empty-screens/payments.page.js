import config from '../../../../config/env.config.js';
import {
  clickFirstMatching,
  escapeForRegExp,
  fillFirstMatching,
  firstMatchingLocator,
} from '../../../../shared/locators/fallback-locator.js';
import { bugError } from '../../../../shared/utils/bug-tags.js';
import {
  defaultAnyTabStrategies,
  defaultSearchStrategies,
  defaultTabStrategies,
} from './empty-screen.strategies.js';

export class PaymentsPage {
  constructor(page) {
    this.page = page;
    this.url = `${config.products['fmt-os'].baseUrl}/finance/payment`;
    this._healLog = config.selfHeal.logFallbacks;
  }

  _searchStrategies() {
    return defaultSearchStrategies();
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

  async clickTabAndVerifyEmptyState(tabName, primaryText, supportingText) {
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

