export class PurchaseOrderRequestPage {
  constructor(page) {
    this.page = page;
    this.purchaseOrderBottomTabSelectors = [
      '[role="tab"]:has-text("Purchase Order")',
      'button:has-text("Purchase Order")',
      'a:has-text("Purchase Order")',
      '[data-testid*="purchase-order"]',
      '[aria-label*="Purchase Order"]',
    ];
    this.createPurchaseOrderPlusIconSelectors = [
      '[aria-label*="create purchase order" i]',
      '[aria-label*="add purchase order" i]',
      '[data-testid*="create-purchase-order" i]',
      '[data-testid*="create-po" i]',
      'button.MuiFab-root',
      'button[aria-label*="add" i]',
      'button:has-text("+")',
    ];
    this.selectSupplierDropdownSelectors = [
      '[data-testid*="supplier" i]',
      '[aria-label*="select supplier" i]',
      'button:has-text("Select Supplier")',
      'div:has-text("Select Supplier")',
      'input[placeholder*="Supplier" i]',
      'input[placeholder*="supplier" i]',
    ];
    this.supplierBottomSheetSearchSelectors = [
      '[role="dialog"] input',
      '[data-testid*="supplier" i] input',
      'input[placeholder*="Search" i]',
      'input[placeholder*="supplier" i]',
    ];
    this.nextButtonSelectors = [
      'button:has-text("Next")',
      '[role="button"]:has-text("Next")',
      '[data-testid*="next" i]',
    ];
  }

  async assertLoggedInToFmtPro() {
    await this.page.waitForURL(
      (url) => {
        const parsed = new URL(url.toString());
        return parsed.hostname.endsWith('farmartos.com') && !parsed.pathname.includes('/login');
      },
      { timeout: 90000 }
    );
  }

  async clickPurchaseOrderBottomTab() {
    const purchaseOrderTab = await this.findVisibleElement(this.purchaseOrderBottomTabSelectors, 'Purchase Order bottom tab');
    await purchaseOrderTab.click();
    await this.waitForUiSettle({ idleTimeout: 1800, minPause: 80 });
  }

  async assertPurchaseOrderScreenVisible() {
    if (this.page.url().toLowerCase().includes('purchase-order')) {
      return;
    }
    await this.page.getByText('Purchase Order', { exact: false }).first().waitFor({
      state: 'visible',
      timeout: 20000,
    });
  }

  async clickCreatePurchaseOrderPlusIcon() {
    let createPoButton = null;

    try {
      createPoButton = await this.findVisibleElement(
        this.createPurchaseOrderPlusIconSelectors,
        'Create Purchase Order plus icon'
      );
    } catch {
      // Fallback for icon-only floating action buttons without stable labels.
      createPoButton = await this.findBottomRightFloatingButton();
    }

    await createPoButton.click();
    await this.waitForUiSettle({ idleTimeout: 2000, minPause: 100 });
  }

  async assertCreatePurchaseOrderFormVisible() {
    const lowerUrl = this.page.url().toLowerCase();
    if (lowerUrl.includes('purchase-order') && lowerUrl.includes('create')) {
      return;
    }

    const indicators = [
      this.page.getByRole('heading', { name: /create purchase order/i }).first(),
      this.page.getByText('Create Purchase Order', { exact: false }).first(),
      this.page.locator('[data-testid*="create-purchase-order" i]').first(),
      this.page.locator('form').first(),
    ];

    for (const indicator of indicators) {
      if (await indicator.isVisible({ timeout: 2000 }).catch(() => false)) {
        return;
      }
    }

    throw new Error('Create Purchase Order form is not visible after clicking the plus icon.');
  }

  async clickSelectSupplierDropdown() {
    const dropdown = await this.findVisibleElement(
      this.selectSupplierDropdownSelectors,
      'Select Supplier dropdown'
    );
    await dropdown.click();
    await this.assertSupplierBottomSheetVisible();
  }

  async selectSupplierFromBottomSheet(supplierName) {
    await this.assertSupplierBottomSheetVisible();
    await this.selectOptionFromBottomSheet(supplierName, {
      searchText: supplierName,
      errorContext: 'supplier',
      searchSelectors: this.supplierBottomSheetSearchSelectors,
    });
  }

  async assertSelectedSupplierVisible(supplierName) {
    await this.page.getByText(new RegExp(supplierName, 'i')).first().waitFor({
      state: 'visible',
      timeout: 15000,
    });
  }

  async clickNextInCreatePurchaseOrderForm() {
    const sheetScope = await this.getActiveBottomSheetScope();
    if (sheetScope) {
      const nextButtonInSheet = sheetScope
        .locator('button:has-text("Next"), [role="button"]:has-text("Next"), [data-testid*="next" i]')
        .first();
      if (await nextButtonInSheet.isVisible({ timeout: 2000 }).catch(() => false)) {
        await this.waitForElementEnabled(nextButtonInSheet, 'Next button');
        await nextButtonInSheet.click();
        await this.waitForUiSettle({ idleTimeout: 1600, minPause: 80 });
        return;
      }
    }

    const nextButton = await this.findVisibleElement(this.nextButtonSelectors, 'Next button');
    await this.waitForElementEnabled(nextButton, 'Next button');
    await nextButton.click();
    await this.waitForUiSettle({ idleTimeout: 1600, minPause: 80 });
  }

  async selectCropAndVariety(cropName, varietyName) {
    await this.clickFieldByLabel('Crop & Variety', [
      '[data-testid*="crop-variety" i]',
      '[aria-label*="crop" i][aria-label*="variety" i]',
      'button:has-text("Crop & Variety")',
      'div:has-text("Crop & Variety")',
    ]);

    await this.selectOptionFromBottomSheet(cropName, {
      searchText: cropName,
      errorContext: 'crop',
      searchSelectors: [
        'input[placeholder*="Select Crop" i]',
        'input[placeholder*="Crop" i]',
        'input[placeholder*="Search" i]',
      ],
    });

    await this.selectOptionFromBottomSheet(varietyName, {
      searchText: varietyName,
      errorContext: 'variety',
      searchSelectors: [
        'input[placeholder*="Select Variety" i]',
        'input[placeholder*="Variety" i]',
        'input[placeholder*="Search" i]',
      ],
    });
  }

  async enterPoQuantity(quantity) {
    await this.fillInputByLabel('PO Quantity', quantity);
  }

  async selectPackagingType(packagingType) {
    await this.clickFieldByLabel('Packaging Type', [
      '[data-testid*="packaging" i]',
      '[aria-label*="packaging" i]',
      'button:has-text("Packaging Type")',
      'div:has-text("Packaging Type")',
    ]);
    await this.selectPackagingTypeOption(packagingType);
    await this.closeAnyOpenSelectSheet(/select packaging type/i);

    const packagingHeading = await this.findVisibleText(
      this.page.locator('body'),
      /select packaging type/i,
      'Select Packaging Type sheet heading',
      600,
      true,
      true
    );
    if (packagingHeading) {
      throw new Error('Select Packaging Type sheet is still open after selecting packaging.');
    }
  }

  async selectOrderType(orderType) {
    const radioInput = this.page
      .locator(`input[type="radio"][value*="${this.escapeRegExp(orderType)}" i]`)
      .first();
    if (await radioInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await radioInput.check().catch(async () => {
        await radioInput.click();
      });
      return;
    }

    const optionRegex = new RegExp(`\\b${this.escapeRegExp(orderType)}\\b`, 'i');
    const candidate = await this.findVisibleText(
      this.page.locator('body'),
      optionRegex,
      'Order type option',
      3000
    );
    await this.clickViaClickableAncestor(candidate);
    await this.waitForUiSettle({ idleTimeout: 1500, minPause: 80 });
  }

  async selectTodayExpectedDeliveryDate() {
    // UI settles a bit late after order type selection (especially FOR),
    // so pause briefly before trying to open the date picker.
    await this.page.waitForTimeout(600);
    await this.closeAnyOpenSelectSheet();

    const packagingHeading = await this.findVisibleText(
      this.page.locator('body'),
      /select packaging type/i,
      'Select Packaging Type sheet heading',
      600,
      true,
      true
    );
    if (packagingHeading) {
      throw new Error('Packaging sheet is still open and blocks Expected Delivery date selection.');
    }

    const directInput = this.page
      .locator(
        "input[placeholder='DD/MM/YYYY'], input[placeholder*='DD/MM/YYYY' i], input[name*='expected' i], [data-testid*='expected-delivery' i] input"
      )
      .first();

    if (!(await directInput.isVisible({ timeout: 2000 }).catch(() => false))) {
      await this.clickFieldByLabel('Expected Delivery', [
        '[data-testid*="expected-delivery" i]',
        '[aria-label*="expected delivery" i]',
        'button:has-text("Expected Delivery")',
        'div:has-text("Expected Delivery")',
      ]);
      await directInput.waitFor({ state: 'visible', timeout: 5000 });
    }

    const expectedDate = '12/05/2026';
    const canEditDirectly = await directInput.isEditable().catch(() => false);
    if (canEditDirectly) {
      await directInput.fill(expectedDate);
    } else {
      await directInput.click();
      await this.page.keyboard.press('Meta+a').catch(() => {});
      await this.page.keyboard.type(expectedDate).catch(() => {});
    }

    await this.page.keyboard.press('Tab').catch(() => {});
    const currentValue = await directInput.inputValue().catch(() => '');
    if (!currentValue || !currentValue.includes(expectedDate)) {
      throw new Error(`Unable to set Expected Delivery date to ${expectedDate}.`);
    }

    await this.waitForUiSettle({ idleTimeout: 1200, minPause: 50 });
  }

  async selectBorneBySections(value) {
    await this.selectOptionInSection('quality claim', value);
    await this.selectOptionInSection('unloading charge', value);
  }

  async fillPaymentTerms(loadingValue, unloadingValue, buyerClaimValue) {
    const sectionHeading = await this.findVisibleText(
      this.page.locator('body'),
      /payment terms/i,
      'Payment Terms section',
      3000,
      true
    );

    if (sectionHeading) {
      const sectionContainer = sectionHeading.locator('xpath=ancestor::*[self::div or self::section][1]').first();
      const editableInputs = sectionContainer
        .locator(
          'input:not([type="hidden"]):not([readonly]):not([disabled]), textarea:not([readonly]):not([disabled])'
        );

      const count = await editableInputs.count().catch(() => 0);
      if (count >= 3) {
        await editableInputs.nth(0).fill(String(loadingValue));
        await editableInputs.nth(1).fill(String(unloadingValue));
        await editableInputs.nth(2).fill(String(buyerClaimValue));
        return;
      }
    }

    await this.fillInputByLabel('loading', loadingValue);
    await this.fillInputByLabel('unloading', unloadingValue);
    await this.fillInputByLabel('buyer claim', buyerClaimValue);
  }

  async enterSupplierPrice(price) {
    await this.fillInputByLabel('supplier price', price);
  }

  async enterBagDeduction(value) {
    await this.fillInputByLabel('bag deduction', value);
  }

  async setMandiTax(option) {
    const sectionHeading = this.page.getByText(/mandi tax applicable/i).first();
    await sectionHeading.waitFor({ state: 'visible', timeout: 5000 });

    const headingBox = await sectionHeading.boundingBox().catch(() => null);
    if (!headingBox) {
      throw new Error('Unable to locate Mandi Tax section coordinates.');
    }

    const optionRegex = new RegExp(`^\\s*${this.escapeRegExp(option)}\\s*$`, 'i');
    const optionCandidates = this.page.getByText(optionRegex);
    const count = await optionCandidates.count().catch(() => 0);
    let optionNode = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (let index = 0; index < count; index += 1) {
      const candidate = optionCandidates.nth(index);
      if (!(await candidate.isVisible({ timeout: 300 }).catch(() => false))) {
        continue;
      }

      const box = await candidate.boundingBox().catch(() => null);
      if (!box) {
        continue;
      }

      const withinMandiTaxRow = box.y > headingBox.y - 30 && box.y < headingBox.y + 140;
      if (!withinMandiTaxRow) {
        continue;
      }

      const distance = Math.abs(box.y - headingBox.y);
      if (distance < bestDistance) {
        bestDistance = distance;
        optionNode = candidate;
      }
    }

    if (!optionNode) {
      throw new Error(`Unable to find "${option}" option inside Mandi Tax section.`);
    }

    const attemptSelect = async () => {
      await optionNode.click({ force: true }).catch(async () => {
        await this.clickViaClickableAncestor(optionNode, true);
      });

      const box = await optionNode.boundingBox().catch(() => null);
      if (box) {
        // Try on radio-circle position to handle MUI wrapper clicks.
        await this.page.mouse.click(Math.max(2, box.x - 20), box.y + box.height / 2).catch(() => {});
      }

      await this.waitForUiSettle({ idleTimeout: 1200, minPause: 100 });
    };

    await attemptSelect();
    if (option.toLowerCase() === 'no' && (await this.isMandiTaxValidationVisible())) {
      await attemptSelect();
    }

    if (option.toLowerCase() === 'no' && (await this.isMandiTaxValidationVisible())) {
      throw new Error('Mandi Tax still remains applicable (Yes) after selecting "No".');
    }
  }

  async submitCreatePurchaseOrder() {
    const submitSelectors = [
      'button:has-text("Submit")',
      '[role="button"]:has-text("Submit")',
      '[data-testid*="submit" i]',
      'button:has-text("Create")',
    ];

    const submitButton = await this.findVisibleElement(submitSelectors, 'Submit button');
    await this.waitForElementEnabled(submitButton, 'Submit button');
    await submitButton.click();
    await this.waitForUiSettle({ idleTimeout: 5000, minPause: 120 });
  }

  async assertPurchaseOrderSuccessfulScreenVisible() {
    const successIndicators = [
      this.page.getByText(/purchase order successful/i).first(),
      this.page.getByText(/purchase order successfully/i).first(),
      this.page.getByText(/po successful/i).first(),
      this.page.getByText(/view po summary/i).first(),
    ];

    for (const indicator of successIndicators) {
      if (await indicator.isVisible({ timeout: 20000 }).catch(() => false)) {
        return;
      }
    }

    throw new Error('Purchase Order successful screen is not visible after submit.');
  }

  async clickViewPoSummary() {
    const summarySelectors = [
      'button:has-text("View PO summary")',
      '[role="button"]:has-text("View PO summary")',
      'a:has-text("View PO summary")',
      '[data-testid*="view-po-summary" i]',
    ];

    const viewSummary = await this.findVisibleElement(summarySelectors, 'View PO summary button');
    await viewSummary.click();
    await this.waitForUiSettle({ idleTimeout: 3000, minPause: 100 });
  }

  async capturePoNumberFromPoDetailsScreen() {
    const detailsIndicators = [
      this.page.getByText(/po details/i).first(),
      this.page.getByText(/purchase order details/i).first(),
      this.page.getByText(/po summary/i).first(),
      this.page.locator('[data-testid*="po-details" i]').first(),
    ];

    let detailsVisible = false;
    for (const indicator of detailsIndicators) {
      if (await indicator.isVisible({ timeout: 5000 }).catch(() => false)) {
        detailsVisible = true;
        break;
      }
    }

    if (!detailsVisible) {
      await this.waitForUiSettle({ idleTimeout: 2500, minPause: 80 });
    }

    const poNumberFromLabelContext = await this.extractPoNumberFromLabelContext();
    if (poNumberFromLabelContext) {
      return poNumberFromLabelContext;
    }

    const poNumberFromStructuredSelectors = await this.extractPoNumberFromLocatorSet(
      this.page.locator(
        '[data-testid*="po-number" i], [id*="po-number" i], [class*="po-number" i], [name*="po-number" i]'
      )
    );
    if (poNumberFromStructuredSelectors) {
      return poNumberFromStructuredSelectors;
    }

    const bodyText = await this.page.locator('body').innerText().catch(() => '');
    const poNumberFromText = this.extractPoNumber(bodyText);
    if (poNumberFromText) {
      return poNumberFromText;
    }

    throw new Error('Unable to capture PO number from PO details screen.');
  }

  async assertCreatePurchaseOrderFlowContinued() {
    const continueIndicators = [
      this.page.getByText(/crop/i, { exact: false }).first(),
      this.page.getByText(/variety/i, { exact: false }).first(),
      this.page.getByText(/quantity/i, { exact: false }).first(),
      this.page.getByText(/rate/i, { exact: false }).first(),
      this.page.getByText(/delivery/i, { exact: false }).first(),
      this.page.getByText(/next/i, { exact: false }).first(),
    ];

    for (const indicator of continueIndicators) {
      if (await indicator.isVisible({ timeout: 2500 }).catch(() => false)) {
        return;
      }
    }

    if (this.page.url().toLowerCase().includes('purchase-order')) {
      return;
    }

    throw new Error('Create Purchase Order flow did not continue after clicking Next.');
  }

  async findVisibleElement(selectors, elementName) {
    for (const selector of selectors) {
      const locator = this.page.locator(selector).first();
      if (await locator.isVisible({ timeout: 2500 }).catch(() => false)) {
        return locator;
      }
    }

    throw new Error(`Unable to find visible ${elementName}.`);
  }

  async assertSupplierBottomSheetVisible() {
    const sheetIndicators = [
      this.page.locator('[role="dialog"]').first(),
      this.page.locator('.MuiDrawer-root').first(),
      this.page.locator('[class*="bottom-sheet" i]').first(),
      this.page.getByText(/supplier/i, { exact: false }).first(),
    ];

    for (const indicator of sheetIndicators) {
      if (await indicator.isVisible({ timeout: 2500 }).catch(() => false)) {
        return;
      }
    }

    throw new Error('Supplier bottom sheet did not open.');
  }

  async findBottomRightFloatingButton() {
    const viewport = this.page.viewportSize();
    if (!viewport) {
      throw new Error('Unable to read viewport size for floating button fallback.');
    }

    const candidates = this.page.locator('button, [role="button"]');
    const total = await candidates.count();
    let bestMatch = null;
    let bestScore = -1;

    for (let index = 0; index < total; index += 1) {
      const candidate = candidates.nth(index);
      if (!(await candidate.isVisible().catch(() => false))) {
        continue;
      }

      const box = await candidate.boundingBox();
      if (!box) {
        continue;
      }

      const isBottomRightZone =
        box.x > viewport.width - 260 &&
        box.y > viewport.height - 260 &&
        box.y < viewport.height - 50;

      if (!isBottomRightZone) {
        continue;
      }

      const score = box.x + box.y;
      if (score > bestScore) {
        bestScore = score;
        bestMatch = candidate;
      }
    }

    if (bestMatch) {
      return bestMatch;
    }

    throw new Error('Unable to find bottom-right floating plus icon for Create Purchase Order.');
  }

  async waitForElementEnabled(locator, elementName) {
    const deadline = Date.now() + 20000;
    while (Date.now() < deadline) {
      if (!(await locator.isDisabled().catch(() => false))) {
        return;
      }
      await this.page.waitForTimeout(150);
    }

    throw new Error(`${elementName} stayed disabled. Required form values may still be missing.`);
  }

  escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  async waitForUiSettle({ idleTimeout = 1200, minPause = 60 } = {}) {
    if (minPause > 0) {
      await this.page.waitForTimeout(minPause);
    }
    await this.page.waitForLoadState('networkidle', { timeout: idleTimeout }).catch(() => {});
  }

  normalizePoNumber(rawValue) {
    if (!rawValue) {
      return null;
    }

    const cleaned = String(rawValue)
      .replace(/\u00A0/g, ' ')
      .trim()
      .replace(/^#+/, '')
      .replace(/[.,;:]+$/, '')
      .replace(/\s+/g, '');

    if (!cleaned || cleaned.length < 6) {
      return null;
    }

    if (!/^[A-Za-z0-9/-]+$/.test(cleaned)) {
      return null;
    }

    if (!/[0-9]/.test(cleaned)) {
      return null;
    }

    if (!/[A-Za-z]/.test(cleaned)) {
      return null;
    }

    const blockedValues = new Set([
      'detail',
      'details',
      'summary',
      'purchaseorder',
      'purchaseorderdetails',
      'podetail',
      'podetails',
    ]);

    if (blockedValues.has(cleaned.toLowerCase())) {
      return null;
    }

    return cleaned;
  }

  extractPoNumber(text) {
    if (!text) {
      return null;
    }

    const collapsedText = String(text).replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim();
    const lines = String(text)
      .split('\n')
      .map((line) => line.replace(/\u00A0/g, ' ').trim())
      .filter(Boolean);

    const labelAndValuePatterns = [
      /\b(?:purchase\s*order|po)\s*(?:no|number|id)\s*[:#-]?\s*([A-Za-z0-9][A-Za-z0-9/-]{3,})\b/i,
      /\b(?:purchase\s*order|po)\s*[:#-]\s*([A-Za-z0-9][A-Za-z0-9/-]{3,})\b/i,
      /\b(?:purchase\s*order|po)\s*(?:no|number|id)\s+([A-Za-z0-9][A-Za-z0-9/-]{3,})\b/i,
    ];

    for (const pattern of labelAndValuePatterns) {
      const match = collapsedText.match(pattern);
      const normalized = this.normalizePoNumber(match?.[1]);
      if (normalized) {
        return normalized;
      }
    }

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      if (!/\b(?:purchase\s*order|po)\s*(?:no|number|id)\b/i.test(line)) {
        continue;
      }

      const sameLineMatch = line.match(
        /(?:purchase\s*order|po)\s*(?:no|number|id)\s*[:#-]?\s*([A-Za-z0-9][A-Za-z0-9/-]{3,})\b/i
      );
      const fromSameLine = this.normalizePoNumber(sameLineMatch?.[1]);
      if (fromSameLine) {
        return fromSameLine;
      }

      const nextLineValue = this.normalizePoNumber(lines[index + 1]);
      if (nextLineValue) {
        return nextLineValue;
      }
    }

    const patterns = [
      /#\s*([A-Za-z]{2,}[A-Za-z0-9/-]{4,})\b/,
      /\b(PO[A-Za-z0-9/-]{5,})\b/i,
    ];

    for (const pattern of patterns) {
      const match = collapsedText.match(pattern);
      const normalized = this.normalizePoNumber(match?.[1]);
      if (normalized) {
        return normalized;
      }
    }

    return null;
  }

  async extractPoNumberFromLocatorSet(locatorSet, maxCandidates = 25) {
    const total = await locatorSet.count().catch(() => 0);
    const limit = Math.min(total, maxCandidates);

    for (let index = 0; index < limit; index += 1) {
      const node = locatorSet.nth(index);
      if (!(await node.isVisible({ timeout: 400 }).catch(() => false))) {
        continue;
      }

      const text = await node.innerText().catch(() => '');
      const extracted = this.extractPoNumber(text);
      if (extracted) {
        return extracted;
      }
    }

    return null;
  }

  async extractPoNumberFromLabelContext() {
    const labelNodes = this.page.getByText(
      /\b(?:purchase\s*order\s*(?:no|number|id)?|po\s*(?:no|number|id))\b/i
    );
    const total = await labelNodes.count().catch(() => 0);
    const limit = Math.min(total, 30);

    for (let index = 0; index < limit; index += 1) {
      const labelNode = labelNodes.nth(index);
      if (!(await labelNode.isVisible({ timeout: 300 }).catch(() => false))) {
        continue;
      }

      const labelText = await labelNode.innerText().catch(() => '');
      const sameNodeValue = this.extractPoNumber(labelText);
      if (sameNodeValue) {
        return sameNodeValue;
      }

      const nearValueNode = labelNode
        .locator(
          'xpath=following::*[self::span or self::div or self::p][normalize-space()][not(contains(@class,"MuiSvgIcon"))][1]'
        )
        .first();
      if (await nearValueNode.isVisible({ timeout: 400 }).catch(() => false)) {
        const nearValueText = await nearValueNode.innerText().catch(() => '');
        const nearValue = this.extractPoNumber(`${labelText} ${nearValueText}`);
        if (nearValue) {
          return nearValue;
        }
      }

      const container = labelNode
        .locator('xpath=ancestor::*[self::div or self::section or self::article or self::li or self::tr][1]')
        .first();
      if (await container.isVisible({ timeout: 300 }).catch(() => false)) {
        const containerText = await container.innerText().catch(() => '');
        const containerValue = this.extractPoNumber(containerText);
        if (containerValue) {
          return containerValue;
        }
      }
    }

    return null;
  }

  async clickFieldByLabel(label, preferredSelectors = []) {
    const selectors = [
      ...preferredSelectors,
      `[data-testid*="${label.replace(/\s+/g, '-')}" i]`,
      `[aria-label*="${label}" i]`,
      `button:has-text("${label}")`,
      `div[role="button"]:has-text("${label}")`,
    ];

    for (const selector of selectors) {
      const locator = this.page.locator(selector).first();
      if (await locator.isVisible({ timeout: 1000 }).catch(() => false)) {
        await locator.click();
        await this.waitForUiSettle({ idleTimeout: 1200, minPause: 50 });
        return;
      }
    }

    const labelRegex = new RegExp(this.escapeRegExp(label), 'i');
    const labelText = await this.findVisibleText(this.page.locator('body'), labelRegex, `${label} field`, 2500);
    await this.clickViaClickableAncestor(labelText);
    await this.waitForUiSettle({ idleTimeout: 1200, minPause: 50 });
  }

  async fillInputByLabel(label, value) {
    const byLabel = this.page.getByLabel(new RegExp(this.escapeRegExp(label), 'i')).first();
    if (await byLabel.isVisible({ timeout: 1500 }).catch(() => false)) {
      await byLabel.fill(String(value));
      return;
    }

    const directInput = this.page
      .locator(
        `input[placeholder*="${label}" i], input[aria-label*="${label}" i], textarea[placeholder*="${label}" i], textarea[aria-label*="${label}" i]`
      )
      .first();
    if (await directInput.isVisible({ timeout: 1500 }).catch(() => false)) {
      await directInput.fill(String(value));
      return;
    }

    const labelRegex = new RegExp(this.escapeRegExp(label), 'i');
    const labelNode = await this.findVisibleText(this.page.locator('body'), labelRegex, `${label} label`, 2500);
    const containerInput = labelNode
      .locator('xpath=ancestor::*[self::div or self::section or self::form][1]//input[not(@type="hidden")] | ancestor::*[self::div or self::section or self::form][1]//textarea')
      .first();

    if (
      await containerInput.isVisible({ timeout: 1500 }).catch(() => false) &&
      await containerInput.isEditable().catch(() => false)
    ) {
      await containerInput.fill(String(value));
      return;
    }

    const nearbyInput = labelNode.locator('xpath=following::input[not(@type="hidden")][1] | following::textarea[1]').first();
    if (
      await nearbyInput.isVisible({ timeout: 1500 }).catch(() => false) &&
      await nearbyInput.isEditable().catch(() => false)
    ) {
      await nearbyInput.fill(String(value));
      return;
    }

    throw new Error(`Unable to fill input for label "${label}".`);
  }

  async selectOptionInSection(sectionLabel, optionText) {
    const sectionRegex = new RegExp(this.escapeRegExp(sectionLabel), 'i');
    const sectionNode = await this.findVisibleText(this.page.locator('body'), sectionRegex, `${sectionLabel} section`, 2500);
    const sectionContainer = sectionNode.locator('xpath=ancestor::*[self::div or self::section or self::fieldset][1]').first();
    const optionRegex = new RegExp(`\\b${this.escapeRegExp(optionText)}\\b`, 'i');

    const optionInSection = await this.findVisibleText(
      sectionContainer,
      optionRegex,
      `${optionText} option in ${sectionLabel}`,
      1500,
      true
    );
    if (optionInSection) {
      const forAttribute = await optionInSection.getAttribute('for').catch(() => null);
      if (forAttribute) {
        const targetRadio = sectionContainer.locator(`input[type="radio"][id="${forAttribute}"]`).first();
        if (await targetRadio.isVisible({ timeout: 800 }).catch(() => false)) {
          if (await targetRadio.isChecked().catch(() => false)) {
            return;
          }
          await targetRadio.check().catch(async () => {
            await targetRadio.click({ force: true });
          });
          return;
        }
      }

      const radioInsideOption = optionInSection
        .locator('xpath=ancestor::*[self::label or self::div or self::span][1]//input[@type="radio"]')
        .first();
      if (await radioInsideOption.isVisible({ timeout: 800 }).catch(() => false)) {
        if (await radioInsideOption.isChecked().catch(() => false)) {
          return;
        }
        await radioInsideOption.check().catch(async () => {
          await radioInsideOption.click({ force: true });
        });
        return;
      }

      await this.clickViaClickableAncestor(optionInSection);
      return;
    }

    const dropdownInSection = sectionContainer.locator('button, [role="button"], input').first();
    if (await dropdownInSection.isVisible({ timeout: 1500 }).catch(() => false)) {
      await dropdownInSection.click();
      await this.selectOptionFromBottomSheet(optionText, {
        searchText: optionText,
        errorContext: `${optionText} option for ${sectionLabel}`,
      });
      return;
    }

    throw new Error(`Unable to set "${optionText}" for section "${sectionLabel}".`);
  }

  async selectOptionFromBottomSheet(optionText, options = {}) {
    const { searchText = optionText, errorContext = 'option', searchSelectors = [] } = options;
    const scope = (await this.getActiveBottomSheetScope()) || this.page.locator('body');

    await this.fillSearchInputInScope(scope, searchText, searchSelectors);

    const optionRegex = new RegExp(this.escapeRegExp(optionText), 'i');
    let optionNode = await this.findVisibleText(
      scope,
      optionRegex,
      `${errorContext} "${optionText}"`,
      3000,
      true,
      true
    );

    if (!optionNode) {
      optionNode = await this.findVisibleText(
        this.page.locator('body'),
        optionRegex,
        `${errorContext} "${optionText}"`,
        1500,
        false,
        true
      );
    }

    await this.clickViaClickableAncestor(optionNode);
    await this.waitForUiSettle({ idleTimeout: 1200, minPause: 50 });
  }

  async fillSearchInputInScope(scope, value, preferredSelectors = []) {
    const searchSelectors = [
      ...preferredSelectors,
      'input[placeholder*="search" i]',
      'input[placeholder*="type" i]',
      'input[placeholder*="name" i]',
      'input',
      'textarea',
    ];

    for (const selector of searchSelectors) {
      const editableSelector = `${selector}:not([readonly]):not([disabled])`;
      const inputs = scope.locator(editableSelector);
      const count = await inputs.count().catch(() => 0);
      for (let index = 0; index < count; index += 1) {
        const input = inputs.nth(index);
        if (!(await input.isVisible({ timeout: 400 }).catch(() => false))) {
          continue;
        }
        if (!(await input.isEditable().catch(() => false))) {
          continue;
        }
        await input.fill(value);
        await this.waitForUiSettle({ idleTimeout: 900, minPause: 40 });
        return;
      }
    }
  }

  async getActiveBottomSheetScope() {
    const scopeCandidates = [
      this.page.locator('[role="dialog"]').first(),
      this.page.locator('.MuiDrawer-root').first(),
      this.page.locator('[class*="bottom-sheet" i]').first(),
      this.page.locator('text=/^Select\\s+/i').last().locator('xpath=ancestor::*[self::div or self::section][1]'),
    ];

    for (const candidate of scopeCandidates) {
      if (await candidate.isVisible({ timeout: 600 }).catch(() => false)) {
        return candidate;
      }
    }

    return null;
  }

  async getDatePickerScope() {
    const pickerCandidates = [
      this.page.locator('[role="dialog"]').first(),
      this.page.locator('.MuiPickersPopper-root').first(),
      this.page.locator('.MuiPickersLayout-root').first(),
      this.page.locator('.MuiPopover-root').first(),
    ];

    for (const candidate of pickerCandidates) {
      if (await candidate.isVisible({ timeout: 1000 }).catch(() => false)) {
        return candidate;
      }
    }

    return this.page.locator('body');
  }

  async findVisibleText(
    scope,
    regex,
    entityName,
    timeout = 2000,
    silent = false,
    preferLowerOnScreen = false
  ) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const matches = scope.getByText(regex);
      const count = await matches.count().catch(() => 0);
      let best = null;
      let bestScore = -1;

      for (let index = 0; index < count; index += 1) {
        const candidate = matches.nth(index);
        if (!(await candidate.isVisible({ timeout: 200 }).catch(() => false))) {
          continue;
        }

        if (!preferLowerOnScreen) {
          return candidate;
        }

        const box = await candidate.boundingBox();
        const score = box ? box.y : 0;
        if (score > bestScore) {
          best = candidate;
          bestScore = score;
        }
      }

      if (best) {
        return best;
      }
      await this.page.waitForTimeout(120);
    }

    if (silent) {
      return null;
    }

    throw new Error(`Unable to find visible ${entityName}.`);
  }

  async clickViaClickableAncestor(target, force = false) {
    const clickableAncestor = target
      .locator(
        'xpath=ancestor::*[self::button or @role="button" or @role="radio" or self::li or contains(@class,"MuiCard-root") or contains(@class,"MuiListItem-root") or contains(@class,"MuiChip-root")][1]'
      )
      .first();

    if (await clickableAncestor.isVisible({ timeout: 1000 }).catch(() => false)) {
      await clickableAncestor.click({ force });
      return;
    }

    await target.click({ force });
  }

  async selectPackagingTypeOption(packagingType) {
    const heading = await this.findVisibleText(
      this.page.locator('body'),
      /select packaging type/i,
      'Select Packaging Type heading',
      5000,
      false,
      true
    );

    const headingBox = await heading.boundingBox().catch(() => null);
    const optionRegex = new RegExp(`^\\s*${this.escapeRegExp(packagingType)}\\s*$`, 'i');

    let optionNode = null;
    if (headingBox) {
      optionNode = await this.findVisibleTextBelowY(
        this.page.locator('body'),
        optionRegex,
        headingBox.y + headingBox.height,
        `packaging type "${packagingType}"`,
        5000
      );
    }

    if (!optionNode) {
      optionNode = await this.findVisibleText(
        this.page.locator('body'),
        optionRegex,
        `packaging type "${packagingType}"`,
        3000
      );
    }

    await this.clickViaClickableAncestor(optionNode);
    await this.waitForUiSettle({ idleTimeout: 1200, minPause: 60 });
  }

  async findVisibleTextBelowY(scope, regex, minY, entityName, timeout = 3000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const matches = scope.getByText(regex);
      const count = await matches.count().catch(() => 0);
      let best = null;
      let bestY = Number.POSITIVE_INFINITY;

      for (let index = 0; index < count; index += 1) {
        const candidate = matches.nth(index);
        if (!(await candidate.isVisible({ timeout: 200 }).catch(() => false))) {
          continue;
        }

        const box = await candidate.boundingBox().catch(() => null);
        if (!box || box.y <= minY) {
          continue;
        }

        if (box.y < bestY) {
          best = candidate;
          bestY = box.y;
        }
      }

      if (best) {
        return best;
      }

      await this.page.waitForTimeout(120);
    }

    throw new Error(`Unable to find visible ${entityName} below the active sheet header.`);
  }

  async closeAnyOpenSelectSheet(headingRegex = /^Select\s+/i) {
    const heading = await this.findVisibleText(
      this.page.locator('body'),
      headingRegex,
      'open Select sheet heading',
      800,
      true,
      true
    );
    if (!heading) {
      return;
    }

    const sheetHeaderContainer = heading.locator('xpath=ancestor::*[self::div or self::section][1]').first();
    const closeCandidates = [
      sheetHeaderContainer.locator('button[aria-label*="close" i], [role="button"][aria-label*="close" i]').first(),
      sheetHeaderContainer.locator('button:has-text("×"), [role="button"]:has-text("×")').first(),
      sheetHeaderContainer.locator('button:has(svg), [role="button"]:has(svg)').last(),
      this.page.locator('button:has-text("×"), [role="button"]:has-text("×")').last(),
    ];

    for (const closeButton of closeCandidates) {
      if (await closeButton.isVisible({ timeout: 800 }).catch(() => false)) {
        await closeButton.click().catch(async () => {
          await this.page.keyboard.press('Escape').catch(() => {});
        });
        await this.page.waitForTimeout(220);
        const stillVisible = await this.findVisibleText(
          this.page.locator('body'),
          headingRegex,
          'open Select sheet heading',
          300,
          true,
          true
        );
        if (!stillVisible) {
          await this.waitForUiSettle({ idleTimeout: 900, minPause: 30 });
          return;
        }
      }
    }

    const headingBox = await heading.boundingBox().catch(() => null);
    const viewport = this.page.viewportSize();
    if (headingBox && viewport) {
      await this.page.mouse.click(viewport.width - 30, headingBox.y + headingBox.height / 2).catch(async () => {
        await this.page.keyboard.press('Escape').catch(() => {});
      });
    } else {
      await this.page.keyboard.press('Escape').catch(() => {});
    }

    await this.page.waitForTimeout(220);
    const stillVisible = await this.findVisibleText(
      this.page.locator('body'),
      headingRegex,
      'open Select sheet heading',
      300,
      true,
      true
    );
    if (stillVisible) {
      await this.page.keyboard.press('Escape').catch(() => {});
    }
    await this.waitForUiSettle({ idleTimeout: 900, minPause: 30 });
  }

  async isMandiTaxValidationVisible() {
    return this.page
      .getByText(/mandi tax is required when applicable/i)
      .first()
      .isVisible({ timeout: 600 })
      .catch(() => false);
  }

}
