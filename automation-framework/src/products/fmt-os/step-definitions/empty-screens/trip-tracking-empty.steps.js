import { Given, When, Then } from '@cucumber/cucumber';
import { TripTrackingPage } from '../../pages/empty-screens/trip-tracking.page.js';

const tripTracking = (world) => new TripTrackingPage(world.page);

Given('I navigate to Trip Tracking screen', async function () {
  await tripTracking(this).navigateToTripTracking();
});

When('I search trip tracking for {string}', async function (text) {
  await tripTracking(this).search(text);
});

Then(
  'I verify trip tracking empty state on {string} tab with primary {string} and supporting {string}',
  async function (tabName, primary, supporting) {
    await tripTracking(this).clickTabAndVerifyEmptyState(tabName, primary, supporting);
  }
);

