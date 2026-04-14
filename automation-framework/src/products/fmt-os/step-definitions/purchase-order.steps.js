import { Given, When, Then } from '@cucumber/cucumber';
import { PurchaseOrderPage } from '../pages/purchase-order.page.js';

const po = (world) => new PurchaseOrderPage(world.page);

Given('I navigate to Purchase Order screen', async function () {
  await po(this).navigateToPurchaseOrder();
});

When('I type {string} in the search bar', async function (text) {
  await po(this).search(text);
});

Then('the {string} tab should be active', async function (tabName) {
  await po(this).assertTabActive(tabName);
});

Then('I verify empty state on {string} tab with message {string}', async function (tabName, expectedMessage) {
  await po(this).clickTabAndVerifyEmptyState(tabName, expectedMessage);
});
