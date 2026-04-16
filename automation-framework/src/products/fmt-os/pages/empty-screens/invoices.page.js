import config from '../../../../config/env.config.js';
import {
  clickFirstMatching,
  fillFirstMatching,
  firstMatchingLocator,
} from '../../../../shared/locators/fallback-locator.js';
import { bugError } from '../../../../shared/utils/bug-tags.js';
import {
  defaultAnyTabStrategies,
  defaultSearchStrategies,
  defaultTabStrategies,
} from './empty-screen.strategies.js';

export class InvoicesPage {
  constructor(page) {
    this.page = page;
    this.url = `${config.products['fmt-os'].baseUrl}/finance/invoicing`;
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

  async navigateToInvoices() {
    await this.page.goto(this.url, { waitUntil: 'domcontentloaded' });
    await firstMatchingLocator(this.page, this._anyTabStrategies(), {
      context: 'Invoices: tabs visible',
      logFallback: this._healLog,
      perTryTimeouts: [15000, 8000],
      retryRecovery: async () => {
        await this.page.goto(this.url, { waitUntil: 'domcontentloaded' });
      },
    });
  }

  async search(text) {
    await fillFirstMatching(this.page, this._searchStrategies(), text, {
      context: 'Invoices: search input',
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
        context: `Invoices: click tab "${tabName}"`,
        logFallback: this._healLog,
        perTryTimeout: 8000,
      });
    } catch {
      throw bugError('EMPTY_SCREEN_TAB_MISSING', `Invoices: expected tab "${tabName}" to exist/be clickable.`);
    }

    try {
      await this.page
        .getByText(primaryText, { exact: false })
        .first()
        .waitFor({ state: 'visible', timeout: 4000 });
    } catch {
      throw bugError(
        'EMPTY_SCREEN_COPY_MISSING',
        `Invoices "${tabName}": primary text missing/changed. Expected: "${primaryText}".`
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
        `Invoices "${tabName}": supporting text missing/changed. Expected: "${supportingText}".`
      );
    }
  }
}

