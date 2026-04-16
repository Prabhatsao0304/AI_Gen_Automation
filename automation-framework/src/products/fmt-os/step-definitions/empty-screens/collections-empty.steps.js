import { Given, When, Then } from '@cucumber/cucumber';
import { CollectionsPage } from '../../pages/empty-screens/collections.page.js';

const collections = (world) => new CollectionsPage(world.page);

Given('I navigate to Collections screen', async function () {
  await collections(this).navigateToCollections();
});

When('I search collections for {string}', async function (text) {
  await collections(this).search(text);
});

Then(
  'I verify collections empty state on {string} tab with primary {string} and supporting {string}',
  async function (tabName, primary, supporting) {
    await collections(this).clickTabAndVerifyEmptyState(tabName, primary, supporting);
  }
);

