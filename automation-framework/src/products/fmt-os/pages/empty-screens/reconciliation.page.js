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

export class ReconciliationPage {
  constructor(page) {
    this.page = page;
    this.url = `${config.products['fmt-os'].baseUrl}/finance/reconciliation`;
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

