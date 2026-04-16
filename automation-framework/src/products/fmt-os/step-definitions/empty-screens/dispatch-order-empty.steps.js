import { Given, When, Then } from '@cucumber/cucumber';
import { DispatchOrderPage } from '../../pages/empty-screens/dispatch-order.page.js';

const dispatchOrder = (world) => new DispatchOrderPage(world.page);

Given('I navigate to Dispatch Order screen', async function () {
  await dispatchOrder(this).navigateToDispatchOrder();
});

When('I search dispatch order for {string}', async function (text) {
  await dispatchOrder(this).search(text);
});

Then(
  'I verify dispatch order empty state on {string} tab with primary {string} and supporting {string}',
  async function (tabName, primary, supporting) {
    await dispatchOrder(this).clickTabAndVerifyEmptyState(tabName, primary, supporting);
  }
);

