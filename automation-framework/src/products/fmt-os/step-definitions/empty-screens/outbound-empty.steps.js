import { Given, When, Then } from '@cucumber/cucumber';
import { OutboundPage } from '../../pages/empty-screens/outbound.page.js';

const outbound = (world) => new OutboundPage(world.page);

Given('I navigate to Outbound screen', async function () {
  await outbound(this).navigateToOutbound();
});

When('I search outbound for {string}', async function (text) {
  await outbound(this).search(text);
});

Then(
  'I verify outbound empty state on {string} tab with primary {string} and supporting {string}',
  async function (tabName, primary, supporting) {
    await outbound(this).clickTabAndVerifyEmptyState(tabName, primary, supporting);
  }
);

