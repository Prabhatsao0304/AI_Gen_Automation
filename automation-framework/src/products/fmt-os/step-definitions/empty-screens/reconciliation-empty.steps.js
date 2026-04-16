import { Given, When, Then } from '@cucumber/cucumber';
import { ReconciliationPage } from '../../pages/empty-screens/reconciliation.page.js';

const reconciliation = (world) => new ReconciliationPage(world.page);

Given('I navigate to Reconciliation screen', async function () {
  await reconciliation(this).navigateToReconciliation();
});

When('I search reconciliation for {string}', async function (text) {
  await reconciliation(this).search(text);
});

Then(
  'I verify reconciliation empty state on {string} tab with primary {string} and supporting {string}',
  async function (tabName, primary, supporting) {
    await reconciliation(this).clickTabAndVerifyEmptyState(tabName, primary, supporting);
  }
);

