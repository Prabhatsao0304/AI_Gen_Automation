import { Given, When, Then } from '@cucumber/cucumber';
import { PurchaseOrderPage } from '../pages/purchase-order.page.js';

Given('I navigate to Purchase Order screen', async function () {
  const po = new PurchaseOrderPage(this.page);
  await po.navigateToPurchaseOrder();
});

When('I type {string} in the search bar', async function (text) {
  const po = new PurchaseOrderPage(this.page);
  await po.search(text);
});

Then('the {string} tab should be active', async function (tabName) {
  const po = new PurchaseOrderPage(this.page);
  await po.assertTabActive(tabName);
});

// Single step: click tab + verify empty state text — no re-entering search
Then('I verify empty state on {string} tab with message {string}', async function (tabName, expectedMessage) {
  const po = new PurchaseOrderPage(this.page);
  await po.clickTabAndVerifyEmptyState(tabName, expectedMessage);
});
