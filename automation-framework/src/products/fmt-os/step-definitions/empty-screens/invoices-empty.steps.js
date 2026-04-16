import { Given, When, Then } from '@cucumber/cucumber';
import { InvoicesPage } from '../../pages/empty-screens/invoices.page.js';

const invoices = (world) => new InvoicesPage(world.page);

Given('I navigate to Invoices screen', async function () {
  await invoices(this).navigateToInvoices();
});

When('I search invoices for {string}', async function (text) {
  await invoices(this).search(text);
});

Then(
  'I verify invoices empty state on {string} tab with primary {string} and supporting {string}',
  async function (tabName, primary, supporting) {
    await invoices(this).clickTabAndVerifyEmptyState(tabName, primary, supporting);
  }
);

