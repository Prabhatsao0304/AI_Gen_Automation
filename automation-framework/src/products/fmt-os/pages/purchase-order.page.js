import config from '../../../config/env.config.js';

export class PurchaseOrderPage {
  constructor(page) {
    this.page = page;

    this.url = `${config.products['fmt-os'].baseUrl}/procurement/purchase-order`;

    this.selectors = {
      searchBar: 'input[placeholder="Search by PO#, Supplier Name & ID"]',
      tab: (name) => `[role="tab"]:has-text("${name}")`,
      poCard: '[data-testid*="po-card" i], [class*="po-card" i], [class*="purchase-order" i]',
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
    await this.waitForUiSettle({ idleTimeout: 1800, minPause: 80 });
  }

  async clearSearch() {
    await this.page.fill(this.selectors.searchBar, '');
    await this.page.keyboard.press('Enter');
    await this.waitForUiSettle({ idleTimeout: 1800, minPause: 80 });
  }

  async clickTab(tabName) {
    await this.page.locator(this.selectors.tab(tabName)).first().click();
    await this.waitForUiSettle({ idleTimeout: 1800, minPause: 80 });
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

  async searchAndOpenPoFromReview(poNumber) {
    await this.clickTab('Review PO');
    await this.assertTabActive('Review PO');
    await this.search(poNumber);
    await this.openPoFromSearchResult(poNumber);
  }

  async openPoFromSearchResult(poNumber) {
    const poRegex = new RegExp(`\\b${this.escapeRegExp(poNumber)}\\b`, 'i');
    const poTextCandidates = this.page.getByText(poRegex);
    const total = await poTextCandidates.count().catch(() => 0);

    for (let index = 0; index < Math.min(total, 25); index += 1) {
      const candidate = poTextCandidates.nth(index);
      if (!(await candidate.isVisible({ timeout: 300 }).catch(() => false))) {
        continue;
      }
      await this.clickViaClickableAncestor(candidate);
      await this.waitForUiSettle({ idleTimeout: 2200, minPause: 120 });
      return;
    }

    const cardCandidates = this.page.locator(this.selectors.poCard);
    const cardCount = await cardCandidates.count().catch(() => 0);
    for (let index = 0; index < Math.min(cardCount, 15); index += 1) {
      const card = cardCandidates.nth(index);
      if (!(await card.isVisible({ timeout: 300 }).catch(() => false))) {
        continue;
      }
      const cardText = (await card.innerText().catch(() => '')).trim();
      if (poRegex.test(cardText)) {
        await this.clickViaClickableAncestor(card);
        await this.waitForUiSettle({ idleTimeout: 2200, minPause: 120 });
        return;
      }
    }

    throw new Error(
      `Unable to find or open PO "${poNumber}" in Review PO search results. Verify SHP has access and PO is present.`
    );
  }

  async approveOpenedPurchaseOrder() {
    const reviewButton = await this.findVisibleAction([
      'button:has-text("Review")',
      '[role="button"]:has-text("Review")',
      '[data-testid*="review" i]',
      '[aria-label*="review" i]',
    ], 'Review button', 2200, true);

    if (reviewButton) {
      await reviewButton.click();
      await this.waitForUiSettle({ idleTimeout: 2000, minPause: 120 });
    }

    const approveButton = await this.findVisibleAction([
      '[role="dialog"] button:has-text("Approve")',
      '[role="dialog"] [role="button"]:has-text("Approve")',
      '[class*="drawer" i] button:has-text("Approve")',
      '[class*="modal" i] button:has-text("Approve")',
      'button:has-text("Approve")',
      '[role="button"]:has-text("Approve")',
      'button:has-text("Approve PO")',
      '[role="button"]:has-text("Approve PO")',
      'button:has-text("Approve Request")',
      '[role="button"]:has-text("Approve Request")',
      '[data-testid*="approve" i]',
      '[aria-label*="approve" i]',
    ], 'Approve button');

    await approveButton.click();
    await this.waitForUiSettle({ idleTimeout: 2000, minPause: 150 });
    await this.confirmApprovalIfPrompted();
  }

  async confirmApprovalIfPrompted() {
    const confirmButton = await this.findVisibleAction([
      '[role="dialog"] button:has-text("Confirm")',
      '[role="dialog"] [role="button"]:has-text("Confirm")',
      '[role="dialog"] button:has-text("Approve")',
      '[role="dialog"] [role="button"]:has-text("Approve")',
      '[role="dialog"] button:has-text("Yes")',
      '[role="dialog"] [role="button"]:has-text("Yes")',
    ], 'Approval confirmation button', 900, true);

    if (!confirmButton) {
      return;
    }

    const waitForEnabledDeadline = Date.now() + 2500;
    while (Date.now() < waitForEnabledDeadline) {
      if (await confirmButton.isEnabled().catch(() => false)) {
        break;
      }
      if (await this.isPostApprovalStateVisible()) {
        return;
      }
      await this.page.waitForTimeout(120);
    }

    if (!(await confirmButton.isEnabled().catch(() => false))) {
      if (await this.isPostApprovalStateVisible()) {
        return;
      }
      return;
    }

    await confirmButton.click().catch(async (error) => {
      if (await this.isPostApprovalStateVisible()) {
        return;
      }
      throw error;
    });
    await this.waitForUiSettle({ idleTimeout: 2400, minPause: 120 });
  }

  async assertPoMovedAfterApproval(poNumber) {
    const statusIndicators = [
      this.page.getByText(/approval pending/i).first(),
      this.page.getByText(/approved/i).first(),
      this.page.getByText(/po approved/i).first(),
      this.page.getByText(/success/i).first(),
    ];

    for (const indicator of statusIndicators) {
      if (await indicator.isVisible({ timeout: 2200 }).catch(() => false)) {
        return;
      }
    }

    // Fallback validation: once approved, PO should be visible in Map SO tab.
    await this.clickTab('Map SO');
    await this.search(poNumber);

    const poRegex = new RegExp(`\\b${this.escapeRegExp(poNumber)}\\b`, 'i');
    const poOnMapSo = this.page.getByText(poRegex).first();
    if (await poOnMapSo.isVisible({ timeout: 5000 }).catch(() => false)) {
      return;
    }

    throw new Error(
      `PO "${poNumber}" was not detected in Approval Pending/Map SO state after SHP approval action.`
    );
  }

  async isPostApprovalStateVisible() {
    const indicators = [
      this.page.getByText(/approval pending/i).first(),
      this.page.getByText(/po approved/i).first(),
      this.page.getByText(/approved/i).first(),
      this.page.getByText(/remind supplier/i).first(),
    ];

    for (const indicator of indicators) {
      if (await indicator.isVisible({ timeout: 500 }).catch(() => false)) {
        return true;
      }
    }

    return false;
  }

  async findVisibleAction(selectors, actionName, timeoutMs = 5000, silent = false) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      for (const selector of selectors) {
        const locator = this.page.locator(selector).first();
        if (await locator.isVisible({ timeout: 200 }).catch(() => false)) {
          return locator;
        }
      }
      await this.page.waitForTimeout(120);
    }

    if (silent) {
      return null;
    }

    throw new Error(`Unable to find visible ${actionName}.`);
  }

  async clickViaClickableAncestor(target) {
    const clickableAncestor = target
      .locator(
        'xpath=ancestor::*[self::button or @role="button" or @role="link" or self::a or self::li or contains(@class,"MuiCard-root") or contains(@class,"MuiListItem-root")][1]'
      )
      .first();

    if (await clickableAncestor.isVisible({ timeout: 800 }).catch(() => false)) {
      await clickableAncestor.click();
      return;
    }

    await target.click();
  }

  async waitForUiSettle({ idleTimeout = 1400, minPause = 60 } = {}) {
    if (minPause > 0) {
      await this.page.waitForTimeout(minPause);
    }
    await this.page.waitForLoadState('networkidle', { timeout: idleTimeout }).catch(() => {});
  }

  escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
