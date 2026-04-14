/**
 * BasePage — base class for Page Objects. Holds the Playwright page reference.
 */
export class BasePage {
  /** @param {import('playwright').Page} page */
  constructor(page) {
    this.page = page;
  }
}
