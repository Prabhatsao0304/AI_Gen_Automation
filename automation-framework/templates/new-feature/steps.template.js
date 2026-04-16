import { Given, When, Then } from '@cucumber/cucumber';
import { FeatureTemplatePage } from '../pages/feature-slug.page.js';

// Rename FeatureTemplatePage, the import path, and the step text
// when you copy this file for a real feature.
Given('I navigate to Feature Template screen', async function () {
  const featurePage = new FeatureTemplatePage(this.page);
  await featurePage.navigateToPage();
});

When('I perform the template action', async function () {
  const featurePage = new FeatureTemplatePage(this.page);
  await featurePage.performTemplateAction();
});

Then('the template expectation should be met', async function () {
  const featurePage = new FeatureTemplatePage(this.page);
  await featurePage.assertTemplateOutcome();
});
