import { BasePage } from '../../../shared/pages/base.page.js';
import config from '../../../config/env.config.js';

export class PurchaseOrderPage extends BasePage {
  constructor(page) {
    super(page);

    this.url = `${config.products['fmt-os'].baseUrl}/procurement/purchase-order`;

    this.selectors = {
      searchBar: 'input[placeholder="Search by PO#, Supplier Name & ID"]',
      tab: (name) => `[role="tab"]:has-text("${name}")`,
    };
    this.tabs = ['Review PO', 'Map SO', 'In Progress', 'Completed', 'All'];
  }

  async navigateToPurchaseOrder() {
    await this.page.goto(this.url, { waitUntil: 'domcontentloaded' });
    await this.page.waitForSelector('[role="tab"]', { timeout: 15000 });
  }

  async search(text) {
    await this.page.fill(this.selectors.searchBar, text);
    await this.page.keyboard.press('Enter');
    await this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  }

  async clearSearch() {
    await this.page.fill(this.selectors.searchBar, '');
    await this.page.keyboard.press('Enter');
    await this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  }

  async clickTab(tabName) {
    await this.page.locator(this.selectors.tab(tabName)).first().click();
    await this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  }

  async assertTabActive(tabName) {
    const tab = this.page.locator(this.selectors.tab(tabName)).first();
    await tab.waitFor({ state: 'visible', timeout: 5000 });
    const ariaSelected = await tab.getAttribute('aria-selected');
    const classes = await tab.getAttribute('class') || '';
    if (ariaSelected !== 'true' && !classes.includes('Mui-selected')) {
      throw new Error(`Expected tab "${tabName}" to be active`);
    }
  }

  async assertSearchBarVisible() {
    await this.page.locator(this.selectors.searchBar).waitFor({ state: 'visible', timeout: 5000 });
  }

  async assertSearchBarValue(expectedText) {
    const actualValue = await this.page.locator(this.selectors.searchBar).inputValue();
    if (actualValue !== expectedText) {
      throw new Error(`Expected search bar to contain "${expectedText}" but found "${actualValue}"`);
    }
  }

  async assertSearchBarTrimmedValue(expectedTrimmedText) {
    const actualValue = await this.page.locator(this.selectors.searchBar).inputValue();
    if (actualValue !== expectedTrimmedText) {
      throw new Error(
        `Expected search bar to be trimmed as "${expectedTrimmedText}" but found "${actualValue}"`
      );
    }
  }

  async assertSearchBarEmpty() {
    await this.assertSearchBarValue('');
  }

  async assertAllTabsVisible() {
    for (const tabName of this.tabs) {
      await this.page.locator(this.selectors.tab(tabName)).first().waitFor({ state: 'visible', timeout: 5000 });
    }
  }

  async clickTabAndVerifyEmptyState(tabName, expectedText) {
    await this.clickTab(tabName);
    await this.page.getByText(expectedText, { exact: false }).waitFor({ state: 'visible', timeout: 5000 });
  }
}
