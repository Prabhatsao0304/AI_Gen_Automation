import fs from 'fs/promises';
import path from 'path';

export class DispatchOrderRequestPage {
  constructor(page) {
    this.page = page;
    this.dispatchDocOrder = [
      { key: 'supplierInvoice', label: /supplier\s*invoice/i },
      { key: 'loadingWeightSlip', label: /loading\s*weight\s*slip/i },
      { key: 'billOfTransport', label: /bill\s*of\s*transport/i },
      { key: 'mandiTax9r', label: /mandi\s*tax\s*9r/i },
      { key: 'mandiTax9rGatepass', label: /mandi\s*tax\s*9r\s*gatepass/i },
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

  async openPoDetailsByUrl(poDetailUrl, poNumber) {
    const targetUrl = String(poDetailUrl || '').trim();
    if (!targetUrl) {
      return false;
    }

    await this.page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
    await this.waitForUiSettle({ idleTimeout: 2500, minPause: 120 });
    return this.assertPoDetailsOpen(poNumber, true);
  }

  async clickCreateDispatchOrder() {
    const button = await this.findVisibleElement(
      [
        'button:has-text("Create Dispatch Order")',
        '[role="button"]:has-text("Create Dispatch Order")',
        'button:has-text("Dispatch Order")',
        '[role="button"]:has-text("Dispatch Order")',
        '[data-testid*="create-dispatch-order" i]',
      ],
      'Create Dispatch Order button'
    );

    await this.waitForActionEnabled(button, 'Create Dispatch Order button');
    await button.click();
    await this.waitForUiSettle({ idleTimeout: 2500, minPause: 120 });
  }

  async fillTransportDetails(vehicleNumber, driverMobile) {
    await this.fillInputByLabel('vehicle', vehicleNumber);
    await this.fillInputByLabel('mobile', driverMobile);
  }

  async submitTransportDetails() {
    const submit = await this.findVisibleElement(
      [
        'button:has-text("Submit")',
        '[role="button"]:has-text("Submit")',
        'button:has-text("Save")',
        '[role="button"]:has-text("Save")',
      ],
      'Transport details submit button'
    );
    await this.waitForActionEnabled(submit, 'Transport details submit button');
    await submit.click();
    await this.waitForUiSettle({ idleTimeout: 3000, minPause: 120 });
  }

  async assertTransportDetailsAdded() {
    const indicators = [
      this.page.getByText(/transport details added successfully/i).first(),
      this.page.getByText(/transport details added/i).first(),
      this.page.getByText(/add dispatch details/i).first(),
    ];
    for (const indicator of indicators) {
      if (await indicator.isVisible({ timeout: 10000 }).catch(() => false)) {
        return;
      }
    }
    throw new Error('Transport details success state is not visible.');
  }

  async clickAddDispatchDetails() {
    const button = await this.findVisibleElement(
      [
        'button:has-text("Add Dispatch Details")',
        '[role="button"]:has-text("Add Dispatch Details")',
        'button:has-text("Dispatch Details")',
        '[role="button"]:has-text("Dispatch Details")',
      ],
      'Add Dispatch Details button'
    );
    await this.waitForActionEnabled(button, 'Add Dispatch Details button');
    await button.click();
    await this.waitForUiSettle({ idleTimeout: 2500, minPause: 120 });
  }

  async uploadDispatchDocuments(docPaths) {
    await this.assertDispatchDocumentSectionVisible();
    await this.uploadUsingVisibleUploadRowsInOrder(docPaths);
  }

  async uploadUsingVisibleUploadRowsInOrder(docPaths) {
    const uploadRows = this.page.getByText(/^\+?\s*upload\s*$/i);
    const rowCount = await uploadRows.count().catch(() => 0);
    if (rowCount < 5) {
      throw new Error(`Upload rows not found as expected. Found ${rowCount}, expected at least 5.`);
    }

    const orderedDocs = [
      docPaths.supplierInvoice,
      docPaths.loadingWeightSlip,
      docPaths.billOfTransport,
      docPaths.mandiTax9r,
      docPaths.mandiTax9rGatepass,
    ];

    for (let index = 0; index < 5; index += 1) {
      const filePath = orderedDocs[index];
      await this.assertReadableFile(filePath, this.dispatchDocOrder[index].key);
      const trigger = uploadRows.nth(index);
      const uploaded = await this.uploadWithDeterministicRowUpload(index, trigger, filePath);
      if (!uploaded) {
        throw new Error(`Upload did not open file chooser for row ${index + 1} (${this.dispatchDocOrder[index].key}).`);
      }
      await this.waitForUiSettle({ idleTimeout: 800, minPause: 60 });
    }
  }

  async uploadWithDeterministicRowUpload(index, trigger, filePath) {
    const rowLabel = this.dispatchDocOrder[index]?.label || /upload/i;
    const rowSpecificTrigger = await this.findRowUploadTrigger(rowLabel, index);
    if (rowSpecificTrigger) {
      const uploaded = await this.uploadWithSimpleFileChooser(rowSpecificTrigger, filePath);
      if (uploaded) {
        return true;
      }
    }
    return this.uploadWithSimpleFileChooser(trigger, filePath);
  }

  async findRowUploadTrigger(labelRegex, index) {
    const labelNode = await this.findVisibleText(this.page.locator('body'), labelRegex, 'dispatch upload row label', 1200, true);
    if (labelNode) {
      const rowContainer = labelNode
        .locator('xpath=following::*[self::div or self::button or @role="button"][1]')
        .first();
      if (await rowContainer.isVisible({ timeout: 500 }).catch(() => false)) {
        return rowContainer;
      }
    }

    const uploadRows = this.page.getByText(/^\+?\s*upload\s*$/i);
    if (await uploadRows.nth(index).isVisible({ timeout: 500 }).catch(() => false)) {
      return uploadRows.nth(index);
    }

    return null;
  }

  async uploadWithSimpleFileChooser(trigger, filePath) {
    const isVisible = await trigger.isVisible({ timeout: 700 }).catch(() => false);
    if (!isVisible) {
      return false;
    }
    const tryTarget = async (target, useMouse = false) => {
      const visible = await target.isVisible({ timeout: 400 }).catch(() => false);
      if (!visible) {
        return false;
      }

      const inputs = this.page.locator('input[type="file"]');
      const beforeInputs = await inputs.count().catch(() => 0);

      const chooser = this.page.waitForEvent('filechooser', { timeout: 1500 }).catch(() => null);
      if (useMouse) {
        const box = await target.boundingBox().catch(() => null);
        if (!box) {
          return false;
        }
        await this.page.mouse.click(box.x + box.width / 2, box.y + box.height / 2).catch(() => {});
      } else {
        await target.click({ force: true }).catch(() => {});
      }

      const fileChooser = await chooser;
      if (fileChooser) {
        await fileChooser.setFiles(filePath);
        return true;
      }

      // This UI opens an "Upload Via" bottom sheet first.
      const uploadViaSheet = this.page.getByText(/upload via/i).first();
      const isUploadViaVisible = await uploadViaSheet.isVisible({ timeout: 600 }).catch(() => false);
      if (isUploadViaVisible) {
        const browseFilesOption = await this.findVisibleElement(
          [
            'button:has-text("Browse Files")',
            '[role="button"]:has-text("Browse Files")',
            'div:has-text("Browse Files")',
            'span:has-text("Browse Files")',
            '[role="button"]:has-text("Files")',
            'button:has-text("Files")',
          ],
          'Browse Files option',
          900,
          true
        );

        if (browseFilesOption) {
          const inputs = this.page.locator('input[type="file"]');
          const beforeInputs = await inputs.count().catch(() => 0);
          const chooserAfterBrowse = this.page.waitForEvent('filechooser', { timeout: 10000 }).catch(() => null);
          await browseFilesOption.click({ force: true }).catch(() => {});
          const chooserFromBrowse = await chooserAfterBrowse;
          if (chooserFromBrowse) {
            await chooserFromBrowse.setFiles(filePath);
            return true;
          }

          const afterInputs = await inputs.count().catch(() => 0);
          if (afterInputs > beforeInputs && afterInputs > 0) {
            await inputs.nth(afterInputs - 1).setInputFiles(filePath).catch(() => {});
            return true;
          }
        }
      }

      // Fallback for UIs that create hidden file input after clicking upload area.
      const afterInputs = await inputs.count().catch(() => 0);
      if (afterInputs > beforeInputs && afterInputs > 0) {
        const newestInput = inputs.nth(afterInputs - 1);
        await newestInput.setInputFiles(filePath).catch(() => {});
        return true;
      }

      return false;
    };

    const targets = [
      trigger,
      trigger.locator('xpath=ancestor::*[self::button or @role="button" or self::div][1]').first(),
      trigger.locator('xpath=ancestor::*[self::div][2]').first(),
      trigger.locator('xpath=ancestor::*[self::div][3]').first(),
    ];

    for (const target of targets) {
      if (await tryTarget(target, false)) {
        return true;
      }
      if (await tryTarget(target, true)) {
        return true;
      }
    }

    return false;
  }

  async assertDispatchDocumentsAttached() {
    const bodyText = (await this.page.locator('body').innerText().catch(() => '')).toLowerCase();
    const hints = ['replace', 'uploaded', 'view'];
    const matchCount = hints.filter((hint) => bodyText.includes(hint)).length;

    if (matchCount >= 1) {
      return;
    }

    const replaceButtons = this.page
      .locator('button, [role="button"], div, span')
      .filter({ hasText: /replace/i });
    const replaceCount = await replaceButtons.count().catch(() => 0);
    if (replaceCount >= 1) {
      return;
    }

    throw new Error('Could not verify dispatch document attachment state.');
  }

  async waitForDispatchDocsNextEnabled(timeoutMs = 180000) {
    const deadline = Date.now() + timeoutMs;
    const nextSelectors = [
      'button:has-text("Next")',
      '[role="button"]:has-text("Next")',
      '[data-testid*="next" i]',
    ];

    while (Date.now() < deadline) {
      for (const selector of nextSelectors) {
        const nextButton = this.page.locator(selector).first();
        const visible = await nextButton.isVisible({ timeout: 200 }).catch(() => false);
        if (!visible) {
          continue;
        }
        const disabled = await nextButton.isDisabled().catch(() => false);
        if (!disabled) {
          return;
        }
      }
      await this.page.waitForTimeout(500);
    }

    throw new Error('Timed out waiting for Dispatch Documents Next button to become enabled after manual upload.');
  }

  async clickNextFromDispatchDocuments() {
    const nextButton = await this.findVisibleElement(
      [
        'button:has-text("Next")',
        '[role="button"]:has-text("Next")',
        '[data-testid*="next" i]',
      ],
      'Dispatch documents Next button'
    );
    await this.waitForActionEnabled(nextButton, 'Dispatch documents Next button');
    await nextButton.click();
    await this.waitForUiSettle({ idleTimeout: 2500, minPause: 120 });
  }

  async readDispatchAutoFilledValues() {
    const netWeightInput = await this.findInputByLabelAliases(
      ['net weight', 'net wt', 'weight'],
      'Net Weight input'
    );
    const numberOfBagsInput = await this.findInputByLabelAliases(
      ['no. of bags', 'no of bags', 'number of bags', 'bags'],
      'No. of Bags input'
    );

    const netWeight = await this.readInputValue(netWeightInput);
    const numberOfBags = await this.readInputValue(numberOfBagsInput);

    if (!this.hasMeaningfulValue(netWeight)) {
      throw new Error('Net Weight is not auto-filled after dispatch document upload.');
    }
    if (!this.hasMeaningfulValue(numberOfBags)) {
      throw new Error('No. of Bags is not auto-filled after dispatch document upload.');
    }

    return {
      netWeight: String(netWeight).trim(),
      numberOfBags: String(numberOfBags).trim(),
    };
  }

  async fillDispatchCharges({ bagDeduction, mandiTax }) {
    const bagDeductionInput = await this.findInputByLabelAliases(
      ['bag deduction', 'bags deduction', 'deduction'],
      'Bag Deduction input',
      true
    );
    await this.clearAndType(bagDeductionInput, String(bagDeduction));

    const mandiTaxInput = await this.findInputByLabelAliases(
      ['mandi tax', 'mandi'],
      'Mandi Tax input',
      true
    );
    await this.clearAndType(mandiTaxInput, String(mandiTax));
  }

  async submitDispatchOrderRequest() {
    const submitButton = await this.findVisibleElement(
      [
        'button:has-text("Submit")',
        '[role="button"]:has-text("Submit")',
        'button:has-text("Create Dispatch Order")',
        '[role="button"]:has-text("Create Dispatch Order")',
        'button:has-text("Create DO")',
        '[role="button"]:has-text("Create DO")',
      ],
      'Dispatch order submit button'
    );
    await this.waitForActionEnabled(submitButton, 'Dispatch order submit button');
    await submitButton.click();
    await this.waitForUiSettle({ idleTimeout: 3000, minPause: 120 });
  }

  async assertDispatchDocumentSectionVisible() {
    const indicators = [
      this.page.getByText(/supplier invoice/i).first(),
      this.page.getByText(/loading weight slip/i).first(),
      this.page.getByText(/bill of transport/i).first(),
      this.page.getByText(/mandi tax/i).first(),
    ];

    for (const indicator of indicators) {
      if (await indicator.isVisible({ timeout: 6000 }).catch(() => false)) {
        return;
      }
    }

    throw new Error('Dispatch documents section is not visible.');
  }

  async assertReadableFile(filePath, label) {
    if (!filePath) {
      throw new Error(`Missing file path for ${label}.`);
    }
    await fs.access(path.resolve(filePath));
  }

  async fillInputByLabel(labelText, value) {
    const labelRegex = new RegExp(labelText, 'i');

    const directInput = this.page
      .locator(
        `input[placeholder*="${labelText}" i], input[name*="${labelText}" i], input[aria-label*="${labelText}" i], textarea[placeholder*="${labelText}" i]`
      )
      .first();

    if (await directInput.isVisible({ timeout: 1200 }).catch(() => false)) {
      await directInput.fill(String(value));
      return;
    }

    const labelNode = await this.findVisibleText(
      this.page.locator('body'),
      labelRegex,
      `${labelText} label`,
      4500
    );
    const container = labelNode
      .locator('xpath=ancestor::*[self::div or self::section or self::article][1]')
      .first();

    const inputInsideContainer = container
      .locator(
        'input:not([type="hidden"]):not([readonly]):not([disabled]), textarea:not([readonly]):not([disabled])'
      )
      .first();

    if (await inputInsideContainer.isVisible({ timeout: 1200 }).catch(() => false)) {
      await inputInsideContainer.fill(String(value));
      return;
    }

    const nearestInput = labelNode
      .locator(
        'xpath=following::*[self::input or self::textarea][not(@type="hidden") and not(@readonly) and not(@disabled)][1]'
      )
      .first();
    if (await nearestInput.isVisible({ timeout: 1200 }).catch(() => false)) {
      await nearestInput.fill(String(value));
      return;
    }

    throw new Error(`Unable to fill input for label "${labelText}".`);
  }

  async findInputByLabelAliases(labelAliases, inputName, writableOnly = false) {
    for (const labelText of labelAliases) {
      const direct = this.page
        .locator(
          `input[placeholder*="${labelText}" i], input[name*="${labelText}" i], input[aria-label*="${labelText}" i], textarea[placeholder*="${labelText}" i], textarea[name*="${labelText}" i], textarea[aria-label*="${labelText}" i]`
        )
        .first();
      if (await direct.isVisible({ timeout: 300 }).catch(() => false)) {
        if (!writableOnly || (await direct.isEditable().catch(() => false))) {
          return direct;
        }
      }
    }

    for (const labelText of labelAliases) {
      const labelRegex = new RegExp(labelText, 'i');
      const labelNode = await this.findVisibleText(
        this.page.locator('body'),
        labelRegex,
        `${inputName} label`,
        2000,
        true
      );
      if (!labelNode) {
        continue;
      }

      const container = labelNode
        .locator('xpath=ancestor::*[self::div or self::section or self::article][1]')
        .first();

      const containerInput = writableOnly
        ? container
            .locator('input:not([type="hidden"]):not([readonly]):not([disabled]), textarea:not([readonly]):not([disabled])')
            .first()
        : container.locator('input:not([type="hidden"]), textarea').first();

      if (await containerInput.isVisible({ timeout: 300 }).catch(() => false)) {
        return containerInput;
      }

      const nearestInput = writableOnly
        ? labelNode
            .locator(
              'xpath=following::*[(self::input or self::textarea)][not(@type="hidden") and not(@readonly) and not(@disabled)][1]'
            )
            .first()
        : labelNode.locator('xpath=following::*[(self::input or self::textarea)][not(@type="hidden")][1]').first();
      if (await nearestInput.isVisible({ timeout: 300 }).catch(() => false)) {
        return nearestInput;
      }
    }

    throw new Error(`Unable to locate ${inputName}.`);
  }

  async clearAndType(input, value) {
    await input.scrollIntoViewIfNeeded().catch(() => {});
    await input.click({ force: true }).catch(async () => {
      await input.focus().catch(() => {});
    });
    await this.page.keyboard.press('Meta+a').catch(() => {});
    await this.page.keyboard.press('Control+a').catch(() => {});
    await this.page.keyboard.press('Backspace').catch(() => {});
    await input.fill('').catch(() => {});
    await input.type(String(value), { delay: 10 }).catch(async () => {
      await input.fill(String(value));
    });
  }

  async readInputValue(input) {
    const valueByInput = await input.inputValue().catch(() => '');
    if (this.hasMeaningfulValue(valueByInput)) {
      return valueByInput;
    }

    const textValue = await input.textContent().catch(() => '');
    if (this.hasMeaningfulValue(textValue)) {
      return textValue;
    }

    const parentValue = await input.locator('xpath=ancestor::*[1]').textContent().catch(() => '');
    return parentValue || '';
  }

  hasMeaningfulValue(value) {
    const trimmed = String(value || '').trim();
    return Boolean(trimmed) && trimmed !== '-' && trimmed !== '--';
  }

  async findVisibleElement(selectors, elementName, timeoutMs = 6000, silent = false) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      for (const selector of selectors) {
        const locator = this.page.locator(selector).first();
        if (await locator.isVisible({ timeout: 200 }).catch(() => false)) {
          return locator;
        }
      }
      await this.page.waitForTimeout(120);
    }

    if (silent) {
      return null;
    }

    throw new Error(`Unable to find visible ${elementName}.`);
  }

  async findVisibleText(scope, regex, elementName = 'element', timeoutMs = 3000, silent = false) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const locator = scope.getByText(regex).first();
      if (await locator.isVisible({ timeout: 200 }).catch(() => false)) {
        return locator;
      }
      await this.page.waitForTimeout(120);
    }

    if (silent) {
      return null;
    }

    throw new Error(`Unable to find visible ${elementName}.`);
  }

  async clickViaClickableAncestor(node) {
    const clickableAncestor = node
      .locator(
        'xpath=ancestor-or-self::*[self::button or @role="button" or self::a or @tabindex][1]'
      )
      .first();

    if (await clickableAncestor.isVisible({ timeout: 500 }).catch(() => false)) {
      await clickableAncestor.click();
      return;
    }

    await node.click();
  }

  async waitForActionEnabled(locator, elementName) {
    const deadline = Date.now() + 15000;
    while (Date.now() < deadline) {
      if (!(await locator.isDisabled().catch(() => false))) {
        return;
      }
      await this.page.waitForTimeout(150);
    }

    throw new Error(`${elementName} stayed disabled.`);
  }

  async openFirstApprovedPoDetailsFromList() {
    const tabPatterns = [/in progress/i, /completed/i, /in review/i, /all/i];
    for (const pattern of tabPatterns) {
      const tab = this.page
        .locator('[role="tab"], button, [role="button"], a')
        .filter({ hasText: pattern })
        .first();

      if (await tab.isVisible({ timeout: 700 }).catch(() => false)) {
        await tab.click().catch(() => {});
        await this.waitForUiSettle({ idleTimeout: 1800, minPause: 120 });
      }

      const approvedBadge = this.page.getByText(/^\s*approved\s*$/i);
      const count = await approvedBadge.count().catch(() => 0);
      for (let index = 0; index < Math.min(count, 20); index += 1) {
        const badge = approvedBadge.nth(index);
        if (!(await badge.isVisible({ timeout: 150 }).catch(() => false))) {
          continue;
        }

        await this.clickViaClickableAncestor(badge);
        await this.waitForUiSettle({ idleTimeout: 2500, minPause: 120 });

        const hasCreateDispatch = await this.findVisibleElement(
          [
            'button:has-text("Create Dispatch Order")',
            '[role="button"]:has-text("Create Dispatch Order")',
            'button:has-text("Dispatch Order")',
            '[role="button"]:has-text("Dispatch Order")',
          ],
          'Create Dispatch Order button',
          1400,
          true
        );

        if (hasCreateDispatch) {
          const poText = await this.page
            .getByText(/#?\s*([A-Z]{2,}[A-Z0-9]{6,})/i)
            .first()
            .innerText()
            .catch(() => '');
          return poText.replace(/^#+/, '').trim() || 'approved-po';
        }

        await this.page.goBack().catch(() => {});
        await this.waitForUiSettle({ idleTimeout: 1500, minPause: 100 });
      }
    }

    throw new Error('Unable to find an Approved PO with Create Dispatch Order action.');
  }

  async assertPoDetailsOpen(poNumber, silent = false) {
    const poRegex = new RegExp(this.escapeRegExp(poNumber), 'i');
    const indicators = [
      this.page.getByText(/po detail/i).first(),
      this.page.getByText(/po terms/i).first(),
      this.page.getByText(poRegex).first(),
    ];

    for (const indicator of indicators) {
      if (await indicator.isVisible({ timeout: 3500 }).catch(() => false)) {
        return true;
      }
    }

    if (silent) {
      return false;
    }

    throw new Error(`PO details screen did not open for PO "${poNumber}".`);
  }

  async waitForUiSettle({ idleTimeout = 1200, minPause = 60 } = {}) {
    if (minPause > 0) {
      await this.page.waitForTimeout(minPause);
    }
    await this.page.waitForLoadState('networkidle', { timeout: idleTimeout }).catch(() => {});
  }

  escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
