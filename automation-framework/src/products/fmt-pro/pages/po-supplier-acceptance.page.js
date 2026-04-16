import config from '../../../config/env.config.js';

export class PoSupplierAcceptancePage {
  constructor(page) {
    this.page = page;
    this.searchSelectors = [
      'input[placeholder*="Search" i]',
      'input[placeholder*="PO" i]',
      'input[placeholder*="Supplier" i]',
      'input[aria-label*="Search" i]',
      'input[type="search"]',
      'input[type="text"]',
    ];
    this.shareButtonSelectors = [
      'button:has-text("Share")',
      '[role="button"]:has-text("Share")',
      '[data-testid*="share" i]',
      '[aria-label*="share" i]',
    ];
  }

  async assertLoggedInToFmtPro() {
    const expectedHostname = new URL(config.products['fmt-pro'].baseUrl).hostname;
    await this.page.waitForURL(
      (url) => {
        const parsed = new URL(url.toString());
        return parsed.hostname === expectedHostname && !parsed.pathname.includes('/login');
      },
      { timeout: 90000 }
    );
  }

  async openPurchaseOrderListInFmtPro() {
    const purchaseOrderUrl = this.buildFmtProPurchaseOrderUrl();
    await this.page.goto(purchaseOrderUrl, { waitUntil: 'domcontentloaded' });
    await this.waitForUiSettle({ idleTimeout: 2500, minPause: 120 });

    const indicators = [
      this.page.getByText(/purchase order/i).first(),
      this.page.locator(this.searchSelectors.join(',')).first(),
    ];

    for (const indicator of indicators) {
      if (await indicator.isVisible({ timeout: 3000 }).catch(() => false)) {
        return;
      }
    }

    throw new Error('Purchase Order list screen did not load in FMT PRO.');
  }

  async openPoDetailsByNumber(poNumber) {
    const searchInput = await this.findVisibleElement(
      this.searchSelectors,
      'Purchase Order search input',
      3500,
      true
    );
    if (
      searchInput &&
      await searchInput.isEditable().catch(() => false)
    ) {
      await searchInput.fill(poNumber);
      await this.page.keyboard.press('Enter').catch(() => {});
      await this.waitForUiSettle({ idleTimeout: 2200, minPause: 120 });
    }

    const targetRegex = new RegExp(`#?\\s*${this.escapeRegExp(poNumber)}\\b`, 'i');
    const textCandidates = this.page.getByText(targetRegex);
    const count = await textCandidates.count().catch(() => 0);

    for (let index = 0; index < Math.min(count, 30); index += 1) {
      const candidate = textCandidates.nth(index);
      if (!(await candidate.isVisible({ timeout: 200 }).catch(() => false))) {
        continue;
      }
      await this.clickViaClickableAncestor(candidate);
      await this.waitForUiSettle({ idleTimeout: 2500, minPause: 120 });
      await this.assertPoDetailsOpen(poNumber);
      return;
    }

    throw new Error(`Unable to open PO details from list for PO "${poNumber}".`);
  }

  async openFirstVisiblePoDetails() {
    const poCandidates = this.page.getByText(/#?\s*(?:PO)?[A-Z]{3,}[A-Z0-9]{5,}/i);
    const count = await poCandidates.count().catch(() => 0);

    for (let index = 0; index < Math.min(count, 80); index += 1) {
      const node = poCandidates.nth(index);
      if (!(await node.isVisible({ timeout: 120 }).catch(() => false))) {
        continue;
      }

      const rawText = (await node.innerText().catch(() => '')).trim();
      const cleaned = rawText.replace(/^#+/, '').replace(/\s+/g, '');
      if (!/[A-Za-z]/.test(cleaned) || !/[0-9]/.test(cleaned)) {
        continue;
      }

      await this.clickViaClickableAncestor(node);
      await this.waitForUiSettle({ idleTimeout: 2500, minPause: 120 });

      const opened = await this.page
        .getByText(/po detail|po terms|overview/i)
        .first()
        .isVisible({ timeout: 2500 })
        .catch(() => false);
      if (opened) {
        return cleaned;
      }
    }

    throw new Error('Unable to open any visible PO details from current Purchase Order list.');
  }

  async copySupplierLinkFromShare() {
    const shareButton = await this.findVisibleElement(this.shareButtonSelectors, 'Share button');
    await shareButton.click();
    await this.waitForUiSettle({ idleTimeout: 1500, minPause: 120 });

    const copiedLink = await this.readCopiedLinkFromClipboard(7000);
    if (!copiedLink) {
      throw new Error('Share clicked but no supplier link was detected in clipboard.');
    }
    return copiedLink;
  }

  async openSupplierLink(link) {
    await this.page.goto(link, { waitUntil: 'domcontentloaded' });
    await this.waitForUiSettle({ idleTimeout: 2500, minPause: 120 });
  }

  async loginWithSupplierMobileOtp(mobile, otp) {
    const acceptButton = this.page
      .locator('button:has-text("Accept PO"), [role="button"]:has-text("Accept PO"), button:has-text("Accept")')
      .first();
    if (await acceptButton.isVisible({ timeout: 1500 }).catch(() => false)) {
      return;
    }

    const mobileInput = await this.findVisibleElement([
      'input[type="tel"]',
      'input[name*="mobile" i]',
      'input[placeholder*="mobile" i]',
      'input[placeholder*="phone" i]',
      'input[aria-label*="mobile" i]',
    ], 'Supplier mobile input');

    await mobileInput.fill(String(mobile));

    const continueButton = await this.findVisibleElement([
      'button:has-text("Proceed")',
      '[role="button"]:has-text("Proceed")',
      'button:has-text("Continue")',
      '[role="button"]:has-text("Continue")',
      'button:has-text("Next")',
      '[role="button"]:has-text("Next")',
      'button:has-text("Get OTP")',
      '[role="button"]:has-text("Get OTP")',
      'button:has-text("Send OTP")',
      '[role="button"]:has-text("Send OTP")',
      'button:has-text("Login")',
      '[role="button"]:has-text("Login")',
    ], 'Continue/Login button');
    await continueButton.click();
    await this.waitForUiSettle({ idleTimeout: 2200, minPause: 120 });

    await this.fillOtp(otp);

    const verifyButton = await this.findVisibleElement([
      'button:has-text("Proceed")',
      '[role="button"]:has-text("Proceed")',
      'button:has-text("Verify")',
      '[role="button"]:has-text("Verify")',
      'button:has-text("Submit")',
      '[role="button"]:has-text("Submit")',
      'button:has-text("Continue")',
      '[role="button"]:has-text("Continue")',
      'button:has-text("Login")',
      '[role="button"]:has-text("Login")',
    ], 'OTP verify/submit button', 5000, true);

    if (verifyButton) {
      await verifyButton.click();
      await this.waitForUiSettle({ idleTimeout: 2600, minPause: 120 });
    }
  }

  async acceptPoAsSupplier() {
    const acceptButton = await this.findVisibleElement([
      'button:has-text("Accept PO")',
      '[role="button"]:has-text("Accept PO")',
      'button:has-text("Accept")',
      '[role="button"]:has-text("Accept")',
      '[data-testid*="accept" i]',
    ], 'Accept PO button');

    await this.waitForActionEnabled(acceptButton, 'Accept PO button');
    await acceptButton.click();
    await this.waitForUiSettle({ idleTimeout: 2500, minPause: 120 });

    const confirmAccept = await this.findVisibleElement([
      '[role="dialog"] button:has-text("Accept")',
      '[role="dialog"] [role="button"]:has-text("Accept")',
      '[role="dialog"] button:has-text("Confirm")',
      '[role="dialog"] [role="button"]:has-text("Confirm")',
      '[role="dialog"] button:has-text("Yes")',
      '[role="dialog"] [role="button"]:has-text("Yes")',
    ], 'Accept confirmation button', 1600, true);

    if (confirmAccept) {
      await confirmAccept.click();
      await this.waitForUiSettle({ idleTimeout: 2500, minPause: 120 });
    }
  }

  async assertSupplierPoAccepted() {
    const acceptedIndicators = [
      this.page.getByText(/accepted/i).first(),
      this.page.getByText(/po accepted/i).first(),
      this.page.getByText(/success/i).first(),
      this.page.getByText(/thank you/i).first(),
    ];

    for (const indicator of acceptedIndicators) {
      if (await indicator.isVisible({ timeout: 3500 }).catch(() => false)) {
        return;
      }
    }

    const acceptButtonStillVisible = await this.page
      .locator('button:has-text("Accept PO"), [role="button"]:has-text("Accept PO"), button:has-text("Accept")')
      .first()
      .isVisible({ timeout: 1200 })
      .catch(() => false);

    if (!acceptButtonStillVisible) {
      return;
    }

    throw new Error('Supplier PO acceptance could not be verified after clicking Accept PO.');
  }

  async fillOtp(otp) {
    const normalizedOtp = String(otp || '').trim();
    if (!normalizedOtp) {
      throw new Error('OTP value is empty.');
    }

    const singleOtpInput = this.page
      .locator(
        'input[name*="otp" i], input[placeholder*="OTP" i], input[autocomplete="one-time-code"], input[aria-label*="otp" i]'
      )
      .first();

    if (
      await singleOtpInput.isVisible({ timeout: 2500 }).catch(() => false) &&
      await singleOtpInput.isEditable().catch(() => false)
    ) {
      await singleOtpInput.fill(normalizedOtp);
      return;
    }

    const otpBoxes = this.page
      .locator('input[maxlength="1"], input[inputmode="numeric"], input[pattern*="[0-9]"]')
      .filter({ hasNotText: '' });
    const count = await otpBoxes.count().catch(() => 0);
    if (count >= normalizedOtp.length) {
      for (let index = 0; index < normalizedOtp.length; index += 1) {
        const box = otpBoxes.nth(index);
        if (await box.isVisible({ timeout: 400 }).catch(() => false)) {
          await box.fill(normalizedOtp[index]);
        }
      }
      return;
    }

    throw new Error('Unable to find OTP input field(s) in supplier login flow.');
  }

  async readCopiedLinkFromClipboard(timeoutMs = 7000) {
    const deadline = Date.now() + timeoutMs;
    const urlRegex = /^https?:\/\/\S+$/i;

    while (Date.now() < deadline) {
      const currentUrl = this.page.url();
      if (currentUrl.startsWith('http')) {
        const origin = new URL(currentUrl).origin;
        await this.page.context().grantPermissions(['clipboard-read', 'clipboard-write'], { origin }).catch(() => {});
      }

      const clipboardText = await this.page
        .evaluate(async () => {
          try {
            return (await navigator.clipboard.readText()) || '';
          } catch {
            return '';
          }
        })
        .catch(() => '');

      const cleaned = clipboardText.trim();
      if (urlRegex.test(cleaned)) {
        return cleaned;
      }

      await this.page.waitForTimeout(180);
    }

    return null;
  }

  async assertPoDetailsOpen(poNumber) {
    const poRegex = new RegExp(this.escapeRegExp(poNumber), 'i');
    const indicators = [
      this.page.getByText(/po detail/i).first(),
      this.page.getByText(/po overview/i).first(),
      this.page.getByText(poRegex).first(),
      this.page.locator('[data-testid*="po-detail" i], [data-testid*="po-overview" i]').first(),
    ];

    for (const indicator of indicators) {
      if (await indicator.isVisible({ timeout: 3000 }).catch(() => false)) {
        return;
      }
    }

    throw new Error(`PO details screen did not open for PO "${poNumber}".`);
  }

  buildFmtProPurchaseOrderUrl() {
    const parsed = new URL(config.products['fmt-pro'].baseUrl);
    parsed.pathname = '/purchase-order';
    parsed.search = 'tab_id=1';
    return parsed.toString();
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

  async waitForActionEnabled(locator, actionName, timeoutMs = 15000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (await locator.isEnabled().catch(() => false)) {
        return;
      }
      await this.page.waitForTimeout(140);
    }

    throw new Error(`${actionName} is visible but still disabled.`);
  }

  async clickViaClickableAncestor(target) {
    const clickableAncestor = target
      .locator(
        'xpath=ancestor::*[self::button or @role="button" or @role="link" or self::a or self::li or contains(@class,"MuiCard-root") or contains(@class,"MuiListItem-root")][1]'
      )
      .first();

    if (await clickableAncestor.isVisible({ timeout: 600 }).catch(() => false)) {
      await clickableAncestor.click();
      return;
    }

    await target.click();
  }

  async waitForUiSettle({ idleTimeout = 1400, minPause = 60 } = {}) {
    if (minPause > 0) {
      await this.page.waitForTimeout(minPause);
    }
    await this.page.waitForLoadState('networkidle', { timeout: idleTimeout }).catch(() => {});
  }

  escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
