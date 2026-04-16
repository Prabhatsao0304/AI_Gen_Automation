import { Given, When, Then } from '@cucumber/cucumber';
import { BankingPage } from '../../pages/empty-screens/banking.page.js';

const banking = (world) => new BankingPage(world.page);

Given('I navigate to Banking screen', async function () {
  await banking(this).navigateToBanking();
});

When('I search banking for {string}', async function (text) {
  await banking(this).search(text);
});

Then(
  'I verify banking empty state on {string} tab with primary {string} and supporting {string}',
  async function (tabName, primary, supporting) {
    await banking(this).clickTabAndVerifyEmptyState(tabName, primary, supporting);
  }
);

