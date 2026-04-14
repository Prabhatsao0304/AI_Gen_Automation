import { BasePage } from '../../../shared/pages/base.page.js';
import config from '../../../config/env.config.js';
import {
  firstMatchingLocator,
  fillFirstMatching,
  clickFirstMatching,
  escapeForRegExp,
} from '../../../shared/locators/fallback-locator.js';

export class PurchaseOrderPage extends BasePage {
  constructor(page) {
    super(page);

    this.url = `${config.products['fmt-os'].baseUrl}/procurement/purchase-order`;

    this._healLog = config.selfHeal.logFallbacks;
  }

  _searchStrategies() {
    return [
      {
        name: 'placeholder_exact',
        locator: (p) => p.locator('input[placeholder="Search by PO#, Supplier Name & ID"]'),
      },
      {
        name: 'placeholder_regex',
        locator: (p) => p.getByPlaceholder(/Search by PO#|Supplier Name|purchase order/i),
      },
      { name: 'type_search', locator: (p) => p.locator('input[type="search"]') },
      { name: 'role_searchbox', locator: (p) => p.getByRole('searchbox') },
    ];
  }

  _tabStrategies(tabName) {
    const pattern = new RegExp(escapeForRegExp(tabName), 'i');
    return [
      {
        name: 'role_tab_has_text',
        locator: (p) => p.locator(`[role="tab"]:has-text("${tabName}")`),
      },
      {
        name: 'getByRole_tab_name',
        locator: (p) => p.getByRole('tab', { name: pattern }),
      },
      {
        name: 'tab_button_mui',
        locator: (p) => p.locator(`button[role="tab"]:has-text("${tabName}")`),
      },
    ];
  }

  _anyTabStrategies() {
    return [
      { name: 'role_tab', locator: (p) => p.locator('[role="tab"]') },
      { name: 'getByRole_tab', locator: (p) => p.getByRole('tab') },
    ];
  }

  _emptyStateStrategies(primaryText) {
    const pattern = new RegExp(escapeForRegExp(primaryText.slice(0, 80)), 'i');
    return [
      { name: 'getByText_substring', locator: (p) => p.getByText(primaryText, { exact: false }) },
      { name: 'getByText_regex', locator: (p) => p.getByText(pattern) },
    ];
  }

  async navigateToPurchaseOrder() {
    await this.page.goto(this.url, { waitUntil: 'domcontentloaded' });
    await firstMatchingLocator(this.page, this._anyTabStrategies(), {
      context: 'PO: tabs visible',
      logFallback: this._healLog,
      perTryTimeouts: [15000, 8000],
      retryRecovery: async () => {
        await this.page.goto(this.url, { waitUntil: 'domcontentloaded' });
      },
    });
  }

  async search(text) {
    await fillFirstMatching(this.page, this._searchStrategies(), text, {
      context: 'PO: search input',
      logFallback: this._healLog,
      perTryTimeout: 5000,
      retryRecovery: async () => {
        await this.page.goto(this.url, { waitUntil: 'domcontentloaded' });
        await firstMatchingLocator(this.page, this._anyTabStrategies(), {
          context: 'PO: tabs visible (after reload)',
          logFallback: this._healLog,
          perTryTimeouts: [12000, 6000],
        });
      },
    });
    await this.page.keyboard.press('Enter');
    await this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  }

  async assertTabActive(tabName) {
    const { locator } = await firstMatchingLocator(this.page, this._tabStrategies(tabName), {
      context: `PO: tab "${tabName}"`,
      logFallback: this._healLog,
      perTryTimeout: 5000,
    });
    const ariaSelected = await locator.getAttribute('aria-selected');
    const classes = (await locator.getAttribute('class')) || '';
    if (ariaSelected !== 'true' && !classes.includes('Mui-selected')) {
      throw new Error(`Expected tab "${tabName}" to be active`);
    }
  }

  async clickTabAndVerifyEmptyState(tabName, expectedText) {
    await clickFirstMatching(this.page, this._tabStrategies(tabName), {
      context: `PO: click tab "${tabName}"`,
      logFallback: this._healLog,
      perTryTimeout: 5000,
    });
    await firstMatchingLocator(this.page, this._emptyStateStrategies(expectedText), {
      context: `PO: empty state — ${expectedText.slice(0, 48)}`,
      logFallback: this._healLog,
      perTryTimeouts: [6000, 6000],
    });
  }
}
