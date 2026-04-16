import { Given, When, Then } from '@cucumber/cucumber';
import { PurchaseOrderRequestPage } from '../pages/purchase-order-request.page.js';
import { saveLatestPoContext } from '../../../shared/utils/po-context.utils.js';

Given('I am logged in to FMT PRO', async function () {
  const purchaseOrderRequestPage = new PurchaseOrderRequestPage(this.page);
  await purchaseOrderRequestPage.assertLoggedInToFmtPro();
});

When('I click Purchase Order bottom tab in FMT PRO', async function () {
  const purchaseOrderRequestPage = new PurchaseOrderRequestPage(this.page);
  await purchaseOrderRequestPage.clickPurchaseOrderBottomTab();
});

When('I click Create Purchase Order plus icon in FMT PRO', async function () {
  const purchaseOrderRequestPage = new PurchaseOrderRequestPage(this.page);
  await purchaseOrderRequestPage.clickCreatePurchaseOrderPlusIcon();
});

When('I click Select Supplier dropdown in FMT PRO', async function () {
  const purchaseOrderRequestPage = new PurchaseOrderRequestPage(this.page);
  await purchaseOrderRequestPage.clickSelectSupplierDropdown();
});

When('I select supplier {string} in FMT PRO', async function (supplierName) {
  const purchaseOrderRequestPage = new PurchaseOrderRequestPage(this.page);
  this.selectedSupplier = supplierName;
  await purchaseOrderRequestPage.selectSupplierFromBottomSheet(supplierName);
});

When('I click Next in Purchase Order Request form in FMT PRO', async function () {
  const purchaseOrderRequestPage = new PurchaseOrderRequestPage(this.page);
  await purchaseOrderRequestPage.clickNextInCreatePurchaseOrderForm();
});

When('I select crop {string} and variety {string} in FMT PRO', async function (cropName, varietyName) {
  const purchaseOrderRequestPage = new PurchaseOrderRequestPage(this.page);
  await purchaseOrderRequestPage.selectCropAndVariety(cropName, varietyName);
});

When('I enter PO quantity {string} in FMT PRO', async function (quantity) {
  const purchaseOrderRequestPage = new PurchaseOrderRequestPage(this.page);
  await purchaseOrderRequestPage.enterPoQuantity(quantity);
});

When('I select packaging type {string} in FMT PRO', async function (packagingType) {
  const purchaseOrderRequestPage = new PurchaseOrderRequestPage(this.page);
  await purchaseOrderRequestPage.selectPackagingType(packagingType);
});

When('I select order type {string} in FMT PRO', async function (orderType) {
  const purchaseOrderRequestPage = new PurchaseOrderRequestPage(this.page);
  await purchaseOrderRequestPage.selectOrderType(orderType);
});

When('I select today\'s date in Expected Delivery in FMT PRO', async function () {
  const purchaseOrderRequestPage = new PurchaseOrderRequestPage(this.page);
  await purchaseOrderRequestPage.selectTodayExpectedDeliveryDate();
});

When('I select {string} in quality claim and unloading charge sections in FMT PRO', async function (value) {
  const purchaseOrderRequestPage = new PurchaseOrderRequestPage(this.page);
  await purchaseOrderRequestPage.selectBorneBySections(value);
});

When(
  'I fill payment terms loading {string} unloading {string} and buyer claim {string} in FMT PRO',
  async function (loadingValue, unloadingValue, buyerClaimValue) {
    const purchaseOrderRequestPage = new PurchaseOrderRequestPage(this.page);
    await purchaseOrderRequestPage.fillPaymentTerms(loadingValue, unloadingValue, buyerClaimValue);
  }
);

When('I click Next to continue from payment terms in FMT PRO', async function () {
  const purchaseOrderRequestPage = new PurchaseOrderRequestPage(this.page);
  await purchaseOrderRequestPage.clickNextInCreatePurchaseOrderForm();
});

When('I enter supplier price {string} in FMT PRO', async function (price) {
  const purchaseOrderRequestPage = new PurchaseOrderRequestPage(this.page);
  await purchaseOrderRequestPage.enterSupplierPrice(price);
});

When('I enter bag deduction {string} in FMT PRO', async function (value) {
  const purchaseOrderRequestPage = new PurchaseOrderRequestPage(this.page);
  await purchaseOrderRequestPage.enterBagDeduction(value);
});

When('I set mandi tax to {string} in FMT PRO', async function (option) {
  const purchaseOrderRequestPage = new PurchaseOrderRequestPage(this.page);
  await purchaseOrderRequestPage.setMandiTax(option);
});

When('I submit Purchase Order Request in FMT PRO', async function () {
  const purchaseOrderRequestPage = new PurchaseOrderRequestPage(this.page);
  await purchaseOrderRequestPage.submitCreatePurchaseOrder();
});

When('I click View PO summary in FMT PRO', async function () {
  const purchaseOrderRequestPage = new PurchaseOrderRequestPage(this.page);
  await purchaseOrderRequestPage.clickViewPoSummary();
});

Then('Purchase Order screen should be visible in FMT PRO', async function () {
  const purchaseOrderRequestPage = new PurchaseOrderRequestPage(this.page);
  await purchaseOrderRequestPage.assertPurchaseOrderScreenVisible();
});

Then('Purchase Order Request form should be visible in FMT PRO', async function () {
  const purchaseOrderRequestPage = new PurchaseOrderRequestPage(this.page);
  await purchaseOrderRequestPage.assertCreatePurchaseOrderFormVisible();
});

Then('selected supplier should be visible in Purchase Order Request form in FMT PRO', async function () {
  const purchaseOrderRequestPage = new PurchaseOrderRequestPage(this.page);
  await purchaseOrderRequestPage.assertSelectedSupplierVisible(this.selectedSupplier || 'vimal traders');
});

Then('Purchase Order Request form should continue after supplier selection in FMT PRO', async function () {
  const purchaseOrderRequestPage = new PurchaseOrderRequestPage(this.page);
  await purchaseOrderRequestPage.assertCreatePurchaseOrderFlowContinued();
});

Then('Purchase Order successful screen should be visible in FMT PRO', async function () {
  const purchaseOrderRequestPage = new PurchaseOrderRequestPage(this.page);
  await purchaseOrderRequestPage.assertPurchaseOrderSuccessfulScreenVisible();
});

Then('I capture PO number from PO details screen in FMT PRO', async function () {
  const purchaseOrderRequestPage = new PurchaseOrderRequestPage(this.page);
  this.poNumber = await purchaseOrderRequestPage.capturePoNumberFromPoDetailsScreen();
  this.poDetailUrl = this.page.url();
  process.env.PO_NUMBER = this.poNumber;
  const { filePath } = await saveLatestPoContext({
    poNumber: this.poNumber,
    poDetailUrl: this.poDetailUrl,
    source: 'fmt-pro-purchase-order-request',
  });
  await this.attach(`Captured PO Number: ${this.poNumber}`);
  await this.attach(`Captured PO detail URL: ${this.poDetailUrl}`);
  await this.attach(`Saved PO Number for cross-flow usage: ${this.poNumber} (${filePath})`);
});
