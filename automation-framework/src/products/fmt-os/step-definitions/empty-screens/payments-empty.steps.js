import { Given, When, Then } from '@cucumber/cucumber';
import { PaymentsPage } from '../../pages/empty-screens/payments.page.js';

const payments = (world) => new PaymentsPage(world.page);

Given('I navigate to Payments screen', async function () {
  await payments(this).navigateToPayments();
});

When('I search payments for {string}', async function (text) {
  await payments(this).search(text);
});

Then(
  'I verify payments empty state on {string} tab with primary {string} and supporting {string}',
  async function (tabName, primary, supporting) {
    await payments(this).clickTabAndVerifyEmptyState(tabName, primary, supporting);
  }
);

