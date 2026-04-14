import { expect } from '@playwright/test';
import { waitForVisible } from '../utils/wait.utils.js';

/**
 * BasePage — base class for all Page Objects.
 * Provides reusable Playwright actions and assertion helpers.
 */
export class BasePage {
  /** @param {import('playwright').Page} page */
  constructor(page) {
    this.page = page;
  }

  async goto(url) {
    await this.page.goto(url, { waitUntil: 'domcontentloaded' });
  }

  async click(selector) {
    await waitForVisible(this.page, selector);
    await this.page.click(selector);
  }

  async fill(selector, text) {
    await waitForVisible(this.page, selector);
    await this.page.fill(selector, text);
  }

  async getText(selector) {
    await waitForVisible(this.page, selector);
    return (await this.page.textContent(selector)) || '';
  }

  async isVisible(selector) {
    return this.page.isVisible(selector);
  }

  async assertVisible(selector) {
    await expect(this.page.locator(selector)).toBeVisible();
  }

  async assertTextContains(selector, text) {
    await expect(this.page.locator(selector)).toContainText(text);
  }

  async assertUrlContains(urlPart) {
    await expect(this.page).toHaveURL(new RegExp(urlPart));
  }
}
