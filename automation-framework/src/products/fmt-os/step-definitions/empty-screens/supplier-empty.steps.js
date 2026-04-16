import { Given, When, Then } from '@cucumber/cucumber';
import { SupplierPage } from '../../pages/empty-screens/supplier.page.js';

const supplier = (world) => new SupplierPage(world.page);

Given('I navigate to Supplier screen', async function () {
  await supplier(this).navigateToSupplier();
});

When('I search supplier for {string}', async function (text) {
  await supplier(this).search(text);
});

Then(
  'I verify supplier empty state on {string} tab with primary {string} and supporting {string}',
  async function (tabName, primary, supporting) {
    await supplier(this).clickTabAndVerifyEmptyState(tabName, primary, supporting);
  }
);

