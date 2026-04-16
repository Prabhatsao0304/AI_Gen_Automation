import { Given, When, Then } from '@cucumber/cucumber';
import { SalesOrderPage } from '../../pages/empty-screens/sales-order.page.js';

const salesOrder = (world) => new SalesOrderPage(world.page);

Given('I navigate to Sales Order screen', async function () {
  await salesOrder(this).navigateToSalesOrder();
});

When('I search sales order for {string}', async function (text) {
  await salesOrder(this).search(text);
});

Then(
  'I verify sales order empty state on {string} tab with primary {string} and supporting {string}',
  async function (tabName, primary, supporting) {
    await salesOrder(this).clickTabAndVerifyEmptyState(tabName, primary, supporting);
  }
);

