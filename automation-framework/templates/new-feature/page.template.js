import { BasePage } from '../../../shared/pages/base.page.js';
import config from '../../../config/env.config.js';

// Rename FeatureTemplatePage and replace the placeholder strings below
// when you copy this file for a real feature.
export class FeatureTemplatePage extends BasePage {
  constructor(page) {
    super(page);

    this.url = `${config.products['fmt-os'].baseUrl}/feature-path`;

    this.selectors = {
      root: '[data-testid="feature-root"]',
    };
  }

  async navigateToPage() {
    await this.page.goto(this.url, { waitUntil: 'domcontentloaded' });
    await this.page.waitForSelector(this.selectors.root, { timeout: 15000 });
  }

  async performTemplateAction() {
    // Replace this with the real feature action.
  }

  async assertTemplateOutcome() {
    await this.page.waitForSelector(this.selectors.root, { timeout: 15000 });
  }
}
