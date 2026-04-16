import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import { fileURLToPath } from 'url';
import { captureFocusedComponentScreenshot } from '../utils/screenshot.utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../../..');
const defaultReportPath = path.resolve(projectRoot, 'reports/design-audit-report.json');
const designScreenshotDir = path.resolve(projectRoot, 'screenshots/design-audit');

function safeReadJson(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

function loadFeatureRuleset(product, featureUri) {
  if (!product || !featureUri) {
    return null;
  }

  const featureName = path.basename(featureUri, path.extname(featureUri));
  return safeReadJson(path.resolve(projectRoot, 'rulesets', product, `${featureName}.json`));
}

function loadSharedRuleset() {
  return safeReadJson(
    path.resolve(projectRoot, 'rulesets/shared/central-component-library-design-system.json')
  );
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function cleanText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function uniqueNumbers(values = []) {
  return [...new Set(values.filter((value) => Number.isFinite(value)).map((value) => Number(value.toFixed(2))))].sort(
    (left, right) => left - right
  );
}

function summarizeSelectors(examples = [], limit = 3) {
  return [...new Set(examples.map((example) => cleanText(example?.selector)).filter(Boolean))].slice(0, limit);
}

function summarizeSpacingEvidence(evidence = {}) {
  const step = Number(evidence.spacing_step_px || 4);
  const tolerance = Number(evidence.spacing_tolerance_px || 1);
  const offendingValues = uniqueNumbers(
    (evidence.examples || []).flatMap((example) =>
      (example.values || []).filter((value) => {
        if (!Number.isFinite(value) || value <= 0.5) {
          return false;
        }
        const nearest = Math.round(value / step) * step;
        return Math.abs(nearest - value) > tolerance;
      })
    )
  );

  return {
    step,
    selectors: summarizeSelectors(evidence.examples || []),
    offendingValues,
  };
}

function summarizeRadiusEvidence(evidence = {}) {
  return {
    selectors: summarizeSelectors(evidence.examples || []),
    radiusValues: uniqueNumbers((evidence.examples || []).map((example) => example.value)),
  };
}

function summarizeLabelEvidence(evidence = {}) {
  return {
    selectors: summarizeSelectors(evidence.examples || []),
  };
}

function summarizeFontEvidence(evidence = {}) {
  return {
    selectors: summarizeSelectors(evidence.examples || []),
    fontFamilies: [...new Set((evidence.examples || []).map((example) => cleanText(example.fontFamily)).filter(Boolean))].slice(0, 3),
  };
}

function buildReportContext({ title, category, message, evidence = {} }) {
  if (title === 'Spacing values outside token scale') {
    const { step, selectors, offendingValues } = summarizeSpacingEvidence(evidence);
    const valueText = offendingValues.length > 0 ? offendingValues.map((value) => `${value}px`).join(', ') : 'off-grid spacing values';
    return {
      summary_title: 'Spacing drift from central token grid',
      possible_real_issue: `Some visible controls are using spacing that is not aligned to the ${step}px token grid, which can make the layout look visually uneven.`,
      likely_cause: `A local padding or gap override is bypassing the approved ${step}px spacing tokens.`,
      recommended_check: 'Review padding and gap on the affected controls and align them to the central spacing tokens.',
      pixel_evidence: `Observed non-token spacing values: ${valueText}.`,
      affected_elements: selectors,
    };
  }

  if (title === 'Border radius outside approved token scale') {
    const { selectors, radiusValues } = summarizeRadiusEvidence(evidence);
    const valueText = radiusValues.length > 0 ? radiusValues.map((value) => `${value}px`).join(', ') : 'non-token radius values';
    return {
      summary_title: 'Corner radius drift from approved component tokens',
      possible_real_issue: 'Some controls appear more rounded or less rounded than the approved central component style.',
      likely_cause: 'A local border-radius override is bypassing the approved radius token scale.',
      recommended_check: 'Inspect buttons, pills, and inputs on this screen and bring their border radius back to the approved component token values.',
      pixel_evidence: `Observed radius values outside the token scale: ${valueText}.`,
      affected_elements: selectors,
    };
  }

  if (title === 'Interactive controls without visible or accessible labels') {
    const { selectors } = summarizeLabelEvidence(evidence);
    return {
      summary_title: 'Interactive controls may be unclear or inaccessible',
      possible_real_issue: 'Some visible buttons or inputs do not expose a readable label, so users may not understand what they do.',
      likely_cause: 'Icon-only controls or hidden native inputs are missing visible text, title, or aria-label attributes.',
      recommended_check: 'Review icon buttons, menu triggers, and inputs on this screen and ensure each control has a clear visible label or an accessible name.',
      pixel_evidence: `Affected control examples: ${selectors.join(', ') || 'see screenshot evidence'}.`,
      affected_elements: selectors,
    };
  }

  if (title === 'Base font family drift') {
    const { selectors, fontFamilies } = summarizeFontEvidence(evidence);
    return {
      summary_title: 'Typography drift from the approved base font',
      possible_real_issue: 'The screen may be rendering in a different font than the central design system, which affects readability and visual consistency.',
      likely_cause: 'The base font family is not inheriting correctly from the central theme or is being overridden locally.',
      recommended_check: 'Compare the rendered font family on the affected controls against the central theme and remove any local font overrides.',
      pixel_evidence: `Observed font family values: ${fontFamilies.join(', ') || cleanText(message)}.`,
      affected_elements: selectors,
    };
  }

  if (title === 'Visible images missing alt text') {
    const selectors = summarizeSelectors(evidence.examples || []);
    return {
      summary_title: 'Image content may be inaccessible',
      possible_real_issue: 'Visible images do not expose alternative text, which makes the content inaccessible to assistive technology users.',
      likely_cause: 'Image components are being rendered without an `alt` attribute.',
      recommended_check: 'Review image usage on this screen and provide meaningful alt text for informative images.',
      pixel_evidence: `Affected image examples: ${selectors.join(', ') || 'see screenshot evidence'}.`,
      affected_elements: selectors,
    };
  }

  if (title === 'External links missing rel protections') {
    const selectors = summarizeSelectors(evidence.examples || []);
    return {
      summary_title: 'External links are missing browser safety protections',
      possible_real_issue: 'Links that open a new tab may expose the current window context.',
      likely_cause: 'Anchors use `target=\"_blank\"` without `rel=\"noopener noreferrer\"`.',
      recommended_check: 'Add `rel=\"noopener noreferrer\"` to external links that open in a new tab.',
      pixel_evidence: `Affected link examples: ${selectors.join(', ') || 'see screenshot evidence'}.`,
      affected_elements: selectors,
    };
  }

  if (title === 'Secret-like values visible in UI text') {
    return {
      summary_title: 'Sensitive-looking text may be visible in the UI',
      possible_real_issue: 'The screen may be exposing token-like or secret-like values in visible content.',
      likely_cause: 'Sensitive strings were rendered directly into the page or test data contains values that should not be visible to users.',
      recommended_check: 'Inspect visible UI text and remove or mask any token-like values that should not be exposed.',
      pixel_evidence: cleanText(message),
      affected_elements: [],
    };
  }

  return {
    summary_title: title,
    possible_real_issue: message,
    likely_cause: `A ${category} rule was violated on the live screen.`,
    recommended_check: 'Review the affected screen against the feature ruleset and the central component library guidance.',
    pixel_evidence: cleanText(message),
    affected_elements: summarizeSelectors(evidence.examples || []),
  };
}

function buildFinding({
  scenarioName,
  featureUri,
  url,
  category = 'frontend',
  severity = 'low',
  confidence = 'medium',
  title,
  message,
  component = null,
  storybookStatus = null,
  evidence = {},
  label = 'rule-based finding',
  reportContext = null,
}) {
  return {
    id: [
      featureUri || 'unknown-feature',
      scenarioName || 'unknown-scenario',
      category,
      title,
      component || 'general',
      cleanText(message).slice(0, 80),
    ].join('::'),
    scenario: scenarioName,
    feature_uri: featureUri,
    url,
    category,
    severity,
    confidence,
    title,
    message,
    component,
    storybook_status: storybookStatus,
    label,
    evidence,
    report_context:
      reportContext ||
      buildReportContext({
        title,
        category,
        message,
        evidence,
      }),
  };
}

function countBy(items, key) {
  return items.reduce((acc, item) => {
    const bucket = item[key] || 'unknown';
    acc[bucket] = (acc[bucket] || 0) + 1;
    return acc;
  }, {});
}

function normalizeComponentName(value) {
  return cleanText(value);
}

function humanizeComponentName(value) {
  return normalizeComponentName(value).replace(/([a-z0-9])([A-Z])/g, '$1 $2');
}

function getDocumentedComponentSet(sharedRuleset) {
  return new Set(sharedRuleset?.coverage_snapshot?.documented_components || []);
}

function getLibraryComponentSet(sharedRuleset) {
  return new Set([
    ...(sharedRuleset?.coverage_snapshot?.documented_components || []),
    ...(sharedRuleset?.coverage_snapshot?.undocumented_exports || []),
  ]);
}

function storybookStatusForComponent(componentName, documentedComponents, libraryComponents) {
  if (documentedComponents.has(componentName)) {
    return 'directly documented';
  }

  if (libraryComponents.has(componentName)) {
    return 'public export not directly documented';
  }

  return 'not found in central component library';
}

function computeComponentMatchStatus({
  observed,
  foundInLibrary,
  expectedOnScreen,
  variantInconsistency,
  checkFailures = [],
}) {
  if (!observed && expectedOnScreen) {
    return 'Missing';
  }

  if (observed && !foundInLibrary) {
    return 'Unmapped';
  }

  if (observed && (variantInconsistency || checkFailures.length > 0)) {
    return 'Variant';
  }

  if (observed && foundInLibrary) {
    return 'Exact';
  }

  return 'Unmapped';
}

function computeConfidenceScore({ observed, foundInLibrary, matchStatus, selectorConfidence = 0.95 }) {
  if (!observed && matchStatus === 'Missing') {
    return 0.98;
  }

  if (matchStatus === 'Unmapped') {
    return foundInLibrary ? 0.8 : 0.72;
  }

  if (matchStatus === 'Variant') {
    return Math.max(0.78, selectorConfidence);
  }

  return Math.max(0.9, selectorConfidence);
}

function createVariantSignatures(details = []) {
  return [...new Set(details.map((detail) => detail.signature).filter(Boolean))];
}

async function detectRenderedComponents({
  page,
  expectedInventory = [],
  sharedDetectionRules = [],
  scopeSelector = '',
}) {
  const detectionRules = [
    ...expectedInventory
      .filter((item) => item?.component_name && item.selector)
      .map((item, index) => ({
        component_name: item.component_name,
        display_name: item.name || item.component_name,
        selector: item.selector,
        priority: Number(item.priority || 1000 - index),
        allow_variant_mix: item.allow_variant_mix === true,
        expected_on_screen: item.required !== false,
        selector_confidence: Number(item.confidence_score || 0.95),
        source: 'feature_inventory',
      })),
    ...sharedDetectionRules
      .filter((rule) => rule?.component_name && rule.selector)
      .map((rule, index) => ({
        component_name: rule.component_name,
        display_name: rule.name || rule.component_name,
        selector: rule.selector,
        priority: Number(rule.priority || 100 - index),
        allow_variant_mix: rule.allow_variant_mix === true,
        expected_on_screen: false,
        selector_confidence: Number(rule.confidence_score || 0.85),
        source: 'shared_detection',
      })),
  ].sort((left, right) => Number(right.priority || 0) - Number(left.priority || 0));

  if (detectionRules.length === 0) {
    return [];
  }

  return page.evaluate(({ detectionRules, scopeSelector }) => {
    const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();

    const isVisible = (element) => {
      if (!(element instanceof HTMLElement)) {
        return false;
      }

      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        rect.width > 0 &&
        rect.height > 0
      );
    };

    const selectorFor = (element) => {
      const tag = element.tagName?.toLowerCase() || 'unknown';
      const id = element.id ? `#${element.id}` : '';
      const role = element.getAttribute('role');
      const classes = clean(element.className || '')
        .split(' ')
        .filter(Boolean)
        .slice(0, 3)
        .map((name) => `.${name}`)
        .join('');
      const rolePart = role ? `[role="${role}"]` : '';
      return `${tag}${id}${classes}${rolePart}`;
    };

    const summarizeClasses = (element) =>
      clean(element.className || '')
        .split(' ')
        .filter(Boolean)
        .slice(0, 4)
        .join('.');

    const buildVariantDetail = (element) => {
      const style = window.getComputedStyle(element);
      const states = [
        element.getAttribute('aria-selected') === 'true' ? 'selected' : null,
        element.getAttribute('aria-checked') === 'true' ? 'checked' : null,
        element.matches(':disabled') ? 'disabled' : null,
      ]
        .filter(Boolean)
        .join('|');

      const signature = [
        element.tagName.toLowerCase(),
        element.getAttribute('role') || '',
        summarizeClasses(element),
        style.borderRadius,
        style.backgroundColor,
        style.color,
        style.fontSize,
        style.fontWeight,
        style.paddingTop,
        style.paddingRight,
        style.paddingBottom,
        style.paddingLeft,
        states,
      ].join('|');

      return {
        signature,
        role: element.getAttribute('role') || '',
        class_name: summarizeClasses(element),
        border_radius: style.borderRadius,
        background_color: style.backgroundColor,
        color: style.color,
        font_size: style.fontSize,
        font_weight: style.fontWeight,
        padding: [style.paddingTop, style.paddingRight, style.paddingBottom, style.paddingLeft],
        state: states,
      };
    };

    const humanize = (value) =>
      clean(value).replace(/([a-z0-9])([A-Z])/g, '$1 $2');

    const deriveHeuristicRule = (element) => {
      const className = clean(element.className || '');
      const role = element.getAttribute('role') || '';
      const tag = element.tagName.toLowerCase();
      const muiMatch = className.match(/\bMui([A-Z][A-Za-z0-9]+)/);
      if (muiMatch?.[1]) {
        return {
          component_name: muiMatch[1],
          display_name: humanize(muiMatch[1]),
          allow_variant_mix: false,
          expected_on_screen: false,
          selector_confidence: 0.78,
          source: 'heuristic_mui_class',
        };
      }

      if (role === 'button' || tag === 'button') {
        return {
          component_name: 'CustomButtonLikeControl',
          display_name: 'Custom button-like control',
          allow_variant_mix: false,
          expected_on_screen: false,
          selector_confidence: 0.68,
          source: 'heuristic_fallback',
        };
      }

      if (role === 'combobox' || tag === 'input' || tag === 'textarea' || tag === 'select') {
        return {
          component_name: 'CustomInputLikeControl',
          display_name: 'Custom input-like control',
          allow_variant_mix: false,
          expected_on_screen: false,
          selector_confidence: 0.68,
          source: 'heuristic_fallback',
        };
      }

      if (role === 'dialog') {
        return {
          component_name: 'CustomDialog',
          display_name: 'Custom dialog',
          allow_variant_mix: true,
          expected_on_screen: false,
          selector_confidence: 0.68,
          source: 'heuristic_fallback',
        };
      }

      if (role === 'grid' || role === 'table' || tag === 'table') {
        return {
          component_name: 'CustomDataContainer',
          display_name: 'Custom data container',
          allow_variant_mix: true,
          expected_on_screen: false,
          selector_confidence: 0.68,
          source: 'heuristic_fallback',
        };
      }

      return {
        component_name: 'CustomInteractiveControl',
        display_name: 'Custom interactive control',
        allow_variant_mix: false,
        expected_on_screen: false,
        selector_confidence: 0.65,
        source: 'heuristic_fallback',
      };
    };

    const observations = new Map();
    const claimedElements = new WeakSet();
    const hasClaimedAncestor = (element) => {
      let parent = element.parentElement;
      while (parent) {
        if (claimedElements.has(parent)) {
          return true;
        }
        parent = parent.parentElement;
      }
      return false;
    };

    const addObservation = (rule, element, matchedBy) => {
      const key = clean(rule.component_name);
      if (!key) {
        return;
      }

      const existing = observations.get(key) || {
        component_name: key,
        display_name: rule.display_name || humanize(key),
        instance_count: 0,
        selectors: [],
        variant_details: [],
        allow_variant_mix: Boolean(rule.allow_variant_mix),
        expected_on_screen: Boolean(rule.expected_on_screen),
        selector_confidence: Number(rule.selector_confidence || 0.75),
        source: rule.source || 'unknown',
      };

      existing.instance_count += 1;
      existing.allow_variant_mix = existing.allow_variant_mix || Boolean(rule.allow_variant_mix);
      existing.expected_on_screen = existing.expected_on_screen || Boolean(rule.expected_on_screen);
      existing.selector_confidence = Math.max(
        existing.selector_confidence || 0,
        Number(rule.selector_confidence || 0)
      );

      const selectorDescriptor = clean(matchedBy || selectorFor(element));
      if (selectorDescriptor && !existing.selectors.includes(selectorDescriptor)) {
        existing.selectors.push(selectorDescriptor);
      }

      if (existing.variant_details.length < 30) {
        existing.variant_details.push(buildVariantDetail(element));
      }

      observations.set(key, existing);
    };

    for (const rule of detectionRules) {
      const elements = Array.from(document.querySelectorAll(rule.selector)).filter(isVisible);

      for (const element of elements) {
        if (claimedElements.has(element)) {
          continue;
        }

        claimedElements.add(element);
        addObservation(rule, element, rule.selector);
      }
    }

    const fallbackSelector =
      scopeSelector ||
      detectionRules.map((rule) => rule.selector).filter(Boolean).join(', ');

    if (fallbackSelector) {
      const scopedElements = Array.from(document.querySelectorAll(fallbackSelector)).filter(isVisible);
      for (const element of scopedElements) {
        if (claimedElements.has(element)) {
          continue;
        }

        if (hasClaimedAncestor(element)) {
          continue;
        }

        claimedElements.add(element);
        const heuristicRule = deriveHeuristicRule(element);
        addObservation(heuristicRule, element, selectorFor(element));
      }
    }

    for (const rule of detectionRules.filter((item) => item.expected_on_screen)) {
      const key = clean(rule.component_name);
      if (observations.has(key)) {
        continue;
      }

      observations.set(key, {
        component_name: key,
        display_name: rule.display_name || humanize(key),
        instance_count: 0,
        selectors: [rule.selector],
        variant_details: [],
        allow_variant_mix: Boolean(rule.allow_variant_mix),
        expected_on_screen: true,
        selector_confidence: Number(rule.selector_confidence || 0.95),
        source: rule.source || 'feature_inventory',
      });
    }

    return Array.from(observations.values());
  }, {
    detectionRules,
    scopeSelector,
  });
}

function createComponentObservation({
  componentName,
  displayName,
  selector,
  instancesObserved = 0,
  documentedComponents,
  libraryComponents,
  expectedOnScreen = true,
  allowVariantMix = false,
  variantDetails = [],
  selectorConfidence = 0.95,
}) {
  const normalizedName = normalizeComponentName(componentName);
  const documented = documentedComponents.has(normalizedName);
  const inLibrary = libraryComponents.has(normalizedName);
  const observed = instancesObserved > 0;
  const variantSignatures = createVariantSignatures(variantDetails);
  const variantInconsistency = observed && !allowVariantMix && variantSignatures.length > 1;
  const matchStatus = computeComponentMatchStatus({
    observed,
    foundInLibrary: inLibrary,
    expectedOnScreen,
    variantInconsistency,
    checkFailures: [],
  });

  return {
    component_name: normalizedName,
    display_name: displayName || normalizedName,
    observed,
    expected_on_screen: expectedOnScreen,
    instance_count: instancesObserved,
    instances_observed: instancesObserved,
    storybook_status: storybookStatusForComponent(normalizedName, documentedComponents, libraryComponents),
    found_in_central_component_library: inLibrary,
    matching_central_component_library: matchStatus === 'Exact',
    mismatching_central_component_library: matchStatus === 'Variant' || matchStatus === 'Unmapped',
    match_status: matchStatus,
    confidence_score: computeConfidenceScore({
      observed,
      foundInLibrary: inLibrary,
      matchStatus,
      selectorConfidence,
    }),
    selectors: selector ? [selector] : [],
    check_failures: [],
    variant_signatures: variantSignatures.slice(0, 5),
    variant_inconsistency: variantInconsistency,
  };
}

function mergeComponentObservation(existing, incoming) {
  if (!existing) {
    return {
      ...incoming,
      selectors: [...(incoming.selectors || [])],
      check_failures: [...(incoming.check_failures || [])],
    };
  }

  return {
    ...existing,
    display_name: existing.display_name || incoming.display_name,
    observed: existing.observed || incoming.observed,
    expected_on_screen: existing.expected_on_screen || incoming.expected_on_screen,
    instance_count: Math.max(existing.instance_count || 0, incoming.instance_count || 0),
    instances_observed: Math.max(existing.instances_observed || 0, incoming.instances_observed || 0),
    storybook_status: existing.storybook_status || incoming.storybook_status,
    found_in_central_component_library:
      existing.found_in_central_component_library || incoming.found_in_central_component_library,
    selectors: [...new Set([...(existing.selectors || []), ...(incoming.selectors || [])])],
    check_failures: [...new Set([...(existing.check_failures || []), ...(incoming.check_failures || [])])],
    variant_signatures: [...new Set([...(existing.variant_signatures || []), ...(incoming.variant_signatures || [])])].slice(0, 5),
    variant_inconsistency: existing.variant_inconsistency || incoming.variant_inconsistency,
  };
}

function summarizeComponents(components = []) {
  const merged = new Map();

  for (const component of components) {
    if (!component?.component_name) {
      continue;
    }

    const key = normalizeComponentName(component.component_name);
    merged.set(key, mergeComponentObservation(merged.get(key), component));
  }

  const uniqueComponents = Array.from(merged.values()).sort((left, right) =>
    left.component_name.localeCompare(right.component_name)
  );

  const normalizedComponents = uniqueComponents.map((component) => {
    const matchStatus = computeComponentMatchStatus({
      observed: component.observed,
      foundInLibrary: component.found_in_central_component_library,
      expectedOnScreen: component.expected_on_screen,
      variantInconsistency: component.variant_inconsistency,
      checkFailures: component.check_failures || [],
    });

    return {
      ...component,
      match_status: matchStatus,
      matching_central_component_library: matchStatus === 'Exact',
      mismatching_central_component_library: matchStatus === 'Variant' || matchStatus === 'Unmapped',
      confidence_score: computeConfidenceScore({
        observed: component.observed,
        foundInLibrary: component.found_in_central_component_library,
        matchStatus,
      }),
    };
  });

  return {
    components_used: normalizedComponents.reduce(
      (total, component) => total + (component.observed ? component.instance_count || 0 : 0),
      0
    ),
    component_types_detected: normalizedComponents.filter((component) => component.observed).length,
    matching_central_component_library: normalizedComponents.reduce(
      (total, component) =>
        total + (component.match_status === 'Exact' ? component.instance_count || 0 : 0),
      0
    ),
    mismatching_central_component_library: normalizedComponents.reduce(
      (total, component) =>
        total +
        ((component.match_status === 'Variant' || component.match_status === 'Unmapped')
          ? component.instance_count || 0
          : 0),
      0
    ),
    missing_expected_components: normalizedComponents.filter(
      (component) => component.match_status === 'Missing'
    ).length,
    unmapped_components: normalizedComponents.filter(
      (component) => component.match_status === 'Unmapped'
    ).length,
    variant_components: normalizedComponents.filter(
      (component) => component.match_status === 'Variant'
    ).length,
    matching_component_names: normalizedComponents
      .filter((component) => component.match_status === 'Exact')
      .map((component) => component.component_name)
      .sort((left, right) => String(left).localeCompare(String(right))),
    mismatching_component_names: normalizedComponents
      .filter(
        (component) =>
          component.match_status === 'Variant' || component.match_status === 'Unmapped'
      )
      .map((component) => component.component_name)
      .sort((left, right) => String(left).localeCompare(String(right))),
    missing_expected_component_names: normalizedComponents
      .filter((component) => component.match_status === 'Missing')
      .map((component) => component.component_name)
      .sort((left, right) => String(left).localeCompare(String(right))),
    unmapped_component_names: normalizedComponents
      .filter((component) => component.match_status === 'Unmapped')
      .map((component) => component.component_name)
      .sort((left, right) => String(left).localeCompare(String(right))),
    variant_component_names: normalizedComponents
      .filter((component) => component.match_status === 'Variant')
      .map((component) => component.component_name)
      .sort((left, right) => String(left).localeCompare(String(right))),
    components: normalizedComponents,
  };
}

class DesignAuditManager {
  constructor() {
    this.reportPath = process.env.DESIGN_AUDIT_REPORT_PATH || defaultReportPath;
    this.runStartedAt = new Date().toISOString();
    this.scenarios = [];
  }

  reset() {
    this.reportPath = process.env.DESIGN_AUDIT_REPORT_PATH || defaultReportPath;
    this.runStartedAt = new Date().toISOString();
    this.scenarios = [];
  }

  startScenario({ scenarioName, featureUri, product, tags = [] }) {
    const sharedRuleset = loadSharedRuleset();
    const featureRuleset = loadFeatureRuleset(product, featureUri);
    const scenarioRecord = {
      scenario_name: scenarioName,
      feature_uri: featureUri,
      product,
      tags,
      started_at: new Date().toISOString(),
      functional_status: 'unknown',
      findings: [],
      fingerprints: [],
      components: [],
      audit_runtime_ms: 0,
      shared_ruleset_name: sharedRuleset?.ruleset || null,
      feature_ruleset_name: featureRuleset?.feature || null,
    };

    this.scenarios.push(scenarioRecord);

    return {
      scenarioRecord,
      sharedRuleset,
      featureRuleset,
    };
  }

  addFindings(scenarioRecord, findings = []) {
    const existingIds = new Set(scenarioRecord.findings.map((finding) => finding.id));
    for (const finding of findings) {
      if (!existingIds.has(finding.id)) {
        scenarioRecord.findings.push(finding);
        existingIds.add(finding.id);
      }
    }
  }

  addComponents(scenarioRecord, components = []) {
    const summary = summarizeComponents([...(scenarioRecord.components || []), ...components]);
    scenarioRecord.components = summary.components;
    scenarioRecord.component_summary = {
      components_used: summary.components_used,
      component_types_detected: summary.component_types_detected,
      matching_central_component_library: summary.matching_central_component_library,
      mismatching_central_component_library: summary.mismatching_central_component_library,
      missing_expected_components: summary.missing_expected_components,
      unmapped_components: summary.unmapped_components,
      variant_components: summary.variant_components,
      matching_component_names: summary.matching_component_names,
      mismatching_component_names: summary.mismatching_component_names,
      missing_expected_component_names: summary.missing_expected_component_names,
      unmapped_component_names: summary.unmapped_component_names,
      variant_component_names: summary.variant_component_names,
    };
  }

  addRuntime(scenarioRecord, runtimeMs = 0) {
    scenarioRecord.audit_runtime_ms = (scenarioRecord.audit_runtime_ms || 0) + Math.max(0, runtimeMs);
    scenarioRecord.audit_runtime_sec = Number((scenarioRecord.audit_runtime_ms / 1000).toFixed(3));
  }

  finalizeScenario(scenarioRecord, functionalStatus) {
    scenarioRecord.functional_status = functionalStatus || 'unknown';
    scenarioRecord.completed_at = new Date().toISOString();
    const componentSummary = summarizeComponents(scenarioRecord.components || []);
    scenarioRecord.components = componentSummary.components;
    scenarioRecord.component_summary = {
      components_used: componentSummary.components_used,
      component_types_detected: componentSummary.component_types_detected,
      matching_central_component_library: componentSummary.matching_central_component_library,
      mismatching_central_component_library: componentSummary.mismatching_central_component_library,
      missing_expected_components: componentSummary.missing_expected_components,
      unmapped_components: componentSummary.unmapped_components,
      variant_components: componentSummary.variant_components,
      matching_component_names: componentSummary.matching_component_names,
      mismatching_component_names: componentSummary.mismatching_component_names,
      missing_expected_component_names: componentSummary.missing_expected_component_names,
      unmapped_component_names: componentSummary.unmapped_component_names,
      variant_component_names: componentSummary.variant_component_names,
    };
    scenarioRecord.audit_runtime_sec = Number(((scenarioRecord.audit_runtime_ms || 0) / 1000).toFixed(3));
  }

  writeReport() {
    ensureDir(this.reportPath);

    const sharedRuleset = loadSharedRuleset();
    const allFindings = this.scenarios.flatMap((scenario) => scenario.findings);
    const componentSummary = summarizeComponents(
      this.scenarios.flatMap((scenario) => scenario.components || [])
    );
    const totalRuntimeMs = this.scenarios.reduce(
      (total, scenario) => total + (scenario.audit_runtime_ms || 0),
      0
    );
    const ccldsComponentCount = Number(
      sharedRuleset?.coverage_snapshot?.public_runtime_exports ||
        [
          ...(sharedRuleset?.coverage_snapshot?.documented_components || []),
          ...(sharedRuleset?.coverage_snapshot?.undocumented_exports || []),
        ].length ||
        0
    );
    const report = {
      generated_at: new Date().toISOString(),
      run_started_at: this.runStartedAt,
      report_path: this.reportPath,
      summary: {
        scenarios_audited: this.scenarios.length,
        total_findings: allFindings.length,
        by_category: countBy(allFindings, 'category'),
        by_severity: countBy(allFindings, 'severity'),
        components_used: componentSummary.components_used,
        component_types_detected: componentSummary.component_types_detected,
        matching_central_component_library: componentSummary.matching_central_component_library,
        mismatching_central_component_library: componentSummary.mismatching_central_component_library,
        missing_expected_components: componentSummary.missing_expected_components,
        unmapped_components: componentSummary.unmapped_components,
        variant_components: componentSummary.variant_components,
        cclds_component_count: ccldsComponentCount,
        matching_component_names: componentSummary.matching_component_names,
        mismatching_component_names: componentSummary.mismatching_component_names,
        missing_expected_component_names: componentSummary.missing_expected_component_names,
        unmapped_component_names: componentSummary.unmapped_component_names,
        variant_component_names: componentSummary.variant_component_names,
        runtime_ms: totalRuntimeMs,
        runtime_sec: Number((totalRuntimeMs / 1000).toFixed(3)),
      },
      component_analysis: componentSummary.components,
      scenarios: this.scenarios,
    };

    fs.writeFileSync(this.reportPath, JSON.stringify(report, null, 2));
    return report;
  }
}

const designAuditManager = new DesignAuditManager();

function createFindingScreenshotFileName(scenarioName, fingerprint, findingTitle, findingIndex) {
  const safeScenario = cleanText(scenarioName)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  const safeFinding = cleanText(findingTitle)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30);
  const hash = createHash('sha1')
    .update(`${fingerprint}::${findingTitle}::${findingIndex}`)
    .digest('hex')
    .slice(0, 10);

  return `${safeScenario || 'design-audit'}-${safeFinding || 'finding'}-${hash}.png`;
}

function extractFindingSelectors(finding = {}) {
  const selectors = new Set();

  for (const selector of finding.report_context?.affected_elements || []) {
    if (cleanText(selector)) {
      selectors.add(cleanText(selector));
    }
  }

  for (const example of finding.evidence?.examples || []) {
    if (cleanText(example?.selector)) {
      selectors.add(cleanText(example.selector));
    }
  }

  return [...selectors].slice(0, 4);
}

async function captureDesignScreenshot(page, scenarioName, fingerprint, finding, findingIndex = 0) {
  if (!page || page.isClosed() || !finding) {
    return null;
  }

  const selectors = extractFindingSelectors(finding);
  if (selectors.length === 0) {
    return null;
  }

  const screenshotPath = path.resolve(
    designScreenshotDir,
    createFindingScreenshotFileName(
      scenarioName,
      fingerprint,
      finding.report_context?.summary_title || finding.title || `finding-${findingIndex + 1}`,
      findingIndex
    )
  );
  ensureDir(screenshotPath);
  const screenshot = await captureFocusedComponentScreenshot(page, {
    path: screenshotPath,
    selectors,
    padding: 20,
    maxMatchesPerSelector: 2,
  });

  if (!screenshot) {
    return null;
  }

  return {
    absolute_path: screenshotPath,
    project_relative_path: path.relative(projectRoot, screenshotPath).split(path.sep).join('/'),
    focus_selectors: selectors,
  };
}

function attachScreenshotEvidence(finding, screenshot = null) {
  if (!finding || !screenshot) {
    return finding;
  }

  return {
    ...finding,
    evidence: {
      ...finding.evidence,
      screenshot_path: screenshot.project_relative_path,
      screenshot_absolute_path: screenshot.absolute_path,
      screenshot_focus_selectors: screenshot.focus_selectors || [],
    },
    report_context: {
      ...(finding.report_context || {}),
      screenshot_path: screenshot.project_relative_path,
      screenshot_focus_selectors: screenshot.focus_selectors || [],
    },
  };
}

async function attachFindingScreenshots(page, scenarioName, fingerprint, findings = []) {
  if (!page || page.isClosed() || findings.length === 0) {
    return findings;
  }

  const findingsWithScreenshots = [];

  for (const [index, finding] of findings.entries()) {
    const screenshot = await captureDesignScreenshot(
      page,
      scenarioName,
      fingerprint,
      finding,
      index
    ).catch(() => null);

    findingsWithScreenshots.push(attachScreenshotEvidence(finding, screenshot));
  }

  return findingsWithScreenshots;
}

async function captureFingerprint(page, designAuditConfig = {}) {
  const selectors = designAuditConfig.fingerprint_selectors || {};
  const result = await page.evaluate(({ activeTabSelector, searchInputSelector }) => {
    const visibleText = (selector) => {
      if (!selector) return '';
      const element = document.querySelector(selector);
      return element ? element.textContent?.replace(/\s+/g, ' ').trim() || '' : '';
    };

    const valueOf = (selector) => {
      if (!selector) return '';
      const element = document.querySelector(selector);
      if (!element) return '';
      return 'value' in element ? String(element.value || '') : '';
    };

    const firstText = (selectorsList) => {
      for (const selector of selectorsList) {
        const element = document.querySelector(selector);
        const text = element?.textContent?.replace(/\s+/g, ' ').trim();
        if (text) return text;
      }
      return '';
    };

    return {
      activeTab: visibleText(activeTabSelector),
      searchValue: valueOf(searchInputSelector),
      titleText: firstText(['h1', 'h2', 'h3', '[role="heading"]']),
    };
  }, {
    activeTabSelector: selectors.active_tab || null,
    searchInputSelector: selectors.search_input || null,
  });

  const url = page.url();
  return [url, result.activeTab, result.searchValue, result.titleText].join('|');
}

async function collectSharedPageSignals(page, automationConfig = {}) {
  return page.evaluate((config) => {
    const interactiveSelector = config?.observer_selectors?.interactive || '';
    const imageSelector = config?.observer_selectors?.images || 'img';
    const externalLinkSelector = config?.observer_selectors?.external_links || 'a[target="_blank"]';
    const maxElements = config?.max_elements_per_audit || 40;
    const spacingStep = config?.spacing_step_px || 4;
    const spacingTolerance = config?.spacing_tolerance_px || 1;
    const radiusScale = config?.radius_scale_px || [0, 2, 4, 8, 12, 16, 20, 24, 1000];
    const radiusTolerance = config?.radius_tolerance_px || 1;
    const expectedFontFamily = String(config?.expected_font_family || '').toLowerCase();
    const securityPatterns = config?.security_patterns || [];

    const isVisible = (element) => {
      if (!(element instanceof HTMLElement)) {
        return false;
      }
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        rect.width > 0 &&
        rect.height > 0
      );
    };

    const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();

    const selectorFor = (element) => {
      const tag = element.tagName?.toLowerCase() || 'unknown';
      const id = element.id ? `#${element.id}` : '';
      const role = element.getAttribute('role');
      const classes = clean(element.className || '')
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((name) => `.${name}`)
        .join('');
      const rolePart = role ? `[role="${role}"]` : '';
      return `${tag}${id}${classes}${rolePart}`;
    };

    const isSpacingAligned = (value) => {
      if (value <= 0.5) return true;
      const nearest = Math.round(value / spacingStep) * spacingStep;
      return Math.abs(nearest - value) <= spacingTolerance;
    };

    const isRadiusAllowed = (value) => {
      if (value <= 0.5) return true;
      return radiusScale.some((allowed) => {
        if (allowed >= 999 && value >= 999) {
          return true;
        }
        return Math.abs(value - allowed) <= radiusTolerance;
      });
    };

    const interactiveElements = Array.from(document.querySelectorAll(interactiveSelector))
      .filter(isVisible)
      .slice(0, maxElements);

    const spacingViolations = [];
    const radiusViolations = [];
    const unlabeledControls = [];
    const fontViolations = [];

    for (const element of interactiveElements) {
      const style = window.getComputedStyle(element);
      const descriptor = selectorFor(element);
      const paddingValues = [
        parseFloat(style.paddingTop || '0'),
        parseFloat(style.paddingRight || '0'),
        parseFloat(style.paddingBottom || '0'),
        parseFloat(style.paddingLeft || '0'),
      ].filter((value) => value > 0.5);

      const gapValue = parseFloat(style.gap || '0');
      const radiusValue = parseFloat(style.borderRadius || '0');
      const text = clean(element.textContent);
      const ariaLabel = clean(element.getAttribute('aria-label'));
      const title = clean(element.getAttribute('title'));

      const spacingValues = [...paddingValues];
      if (gapValue > 0.5) {
        spacingValues.push(gapValue);
      }

      if (spacingValues.some((value) => !isSpacingAligned(value))) {
        spacingViolations.push({
          selector: descriptor,
          values: spacingValues.slice(0, 5),
        });
      }

      if (!isRadiusAllowed(radiusValue)) {
        radiusViolations.push({
          selector: descriptor,
          value: radiusValue,
        });
      }

      const hasLabel = Boolean(text || ariaLabel || title);
      if (!hasLabel) {
        unlabeledControls.push({ selector: descriptor });
      }

      if (expectedFontFamily && !String(style.fontFamily || '').toLowerCase().includes(expectedFontFamily)) {
        fontViolations.push({
          selector: descriptor,
          fontFamily: style.fontFamily,
        });
      }
    }

    const imagesMissingAlt = Array.from(document.querySelectorAll(imageSelector))
      .filter(isVisible)
      .filter((image) => !(image.getAttribute('alt') || '').trim())
      .slice(0, 10)
      .map((image) => ({ selector: selectorFor(image) }));

    const linksMissingRel = Array.from(document.querySelectorAll(externalLinkSelector))
      .filter(isVisible)
      .filter((link) => {
        const rel = clean(link.getAttribute('rel'));
        return !(rel.includes('noopener') && rel.includes('noreferrer'));
      })
      .slice(0, 10)
      .map((link) => ({
        selector: selectorFor(link),
        href: link.getAttribute('href') || '',
      }));

    const bodyText = clean(document.body?.innerText || '').slice(0, 5000);
    const secretMatches = [];
    for (const pattern of securityPatterns) {
      try {
        const regex = new RegExp(pattern.regex, 'g');
        const matches = bodyText.match(regex) || [];
        if (matches.length > 0) {
          secretMatches.push({
            name: pattern.name,
            sample: matches[0],
            count: matches.length,
          });
        }
      } catch {
        // Ignore invalid regex patterns
      }
    }

    return {
      bodyFontFamily: window.getComputedStyle(document.body).fontFamily,
      spacingViolations,
      radiusViolations,
      unlabeledControls,
      fontViolations,
      imagesMissingAlt,
      linksMissingRel,
      secretMatches,
      visibleInteractiveCount: interactiveElements.length,
    };
  }, automationConfig);
}

async function runSelectorCheck(page, check) {
  const locator = page.locator(check.selector);

  if (check.expect === 'visible') {
    const count = await locator.count();
    if (count === 0) {
      return `Expected visible element for selector ${check.selector}, but none were found.`;
    }

    const visible = await locator.first().isVisible().catch(() => false);
    if (!visible) {
      return `Selector ${check.selector} exists but is not visible on the current screen.`;
    }

    return null;
  }

  if (check.expect === 'count_at_least') {
    const count = await locator.count();
    if (count < Number(check.value || 0)) {
      return `Expected at least ${check.value} match(es) for selector ${check.selector}, found ${count}.`;
    }

    return null;
  }

  if (check.expect === 'count_between') {
    const count = await locator.count();
    const min = Number(check.min || 0);
    const max = Number(check.max || Number.MAX_SAFE_INTEGER);
    if (count < min || count > max) {
      return `Expected selector ${check.selector} count between ${min} and ${max}, found ${count}.`;
    }

    return null;
  }

  if (check.expect === 'attribute_equals') {
    const count = await locator.count();
    if (count === 0) {
      return `Expected element for selector ${check.selector} to validate ${check.attribute}, but none were found.`;
    }

    const actualValue = await locator.first().getAttribute(check.attribute);
    if ((actualValue || '') !== String(check.value || '')) {
      return `Expected attribute ${check.attribute} on selector ${check.selector} to equal "${check.value}", found "${actualValue || ''}".`;
    }

    return null;
  }

  return null;
}

async function collectVariantDetails(page, selector, limit = 20) {
  const locator = page.locator(selector);

  return locator.evaluateAll((elements, maxItems) => {
    const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
    const isVisible = (element) => {
      if (!(element instanceof HTMLElement)) {
        return false;
      }

      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        rect.width > 0 &&
        rect.height > 0
      );
    };
    const summarizeClasses = (element) =>
      clean(element.className || '')
        .split(' ')
        .filter(Boolean)
        .slice(0, 4)
        .join('.');

    return elements.filter(isVisible).slice(0, maxItems).map((element) => {
      const style = window.getComputedStyle(element);
      const states = [
        element.getAttribute('aria-selected') === 'true' ? 'selected' : null,
        element.getAttribute('aria-checked') === 'true' ? 'checked' : null,
        element.matches(':disabled') ? 'disabled' : null,
      ]
        .filter(Boolean)
        .join('|');

      const signature = [
        element.tagName.toLowerCase(),
        element.getAttribute('role') || '',
        summarizeClasses(element),
        style.borderRadius,
        style.backgroundColor,
        style.color,
        style.fontSize,
        style.fontWeight,
        style.paddingTop,
        style.paddingRight,
        style.paddingBottom,
        style.paddingLeft,
        states,
      ].join('|');

      return {
        signature,
        role: element.getAttribute('role') || '',
        class_name: summarizeClasses(element),
        border_radius: style.borderRadius,
        background_color: style.backgroundColor,
        color: style.color,
        font_size: style.fontSize,
        font_weight: style.fontWeight,
        padding: [style.paddingTop, style.paddingRight, style.paddingBottom, style.paddingLeft],
        state: states,
      };
    });
  }, limit);
}

async function collectObservedComponents({ page, sharedRuleset, featureRuleset }) {
  const auditConfig = featureRuleset?.automation_config?.design_audit;
  const documentedComponents = getDocumentedComponentSet(sharedRuleset);
  const libraryComponents = getLibraryComponentSet(sharedRuleset);
  const explicitInventory = auditConfig?.component_inventory || [];
  const fallbackInventory = [...(auditConfig?.component_checks || []), ...(auditConfig?.ux_checks || [])]
    .filter((check) => check.component_name)
    .map((check) => ({
      component_name: check.component_name,
      name: check.component_name,
      selector: check.selector,
      required: true,
    }));
  const expectedInventory = explicitInventory.length > 0 ? explicitInventory : fallbackInventory;
  const sharedDetectionRules = sharedRuleset?.automation_config?.component_detection_rules || [];
  const scopeSelector =
    sharedRuleset?.automation_config?.component_detection_scope_selector ||
    sharedRuleset?.automation_config?.observer_selectors?.interactive ||
    "button, [role='button'], [role='tab'], input, textarea, select";

  const observedComponents = [];
  const detectedComponents = await detectRenderedComponents({
    page,
    expectedInventory,
    sharedDetectionRules,
    scopeSelector,
  }).catch(() => []);

  for (const item of detectedComponents) {
    const instancesObserved = Number(item.instance_count || 0);
    const expectedOnScreen = item.expected_on_screen === true;

    if (!instancesObserved && !expectedOnScreen) {
      continue;
    }

    observedComponents.push(
      createComponentObservation({
        componentName: item.component_name,
        displayName: item.display_name || humanizeComponentName(item.component_name),
        selector: item.selectors?.[0] || '',
        instancesObserved,
        documentedComponents,
        libraryComponents,
        expectedOnScreen,
        allowVariantMix: item.allow_variant_mix === true,
        variantDetails: item.variant_details || [],
        selectorConfidence: Number(item.selector_confidence || 0.75),
      })
    );
  }

  return summarizeComponents(observedComponents).components;
}

function applyCheckResultsToComponents(components = [], checkResults = []) {
  const byName = new Map(
    components.map((component) => [normalizeComponentName(component.component_name), component])
  );

  for (const result of checkResults) {
    const componentName = normalizeComponentName(result.componentName);
    if (!componentName || !byName.has(componentName) || !result.failed) {
      continue;
    }

    const component = byName.get(componentName);
    component.check_failures = [...new Set([...(component.check_failures || []), result.name])];
  }

  return summarizeComponents(Array.from(byName.values())).components;
}

async function collectFeatureAudit({ page, scenarioName, featureUri, featureRuleset, url }) {
  const auditConfig = featureRuleset?.automation_config?.design_audit;
  if (!auditConfig?.enabled) {
    return {
      findings: [],
      checkResults: [],
    };
  }

  const checks = [
    ...(auditConfig.component_checks || []),
    ...(auditConfig.ux_checks || []),
  ];

  const findings = [];
  const checkResults = [];
  for (const check of checks) {
    try {
      const message = await runSelectorCheck(page, check);
      checkResults.push({
        name: check.name,
        componentName: check.component_name || '',
        failed: Boolean(message),
      });
      if (message) {
        findings.push(
          buildFinding({
            scenarioName,
            featureUri,
            url,
            category: check.category || 'frontend',
            severity: check.severity || 'low',
            confidence: check.confidence || 'medium',
            title: check.name,
            message,
            component: check.component_name || check.name,
            label: 'rule-based finding',
          })
        );
      }
    } catch (error) {
      checkResults.push({
        name: check.name,
        componentName: check.component_name || '',
        failed: true,
      });
      findings.push(
        buildFinding({
          scenarioName,
          featureUri,
          url,
          category: check.category || 'frontend',
          severity: 'low',
          confidence: 'low',
          title: `${check.name} audit could not complete`,
          message: error.message,
          component: check.component_name || check.name,
          label: 'heuristic supplement',
        })
      );
    }
  }

  return {
    findings,
    checkResults,
  };
}

function collectSharedFindings({ sharedSignals, sharedRuleset, scenarioName, featureUri, url }) {
  const findings = [];
  const automationConfig = sharedRuleset?.automation_config || {};
  const expectedFontFamily = String(automationConfig.expected_font_family || '').toLowerCase();

  if (
    expectedFontFamily &&
    !String(sharedSignals.bodyFontFamily || '').toLowerCase().includes(expectedFontFamily)
  ) {
    findings.push(
      buildFinding({
        scenarioName,
        featureUri,
        url,
        category: 'design_system_compliance',
        severity: 'medium',
        confidence: 'high',
        title: 'Base font family drift',
        message: `Expected body font family to include "${automationConfig.expected_font_family}", found "${sharedSignals.bodyFontFamily}".`,
        label: 'documented mismatch',
        evidence: {
          body_font_family: sharedSignals.bodyFontFamily,
        },
      })
    );
  }

  if ((sharedSignals.spacingViolations || []).length > 0) {
    findings.push(
      buildFinding({
        scenarioName,
        featureUri,
        url,
        category: 'design_system_compliance',
        severity: 'low',
        confidence: 'medium',
        title: 'Spacing values outside token scale',
        message: `Found ${sharedSignals.spacingViolations.length} visible interactive element(s) with spacing values outside the ${automationConfig.spacing_step_px}px token grid.`,
        label: 'rule-based finding',
        evidence: {
          spacing_step_px: automationConfig.spacing_step_px,
          spacing_tolerance_px: automationConfig.spacing_tolerance_px,
          examples: sharedSignals.spacingViolations.slice(0, 5),
        },
      })
    );
  }

  if ((sharedSignals.radiusViolations || []).length > 0) {
    findings.push(
      buildFinding({
        scenarioName,
        featureUri,
        url,
        category: 'design_system_compliance',
        severity: 'low',
        confidence: 'medium',
        title: 'Border radius outside approved token scale',
        message: `Found ${sharedSignals.radiusViolations.length} visible interactive element(s) using border radius values outside the approved token scale.`,
        label: 'rule-based finding',
        evidence: {
          radius_scale_px: automationConfig.radius_scale_px,
          radius_tolerance_px: automationConfig.radius_tolerance_px,
          examples: sharedSignals.radiusViolations.slice(0, 5),
        },
      })
    );
  }

  if ((sharedSignals.unlabeledControls || []).length > 0) {
    findings.push(
      buildFinding({
        scenarioName,
        featureUri,
        url,
        category: 'ux',
        severity: 'medium',
        confidence: 'medium',
        title: 'Interactive controls without visible or accessible labels',
        message: `Found ${sharedSignals.unlabeledControls.length} visible interactive control(s) without text, title, or aria-label.`,
        label: 'heuristic supplement',
        evidence: {
          examples: sharedSignals.unlabeledControls.slice(0, 5),
        },
      })
    );
  }

  if ((sharedSignals.fontViolations || []).length > 0) {
    findings.push(
      buildFinding({
        scenarioName,
        featureUri,
        url,
        category: 'design_system_compliance',
        severity: 'medium',
        confidence: 'high',
        title: 'Base font family drift',
        message: `Found ${sharedSignals.fontViolations.length} visible interactive element(s) not using the expected base font family.`,
        label: 'documented mismatch',
        evidence: {
          examples: sharedSignals.fontViolations.slice(0, 5),
        },
      })
    );
  }

  if ((sharedSignals.imagesMissingAlt || []).length > 0) {
    findings.push(
      buildFinding({
        scenarioName,
        featureUri,
        url,
        category: 'ux',
        severity: 'medium',
        confidence: 'high',
        title: 'Visible images missing alt text',
        message: `Found ${sharedSignals.imagesMissingAlt.length} visible image(s) without alt text.`,
        label: 'heuristic supplement',
        evidence: {
          examples: sharedSignals.imagesMissingAlt.slice(0, 5),
        },
      })
    );
  }

  if ((sharedSignals.linksMissingRel || []).length > 0) {
    findings.push(
      buildFinding({
        scenarioName,
        featureUri,
        url,
        category: 'security',
        severity: 'medium',
        confidence: 'high',
        title: 'External links missing rel protections',
        message: `Found ${sharedSignals.linksMissingRel.length} external link(s) using target="_blank" without rel="noopener noreferrer".`,
        label: 'rule-based finding',
        evidence: {
          examples: sharedSignals.linksMissingRel.slice(0, 5),
        },
      })
    );
  }

  if ((sharedSignals.secretMatches || []).length > 0) {
    findings.push(
      buildFinding({
        scenarioName,
        featureUri,
        url,
        category: 'security',
        severity: 'high',
        confidence: 'high',
        title: 'Secret-like values visible in UI text',
        message: `Found ${sharedSignals.secretMatches.length} secret pattern match category(s) in visible UI text.`,
        label: 'rule-based finding',
        evidence: {
          patterns: sharedSignals.secretMatches.slice(0, 5),
        },
      })
    );
  }

  return findings;
}

async function auditVisibleScreen({ page, scenarioName, featureUri, sharedRuleset, featureRuleset }) {
  const auditStartedAt = Date.now();

  if (!page || page.isClosed()) {
    return { fingerprint: null, findings: [], components: [], runtimeMs: 0 };
  }

  const url = page.url();
  if (!url || !url.startsWith('http')) {
    return { fingerprint: null, findings: [], components: [], runtimeMs: 0 };
  }

  const screenUrlPattern =
    featureRuleset?.automation_config?.design_audit?.screen_url_pattern ||
    featureRuleset?.design?.url_pattern;

  if (screenUrlPattern && !url.includes(screenUrlPattern)) {
    return { fingerprint: null, findings: [], components: [], runtimeMs: 0 };
  }

  const observedComponents = await collectObservedComponents({
    page,
    sharedRuleset,
    featureRuleset,
  });
  const sharedSignals = await collectSharedPageSignals(page, sharedRuleset?.automation_config || {});
  const sharedFindings = collectSharedFindings({
    sharedSignals,
    sharedRuleset,
    scenarioName,
    featureUri,
    url,
  });
  const featureAudit = await collectFeatureAudit({
    page,
    scenarioName,
    featureUri,
    featureRuleset,
    url,
  });
  const components = applyCheckResultsToComponents(observedComponents, featureAudit.checkResults);

  const fingerprint = await captureFingerprint(
    page,
    featureRuleset?.automation_config?.design_audit || {}
  );

  return {
    fingerprint,
    findings: [...sharedFindings, ...featureAudit.findings],
    components,
    runtimeMs: Date.now() - auditStartedAt,
  };
}

export function resetDesignAuditRun() {
  designAuditManager.reset();
}

export function startDesignAuditScenario({ scenarioName, featureUri, product, tags }) {
  return designAuditManager.startScenario({ scenarioName, featureUri, product, tags });
}

export async function maybeAuditVisibleScreen({ page, scenarioContext }) {
  if (!scenarioContext?.scenarioRecord) {
    return;
  }

  try {
    const { fingerprint, findings, components, runtimeMs } = await auditVisibleScreen({
      page,
      scenarioName: scenarioContext.scenarioRecord.scenario_name,
      featureUri: scenarioContext.scenarioRecord.feature_uri,
      sharedRuleset: scenarioContext.sharedRuleset,
      featureRuleset: scenarioContext.featureRuleset,
    });

    if (!fingerprint || scenarioContext.scenarioRecord.fingerprints.includes(fingerprint)) {
      return;
    }

    scenarioContext.scenarioRecord.fingerprints.push(fingerprint);
    const findingsWithScreenshots = await attachFindingScreenshots(
      page,
      scenarioContext.scenarioRecord.scenario_name,
      fingerprint,
      findings
    ).catch(() => findings);
    designAuditManager.addFindings(
      scenarioContext.scenarioRecord,
      findingsWithScreenshots
    );
    designAuditManager.addComponents(scenarioContext.scenarioRecord, components);
    designAuditManager.addRuntime(scenarioContext.scenarioRecord, runtimeMs);
  } catch {
    // Design audit must never block the functional run.
  }
}

export function finalizeDesignAuditScenario({ scenarioContext, functionalStatus }) {
  if (!scenarioContext?.scenarioRecord) {
    return;
  }

  designAuditManager.finalizeScenario(scenarioContext.scenarioRecord, functionalStatus);
}

export function writeDesignAuditReport() {
  return designAuditManager.writeReport();
}
