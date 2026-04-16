import { Given, When, Then } from '@cucumber/cucumber';
import { PoSupplierAcceptancePage } from '../pages/po-supplier-acceptance.page.js';
import { getPoContextFilePath, readLatestPoContext } from '../../../shared/utils/po-context.utils.js';

Given('I have a target PO number for supplier acceptance', async function () {
  const poNumberFromEnv =
    process.env.SUPPLIER_ACCEPTANCE_PO_NUMBER || process.env.SHP_APPROVAL_PO_NUMBER || process.env.PO_NUMBER;

  if (poNumberFromEnv && String(poNumberFromEnv).trim()) {
    this.targetPoNumber = String(poNumberFromEnv).trim();
    await this.attach(`Using target PO Number from environment: ${this.targetPoNumber}`);
    return;
  }

  const poContext = await readLatestPoContext();
  const poNumberFromContext = String(poContext?.latestPoNumber || '').trim();
  if (!poNumberFromContext) {
    throw new Error(
      `Missing target PO number for supplier acceptance. Set SUPPLIER_ACCEPTANCE_PO_NUMBER / PO_NUMBER, or run request flow first so PO is saved at ${getPoContextFilePath()}.`
    );
  }

  this.targetPoNumber = poNumberFromContext;
  await this.attach(
    `Using target PO Number from shared context: ${this.targetPoNumber} (source: ${poContext?.source || 'unknown'})`
  );
});

When('I open the target PO details in FMT PRO for sharing', async function () {
  const supplierAcceptancePage = new PoSupplierAcceptancePage(this.page);
  await supplierAcceptancePage.assertLoggedInToFmtPro();
  await supplierAcceptancePage.openPurchaseOrderListInFmtPro();
  await supplierAcceptancePage.openPoDetailsByNumber(this.targetPoNumber);
});

When('I copy supplier link by clicking Share in FMT PRO', async function () {
  const supplierAcceptancePage = new PoSupplierAcceptancePage(this.page);
  this.supplierLink = await supplierAcceptancePage.copySupplierLinkFromShare();
  await this.attach(`Copied supplier link: ${this.supplierLink}`);
});

When('I open the copied supplier link in Farmart App', async function () {
  const supplierAcceptancePage = new PoSupplierAcceptancePage(this.page);
  if (!this.supplierLink) {
    throw new Error('Supplier link is empty. Ensure Share click step runs before opening supplier link.');
  }
  await supplierAcceptancePage.openSupplierLink(this.supplierLink);
});

When('I login in Farmart App with supplier mobile and otp', async function () {
  const supplierAcceptancePage = new PoSupplierAcceptancePage(this.page);
  const mobile = process.env.SUPPLIER_MOBILE || '9893096118';
  const otp = process.env.SUPPLIER_OTP || '000000';
  await supplierAcceptancePage.loginWithSupplierMobileOtp(mobile, otp);
});

When('I accept the PO in Farmart App', async function () {
  const supplierAcceptancePage = new PoSupplierAcceptancePage(this.page);
  await supplierAcceptancePage.acceptPoAsSupplier();
});

Then('supplier PO acceptance should be successful in Farmart App', async function () {
  const supplierAcceptancePage = new PoSupplierAcceptancePage(this.page);
  await supplierAcceptancePage.assertSupplierPoAccepted();
});
