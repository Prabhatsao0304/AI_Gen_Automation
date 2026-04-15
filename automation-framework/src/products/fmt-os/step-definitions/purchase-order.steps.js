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

When('I clear the search bar', async function () {
  const po = new PurchaseOrderPage(this.page);
  await po.clearSearch();
});

When('I open the {string} tab', async function (tabName) {
  const po = new PurchaseOrderPage(this.page);
  await po.clickTab(tabName);
});

Then('the {string} tab should be active', async function (tabName) {
  const po = new PurchaseOrderPage(this.page);
  await po.assertTabActive(tabName);
});

Then('the search bar should be visible', async function () {
  const po = new PurchaseOrderPage(this.page);
  await po.assertSearchBarVisible();
});

Then('the search bar should contain {string}', async function (expectedText) {
  const po = new PurchaseOrderPage(this.page);
  await po.assertSearchBarValue(expectedText);
});

Then('the search bar should be trimmed to {string}', async function (expectedTrimmedText) {
  const po = new PurchaseOrderPage(this.page);
  await po.assertSearchBarTrimmedValue(expectedTrimmedText);
});

Then('the search bar should be empty', async function () {
  const po = new PurchaseOrderPage(this.page);
  await po.assertSearchBarEmpty();
});

Then('all purchase order tabs should be visible', async function () {
  const po = new PurchaseOrderPage(this.page);
  await po.assertAllTabsVisible();
});

// Single step: click tab + verify empty state text — no re-entering search
Then('I verify empty state on {string} tab with message {string}', async function (tabName, expectedMessage) {
  const po = new PurchaseOrderPage(this.page);
  await po.clickTabAndVerifyEmptyState(tabName, expectedMessage);
});
