import { Given, When, Then } from '@cucumber/cucumber';
import { PurchaseOrderPage } from '../pages/purchase-order.page.js';

const po = (world) => new PurchaseOrderPage(world.page);

Given('I navigate to Purchase Order screen', async function () {
  await po(this).navigateToPurchaseOrder();
});

When('I type {string} in the search bar', async function (text) {
  await po(this).search(text);
});

When('I clear the search bar', async function () {
  await po(this).clearSearch();
});

When('I open the {string} tab', async function (tabName) {
  await po(this).clickTab(tabName);
});

Then('the {string} tab should be active', async function (tabName) {
  await po(this).assertTabActive(tabName);
});

Then('the search bar should be visible', async function () {
  await po(this).assertSearchBarVisible();
});

Then('the search bar should contain {string}', async function (expectedText) {
  await po(this).assertSearchBarValue(expectedText);
});

Then('the search bar should be trimmed to {string}', async function (expectedTrimmedText) {
  await po(this).assertSearchBarTrimmedValue(expectedTrimmedText);
});

Then('the search bar should be empty', async function () {
  await po(this).assertSearchBarEmpty();
});

Then('all purchase order tabs should be visible', async function () {
  await po(this).assertAllTabsVisible();
});

Then('I verify empty state on {string} tab with message {string}', async function (tabName, expectedMessage) {
  await po(this).clickTabAndVerifyEmptyState(tabName, expectedMessage);
});
