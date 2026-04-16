import { Given, When, Then } from '@cucumber/cucumber';
import { BuyersPage } from '../../pages/empty-screens/buyers.page.js';

const buyers = (world) => new BuyersPage(world.page);

Given('I navigate to Buyers screen', async function () {
  await buyers(this).navigateToBuyers();
});

When('I search buyers for {string}', async function (text) {
  await buyers(this).search(text);
});

Then(
  'I verify buyers empty state on {string} tab with primary {string} and supporting {string}',
  async function (tabName, primary, supporting) {
    await buyers(this).clickTabAndVerifyEmptyState(tabName, primary, supporting);
  }
);

