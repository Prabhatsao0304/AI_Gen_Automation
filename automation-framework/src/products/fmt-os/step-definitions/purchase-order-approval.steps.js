import { Given, When, Then } from '@cucumber/cucumber';
import { PurchaseOrderPage } from '../pages/purchase-order.page.js';
import { getPoContextFilePath, readLatestPoContext } from '../../../shared/utils/po-context.utils.js';

Given('I have a target PO number for SHP approval in FMT OS', async function () {
  const poNumberFromEnv = process.env.SHP_APPROVAL_PO_NUMBER || process.env.PO_NUMBER;
  if (poNumberFromEnv && String(poNumberFromEnv).trim()) {
    this.targetPoNumber = String(poNumberFromEnv).trim();
    await this.attach(`Using target PO Number from environment: ${this.targetPoNumber}`);
    return;
  }

  const poContext = await readLatestPoContext();
  const poNumberFromContext = String(poContext?.latestPoNumber || '').trim();
  if (!poNumberFromContext) {
    throw new Error(
      `Missing SHP approval target PO number. Set SHP_APPROVAL_PO_NUMBER (preferred) or PO_NUMBER, or run FMT PRO PO request first so PO is saved at ${getPoContextFilePath()}.`
    );
  }

  this.targetPoNumber = poNumberFromContext;
  await this.attach(
    `Using target PO Number from shared context: ${this.targetPoNumber} (source: ${poContext?.source || 'unknown'})`
  );
});

When('I search and open the target PO from Review PO in FMT OS', async function () {
  const po = new PurchaseOrderPage(this.page);
  await po.searchAndOpenPoFromReview(this.targetPoNumber);
});

When('I approve the opened PO as SHP in FMT OS', async function () {
  const po = new PurchaseOrderPage(this.page);
  await po.approveOpenedPurchaseOrder();
});

Then('the target PO should move to approval pending stage in FMT OS', async function () {
  const po = new PurchaseOrderPage(this.page);
  await po.assertPoMovedAfterApproval(this.targetPoNumber);
});
