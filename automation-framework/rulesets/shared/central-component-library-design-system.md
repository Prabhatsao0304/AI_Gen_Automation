# Ruleset: Central Component Library Design System

> **Scope:** Shared / Cross-product  
> **Source Library:** `@farmart-engineering/central-component-library`  
> **Library Version:** `1.6.7`  
> **Author:** OpenAI Codex (AI-assisted draft)  
> **Created:** 2026-04-14  
> **Status:** draft  

---

## 1. Overview

This ruleset defines how product screens should be validated against the FarMart central component library and its Storybook documentation. It is intended to be used as a shared source of truth for future automation that checks design-system compliance, UX consistency, documented variants/states, and governance gaps.

This ruleset is based on:
- the public component export surface from `central-component-library/src/index.tsx`
- the pattern hierarchy from `central-component-library/src/patterns/index.ts`
- the Storybook source loaded from `central-component-library/stories/**`
- the central theme and design tokens from `central-component-library/src/theme`
- the `designVariant` grammar from `central-component-library/src/utils/DesignVariantsUtils.tsx`

---

## 2. Scope

### In Scope
- Product screens that use components exported from the central component library public API
- Component-level compliance for atoms, molecules, organisms, templates, and documented library components
- Storybook-documented component, variant, and state validation
- Design token usage for spacing, radius, typography, and palette
- UX consistency where approved library patterns already exist
- Documentation governance gaps for exported but undocumented components
- Production observer rules for classifying documented, undocumented, and bypassed components

### Limited Scope
- Exported public components with no direct Storybook coverage can be checked only with rule-based validation and governance-gap reporting
- Exact visual comparison is allowed only for direct Storybook story targets

### Out of Scope
- Full screen-level pixel-perfect compliance using Storybook alone
- Backend logic validation
- Business workflow correctness outside the documented UI scope
- Product usage inventory without live observation or code analysis

---

## 3. Coverage Snapshot

### Current Library Snapshot
- Approximate public runtime exports: **95**
- Direct Storybook story targets: **65**
- Exported but not directly documented in Storybook: **30**

### Directly Documented In Storybook
- `Accordion`
- `AccordionAdvanced`
- `AccordionGroup`
- `Alert`
- `AspectRatio`
- `Audio`
- `Autocomplete`
- `Avatar`
- `BaseErrorTemplate`
- `BottomSheet`
- `Breadcrumbs`
- `Button`
- `Card`
- `CheckBox`
- `Chip`
- `CircularProgress`
- `ConfirmationModal`
- `CustomDataGrid`
- `DataTable`
- `DatePicker`
- `DetailCard`
- `DetailPageTemplate`
- `DetailsCard`
- `Divider`
- `DocCard`
- `DocCardV2`
- `DocumentRenderer`
- `Drawer`
- `DynamicAvatar`
- `DynamicSelect`
- `ErrorTemplate`
- `FormField`
- `FormattedTypography`
- `IconButton`
- `Image`
- `InfoBlock`
- `Input`
- `KeyValue`
- `KeyValueCard`
- `LinearProgress`
- `ListItem`
- `MetricProgressBar`
- `Modal`
- `MultiLevelSelect`
- `MultiSelect`
- `NestedKeyValue`
- `Radio`
- `RadioButton`
- `SearchBar`
- `Select`
- `Skeleton`
- `Slider`
- `SnackBar`
- `Stepper`
- `Switch`
- `TabBar`
- `Table`
- `Tabs`
- `Textarea`
- `Ticker`
- `ToggleButtonGroup`
- `Tooltip`
- `Typography`
- `UrlEmbeddedModal`
- `Video`

### Exported But Not Directly Documented In Storybook
- `AccordionDetails`
- `AutocompleteListbox`
- `AutocompleteOption`
- `BottomSheetProvider`
- `Box`
- `Column`
- `DocumentViewerEvent`
- `Grid`
- `ImageSlider`
- `Label`
- `Link`
- `List`
- `ListDivider`
- `ListItemButton`
- `ListItemContent`
- `ListItemDecorator`
- `ListSubheader`
- `LoginTemplate`
- `MultiLevelSelectV2`
- `Option`
- `Row`
- `Sheet`
- `Stack`
- `Step`
- `StepButton`
- `StepIndicator`
- `Tab`
- `TabList`
- `TabPanel`
- `ToastProvider`

---

## 4. Source Of Truth Rules

### Primary Sources
1. The public component API in `central-component-library/src/index.tsx`
2. The pattern hierarchy in `central-component-library/src/patterns/index.ts`
3. Storybook source stories from `central-component-library/stories/**`
4. The merged theme in `central-component-library/src/theme/index.ts`
5. The tokens in `central-component-library/src/theme/themeTokens.ts`
6. The `designVariant` grammar in `central-component-library/src/utils/DesignVariantsUtils.tsx`

### Source Priority
When validating a product screen, the system must use this order:
1. Direct Storybook story target
2. Theme and token definitions
3. Public component export contract
4. Approved product baseline, only if Storybook coverage is missing

### Source Rules
- A component is considered a **documented component** only if it is the direct target of a Storybook story.
- A component used only as a helper inside another story is **not** considered directly documented.
- A component exported from the public API but not documented in Storybook must be flagged as a **documentation governance gap**.
- A product implementation that recreates an existing public component with custom code must be flagged as a **design-system bypass**.
- A variant or state used in product but not represented in Storybook must be flagged as a **variant/state documentation gap**.

---

## 5. Design Rules And Regulations

### Public API Usage
- Product teams must use public components exported from the central component library where an approved library component already exists.
- Product teams should use the highest suitable abstraction available:
  - templates before organisms
  - organisms before molecules
  - molecules before atoms

### Token Usage
- Spacing must follow the library spacing function: `0.25rem * factor`
- Radius must follow the approved token scale:
  - `none`
  - `xs`
  - `sm`
  - `md`
  - `lg`
  - `xl`
  - `xl2`
  - `xl3`
  - `circular`
- Typography must use the approved library font family: `Noto Sans, sans-serif`
- Typography should stay within the approved font-size, font-weight, and line-height system from the central theme
- Custom typography tokens such as `label-sm`, `label-md`, and `body-xxs` must be used consistently where applicable

### Variant Rules
- Where a component supports `designVariant`, the allowed grammar is:
  - variant: `plain`, `outlined`, `soft`, `solid`
  - size: `sm`, `md`, `lg`
  - color: `primary`, `neutral`, `danger`, `success`, `warning`
- Product implementations must not use undocumented `designVariant` combinations unless explicitly approved.

### Documentation Rules
- Public visual components should not be considered complete until they have direct Storybook documentation.
- Public subcomponents such as `TabPanel`, `StepButton`, `AccordionDetails`, or `AutocompleteOption` must either:
  - have direct Storybook docs, or
  - be explicitly documented in parent component stories/docs
- Public providers and API-style exports such as `ToastProvider`, `BottomSheetProvider`, or `DocumentViewerEvent` must have usage documentation even if they do not have visual stories.

### Styling Rules
- Product implementations should inherit from the central theme instead of applying arbitrary local styling.
- Hardcoded values should not replace approved spacing, radius, typography, or palette tokens without explicit approval.

---

## 6. Design UX Rules

### Pattern Usage
- Navigation should prefer documented library patterns such as `Breadcrumbs`, `TabBar`, `Tabs`, and `Drawer`.
- Form UX should prefer documented inputs and form patterns such as `Input`, `Select`, `Autocomplete`, `MultiSelect`, `Radio`, `Switch`, `CheckBox`, `DatePicker`, and `FormField`.
- Primary and secondary actions should use documented `Button` patterns rather than ad hoc CTA styling.
- Data and content display should prefer patterns such as `Table`, `DataTable`, `CustomDataGrid`, `Accordion`, `KeyValue`, `ListItem`, and `SearchBar`.
- Feedback and recovery flows should prefer documented patterns such as `CircularProgress`, `LinearProgress`, `SnackBar`, `Modal`, `ConfirmationModal`, `ErrorTemplate`, and `BaseErrorTemplate`.

### Template Rules
- If a library template exists, such as `DetailPageTemplate`, `LoginTemplate`, or `ErrorTemplate`, product teams should not rebuild the same user flow inconsistently without approval.

### State Rules
- Relevant component states must be complete and usable:
  - default
  - selected / active
  - expanded / collapsed
  - disabled
  - loading
  - empty
  - success
  - error
  - hover / focus where meaningful
- If Storybook shows a state or variant, product should support it consistently when the component is used in the same context.
- If a product omits an expected state for a public component, the system must flag a UX consistency issue.

### Readability And Hierarchy
- Text should use `Typography` or `FormattedTypography` patterns rather than arbitrary typographic styling.
- Components that affect core flows such as search, selection, stepper progression, modals, bottom sheets, and confirmation patterns must preserve documented interaction expectations.
- If a screen uses a custom pattern where a documented library pattern already exists, the system must flag both UX inconsistency and design-system inconsistency.

---

## 7. Production Observer Rules

### Live Classification
For each live screen, the observer must classify each major UI element as one of:
- documented library component
- undocumented public library export
- non-library custom component

### Mapping Rules
- The observer must map live components back to the root public API whenever possible.
- For documented library components, the observer must compare the live implementation against:
  - Storybook story target
  - Storybook-documented variants and states
  - central theme and token values
- For undocumented public exports, the observer must:
  - run rule-based validation using tokens and public API rules
  - flag a documentation governance gap
- For custom replacements where a library component exists, the observer must flag a design-system bypass.

### Capture Requirements
The observer must capture:
- screenshots
- DOM structure
- computed styles
- accessible names / labels
- interaction states
- viewport size
- theme context where relevant

### Validation Requirements
The observer must validate:
- token usage for spacing, padding, radius, typography, and palette
- allowed variant grammar where `designVariant`, `variant`, `size`, or `color` are part of the component API
- relevant state behavior:
  - hover
  - focus
  - active / selected
  - disabled
  - loading
  - error
  - empty
  - expanded / collapsed
- responsive behavior across approved viewport sizes

### Finding Labels
Every finding must be labeled as one of:
- documented mismatch
- documented match
- documentation gap
- variant / state gap
- design-system bypass
- rule-based finding
- heuristic supplement

### Output Requirements
Every production finding should include:
- component name
- Storybook status
- issue category
- severity
- confidence
- evidence
- recommended next action

---

## 8. Dependencies
- **Requires component source:** Yes
- **Requires Storybook source:** Yes
- **Primary story source:** `central-component-library/stories/**`
- **Primary public API source:** `central-component-library/src/index.tsx`
- **Primary theme source:** `central-component-library/src/theme/index.ts`
- **Primary token source:** `central-component-library/src/theme/themeTokens.ts`
- **Primary variant grammar source:** `central-component-library/src/utils/DesignVariantsUtils.tsx`
