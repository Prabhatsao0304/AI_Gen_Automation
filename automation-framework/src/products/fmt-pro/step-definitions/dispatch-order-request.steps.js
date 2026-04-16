import { Given, When, Then } from '@cucumber/cucumber';
import fs from 'fs/promises';
import path from 'path';
import { DispatchOrderRequestPage } from '../pages/dispatch-order-request.page.js';
import { PurchaseOrderRequestPage } from '../pages/purchase-order-request.page.js';
import { PoSupplierAcceptancePage } from '../pages/po-supplier-acceptance.page.js';
import { getPoContextFilePath, readLatestPoContext } from '../../../shared/utils/po-context.utils.js';

const runtimeDir = path.resolve(process.cwd(), 'reports', 'runtime');
const dispatchContextPath = path.join(runtimeDir, 'dispatch-context.json');

Given('I have a target PO number for dispatch order', async function () {
  const poNumberFromEnv =
    process.env.DISPATCH_PO_NUMBER ||
    process.env.SUPPLIER_ACCEPTANCE_PO_NUMBER ||
    process.env.SHP_APPROVAL_PO_NUMBER ||
    process.env.PO_NUMBER;
  const poDetailUrlFromEnv = process.env.DISPATCH_PO_DETAIL_URL || '';

  if (poNumberFromEnv && String(poNumberFromEnv).trim()) {
    this.targetPoNumber = String(poNumberFromEnv).trim();
    this.targetPoDetailUrl = String(poDetailUrlFromEnv).trim();
    await this.attach(`Using target PO Number from environment: ${this.targetPoNumber}`);
    if (this.targetPoDetailUrl) {
      await this.attach(`Using target PO detail URL from environment: ${this.targetPoDetailUrl}`);
    }
    return;
  }

  const poContext = await readLatestPoContext();
  const poNumberFromContext = String(poContext?.latestPoNumber || '').trim();
  const poDetailUrlFromContext = String(poContext?.poDetailUrl || '').trim();
  if (!poNumberFromContext) {
    throw new Error(
      `Missing target PO number for dispatch order. Set DISPATCH_PO_NUMBER / PO_NUMBER, or run request flow first so PO is saved at ${getPoContextFilePath()}.`
    );
  }

  this.targetPoNumber = poNumberFromContext;
  this.targetPoDetailUrl = poDetailUrlFromContext;
  await this.attach(
    `Using target PO Number from shared context: ${this.targetPoNumber} (source: ${poContext?.source || 'unknown'})`
  );
  if (this.targetPoDetailUrl) {
    await this.attach(`Using target PO detail URL from shared context: ${this.targetPoDetailUrl}`);
  }
});

When('I open the target PO details in FMT PRO for dispatch order', async function () {
  const dispatchOrderPage = new DispatchOrderRequestPage(this.page);
  const purchaseOrderRequestPage = new PurchaseOrderRequestPage(this.page);
  const supplierAcceptancePage = new PoSupplierAcceptancePage(this.page);
  await dispatchOrderPage.assertLoggedInToFmtPro();
  await purchaseOrderRequestPage.clickPurchaseOrderBottomTab();
  await purchaseOrderRequestPage.assertPurchaseOrderScreenVisible();
  if (this.targetPoDetailUrl) {
    const openedByUrl = await dispatchOrderPage.openPoDetailsByUrl(this.targetPoDetailUrl, this.targetPoNumber);
    if (openedByUrl) {
      return;
    }
  }
  try {
    await supplierAcceptancePage.openPoDetailsByNumber(this.targetPoNumber);
  } catch (error) {
    try {
      const fallbackPoNumber = await dispatchOrderPage.openFirstApprovedPoDetailsFromList();
      this.targetPoNumber = fallbackPoNumber;
      await this.attach(
        `Target PO not found in list. Fallback approved PO opened: ${fallbackPoNumber}`
      );
    } catch (fallbackError) {
      throw new Error(
        `Unable to open target PO "${this.targetPoNumber}" and fallback PO opening failed. ` +
          `Target error: ${error?.message || error}. ` +
          `Fallback error: ${fallbackError?.message || fallbackError}`
      );
    }
  }
});

When('I click Create Dispatch Order in FMT PRO', async function () {
  const dispatchOrderPage = new DispatchOrderRequestPage(this.page);
  await dispatchOrderPage.clickCreateDispatchOrder();
});

When(
  'I fill transport details vehicle {string} and driver mobile {string} in FMT PRO',
  async function (vehicleNumber, driverMobile) {
    const dispatchOrderPage = new DispatchOrderRequestPage(this.page);
    const nextVehicleNumber = await getNextVehicleNumber(vehicleNumber);
    this.dispatchVehicleNumber = nextVehicleNumber;
    await dispatchOrderPage.fillTransportDetails(nextVehicleNumber, driverMobile);
    await this.attach(`Using vehicle number for this run: ${nextVehicleNumber}`);
  }
);

When('I submit transport details in FMT PRO', async function () {
  const dispatchOrderPage = new DispatchOrderRequestPage(this.page);
  await dispatchOrderPage.submitTransportDetails();
});

Then('transport details should be added successfully in FMT PRO', async function () {
  const dispatchOrderPage = new DispatchOrderRequestPage(this.page);
  await dispatchOrderPage.assertTransportDetailsAdded();
});

When('I click Add Dispatch Details in FMT PRO', async function () {
  const dispatchOrderPage = new DispatchOrderRequestPage(this.page);
  await dispatchOrderPage.clickAddDispatchDetails();
});

When('I upload dispatch order documents in FMT PRO', async function () {
  const dispatchOrderPage = new DispatchOrderRequestPage(this.page);
  const uploadMode = String(process.env.DO_UPLOAD_MODE || 'manual_wait_next').trim().toLowerCase();

  if (uploadMode === 'auto') {
    const docPaths = {
      supplierInvoice:
        process.env.DO_SUPPLIER_INVOICE_PATH || '/Users/srinivaschitrali/Documents/Supplier Invoice 4.jpg',
      loadingWeightSlip:
        process.env.DO_LOADING_WEIGHT_SLIP_PATH || '/Users/srinivaschitrali/Documents/Loading Weight Slip 4 (1).jpg',
      billOfTransport:
        process.env.DO_BILL_OF_TRANSPORT_PATH || '/Users/srinivaschitrali/Documents/Bill of Transport (Primary).jpg',
      mandiTax9r: process.env.DO_MANDI_TAX_9R_PATH || '/Users/srinivaschitrali/Documents/9R 4.jpg',
      mandiTax9rGatepass:
        process.env.DO_MANDI_TAX_9R_GATEPASS_PATH || '/Users/srinivaschitrali/Documents/9R 4.jpg',
    };
    await this.attach('Dispatch upload mode: auto');
    await dispatchOrderPage.uploadDispatchDocuments(docPaths);
    return;
  }

  await this.attach(
    'Dispatch upload mode: manual_wait_next. Please upload all 5 docs manually; automation will continue when Next is enabled.'
  );
  await dispatchOrderPage.waitForDispatchDocsNextEnabled();
});

Then('dispatch order document uploads should be successful in FMT PRO', async function () {
  const dispatchOrderPage = new DispatchOrderRequestPage(this.page);
  await dispatchOrderPage.assertDispatchDocumentsAttached();
});

When('I proceed to dispatch charges form in FMT PRO', async function () {
  const dispatchOrderPage = new DispatchOrderRequestPage(this.page);
  await dispatchOrderPage.clickNextFromDispatchDocuments();
});

Then('net weight and number of bags should be auto-filled in FMT PRO', async function () {
  const dispatchOrderPage = new DispatchOrderRequestPage(this.page);
  const values = await dispatchOrderPage.readDispatchAutoFilledValues();
  await this.attach(
    `Dispatch auto-filled values -> Net Weight: ${values.netWeight}, No. of Bags: ${values.numberOfBags}`
  );
});

When(
  'I set bag deduction {string} and mandi tax {string} in FMT PRO dispatch form',
  async function (bagDeduction, mandiTax) {
    const dispatchOrderPage = new DispatchOrderRequestPage(this.page);
    await dispatchOrderPage.fillDispatchCharges({
      bagDeduction,
      mandiTax,
    });
  }
);

When('I submit dispatch order request in FMT PRO', async function () {
  const dispatchOrderPage = new DispatchOrderRequestPage(this.page);
  await dispatchOrderPage.submitDispatchOrderRequest();
});

async function getNextVehicleNumber(baseVehicleNumber) {
  const fromEnv = String(process.env.DO_VEHICLE_NUMBER || '').trim();
  const seedVehicle = fromEnv || String(baseVehicleNumber || '').trim();
  const context = await readDispatchContext();
  const previousVehicle = String(context?.lastVehicleNumber || '').trim();
  const sourceVehicle = previousVehicle || seedVehicle;

  const incremented = incrementTrailingNumber(sourceVehicle);
  await saveDispatchContext({ ...context, lastVehicleNumber: incremented, updatedAt: new Date().toISOString() });
  return incremented;
}

function incrementTrailingNumber(value) {
  const match = String(value || '').match(/^(.*?)(\d+)$/);
  if (!match) {
    throw new Error(`Vehicle number "${value}" must end with digits to auto-increment.`);
  }

  const prefix = match[1];
  const digits = match[2];
  const nextNumber = String(Number.parseInt(digits, 10) + 1).padStart(digits.length, '0');
  return `${prefix}${nextNumber}`;
}

async function readDispatchContext() {
  try {
    const raw = await fs.readFile(dispatchContextPath, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

async function saveDispatchContext(context) {
  await fs.mkdir(runtimeDir, { recursive: true });
  await fs.writeFile(dispatchContextPath, JSON.stringify(context, null, 2), 'utf8');
}
