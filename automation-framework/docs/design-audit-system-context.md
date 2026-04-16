# Design Audit System Context

## Purpose

This document captures the design context of the automation framework’s non-blocking design audit system:

- what problem the system is solving
- what research and findings shaped the solution
- what was built
- how the system works today
- what impact it has on product, design, development, and testing

This is a system-level reference for the current design audit implementation inside the automation framework.

---

## What We Are Solving

The original automation framework was focused on functional validation:

- does the screen load
- does the flow work
- do key UI actions behave correctly

That was necessary, but not enough for design and product review.

The gap was:

- the UI could function correctly but still drift away from the approved design system
- components could be custom, inconsistent, or undocumented
- spacing, typography, and radius could drift from the Central Component Library Design System (`CCL`)
- accessibility issues could exist without failing the functional flow
- Slack and reports could show test success while hiding design quality issues

The design audit system was created to solve that gap.

The goal was to add a **non-blocking design quality layer** to the existing automation framework so that every run can also answer:

- is the live UI still aligned with the design system
- which rendered components match the central library
- which components are unmapped or mismatching
- where are the token or accessibility drifts
- what should design and development improve next

---

## Research And Discovery

### 1. Automation Framework Reality

The automation repo was originally a Playwright + Cucumber system with shared login, HTML/JSON reports, and Slack reporting.

The real implemented scope was smaller than the high-level repo structure suggested:

- functional automation was working
- design-specific validation was minimal
- the current FMT OS Purchase Order flow was the main live feature path

This meant the design audit had to be added carefully without disturbing the functional test flow.

### 2. Central Component Library Research

The actual central component library and Storybook were investigated separately from the automation repo.

Key findings:

- the central component library is real and Storybook-backed
- the library exports a wider public API than what is directly documented in Storybook
- Storybook is strong enough to act as a documentation source for documented components
- Storybook alone is not a full design-system truth for all exports

This led to a key decision:

- `CCL` is the primary truth for component correctness, tokens, and variant/system governance
- Storybook is the documentation truth for documented components
- undocumented exported components are governance gaps, not automatically invalid design mismatches

### 3. Design-System Governance Findings

During research, the following patterns were found:

- some components are directly documented and safe to validate strictly
- some components are public exports but not directly documented
- some product-rendered controls are not mapped to the library at all

This meant the system needed to classify live UI into:

- documented library component
- undocumented public library export
- non-library custom component

### 4. Reporting Gaps

Before the design audit work:

- Slack mostly reflected functional results
- HTML reports reflected functional output first
- design issues were either missing or hard to understand
- screenshots for design mismatches were not clearly surfaced

This led to the design report and dashboard work.

---

## Principles Used To Build The System

The design audit system was built around these principles:

### Non-blocking first

Design issues should not fail the functional suite by default.

This keeps:

- functional validation stable
- runtime practical
- design review informative instead of disruptive

### Visible UI only

Only rendered, visible UI should be audited.

The system does not assume:

- hidden components
- non-rendered states
- undocumented screen content

### CCL first

The design system is the main source of truth for:

- component correctness
- tokens
- variants
- system-level UX patterns

### Reporting must be readable

The output should be useful for:

- design
- frontend
- QA
- product

So the system had to move beyond raw issue logs into:

- HTML design report
- Slack summary
- dashboard view

### Evidence matters

Design findings should be screenshot-backed where possible, but screenshots should focus on mismatched areas, not noisy full-page captures.

---

## What Was Built

### 1. Shared Design Rules

A shared ruleset was created:

- [central-component-library-design-system.json](/Users/jaisingh/Desktop/AI_Gen_Automation/automation-framework/rulesets/shared/central-component-library-design-system.json)

This ruleset defines the design system context used by the audit engine.

It now uses a cleaner design contract:

- `design_rules.source_of_truth`
- `design_rules.component_governance`
- `design_rules.token_and_variant_rules`
- `design_rules.ux_rules`
- `design_rules.observer_rules`

### 2. Design Audit Engine

The core runtime layer is:

- [design-audit.engine.js](/Users/jaisingh/Desktop/AI_Gen_Automation/automation-framework/src/shared/design/design-audit.engine.js)

It performs:

- live component detection
- CCL mapping
- token drift detection
- accessibility checks
- issue generation
- design JSON report generation

### 3. Shared Design Summary Logic

To reduce duplication, a shared summary builder was added:

- [design-report-summary.js](/Users/jaisingh/Desktop/AI_Gen_Automation/automation-framework/src/shared/design/design-report-summary.js)

This centralizes:

- release risk
- screenshot counts
- token drift counts
- accessibility counts
- security counts

This avoids recomputing the same design summary logic separately in HTML, Slack, and dashboard views.

### 4. HTML Design Report

The HTML report appender:

- [append-design-report.js](/Users/jaisingh/Desktop/AI_Gen_Automation/automation-framework/src/shared/scripts/append-design-report.js)

adds a non-blocking design section after the functional report.

### 5. Slack Design Summary

The Slack reporter:

- [slack-reporter.js](/Users/jaisingh/Desktop/AI_Gen_Automation/automation-framework/src/shared/scripts/slack-reporter.js)

includes a design summary in the Slack automation report while keeping extra noisy sections hidden unless explicitly re-enabled.

### 6. Dashboard

A dedicated dashboard was created:

- [generate-design-dashboard.js](/Users/jaisingh/Desktop/AI_Gen_Automation/automation-framework/src/shared/scripts/generate-design-dashboard.js)

This gives a cleaner view of the design result after each run.

---

## What The System Checks Today

The current design audit checks:

### Component mapping

- total rendered component instances
- unique detected component types
- matching components
- mismatching components
- unmapped components
- variant mismatch count

### Token compliance

- spacing drift
- border-radius drift
- typography/base font drift

### Accessibility basics

- interactive controls missing visible or accessible labels
- images missing alt text
- unsafe external link protections
- secret-like text exposure

### Governance gaps

- public library components not directly documented
- product-rendered controls not mapped to CCL
- feature-level ruleset missing

### Reporting metrics

- design score
- accessibility score
- component match percentage
- functional pass rate
- release risk

---

## What We Found During Implementation

### 1. Design drift is real even when the flow passes

The current Purchase Order screen can pass functional automation while still showing:

- spacing drift
- radius drift
- typography drift
- unlabeled controls

This validated the reason for adding the design audit.

### 2. Component governance gaps are valuable signals

The system found that `MenuButton` was not mapped to CCL.

That is useful because it highlights a system-governance issue even if the UI still looks acceptable.

### 3. Storybook is useful but not complete

Some components used in product are:

- in the public library
- but not directly documented in Storybook

These should be treated as governance/documentation gaps, not automatically as broken design.

### 4. Reporting clarity matters as much as detection

The same design information became hard to consume when it appeared:

- too many times
- in too many formats
- with too much raw detail

This drove the cleanup of:

- Slack detail noise
- dashboard clutter
- repeated summary logic

### 5. Duplication becomes a maintenance problem

We found duplication in:

- release-risk calculation
- token/accessibility/security summaries
- repeated summary logic across Slack, HTML, and dashboard
- overlapping ruleset sections

This was cleaned by centralizing summary logic and simplifying the ruleset structure.

---

## Steps We Took

### Phase 1: Understand the existing project

- reviewed repo structure
- confirmed the current functional flow
- ran the suite
- fixed initial environment/reporting issues

### Phase 2: Research the component library

- reviewed the central component library repo
- reviewed Storybook coverage
- separated documented vs undocumented exports
- defined what Storybook can and cannot prove

### Phase 3: Draft design governance

- drafted design rules
- drafted UX rules
- drafted Storybook-based design rules
- drafted handling for screens with no design files

### Phase 4: Add a non-blocking design audit

- added shared CCL ruleset
- added design-audit engine
- generated design JSON output
- appended design report to HTML
- added Slack design summary

### Phase 5: Add evidence and better visibility

- added focused mismatch screenshots
- added dashboard generation
- added score breakdowns and system metrics

### Phase 6: Clean and simplify

- removed duplicated summary logic
- simplified Slack output
- refined dashboard sections
- cleaned overlapping rule sections into a smaller design contract

---

## How The System Works Today

When the suite runs:

1. The product opens in a real browser.
2. Shared login runs once.
3. Functional scenarios execute.
4. The visible UI is audited using the shared CCL design rules.
5. A design JSON report is written.
6. A design section is appended to the HTML report.
7. A Slack design summary is sent with the automation result.
8. A dashboard is generated for cleaner design review.

The design audit remains **non-blocking**.

Functional failures still control functional pass/fail.

---

## Current Impact On The System

### Positive impact

- functional automation is now supported by design quality signals
- the system catches design drift without blocking normal test runs
- design, QA, product, and frontend can read the same audit result
- the dashboard makes review easier than raw report output
- component-library governance is now visible in automation

### Operational impact

- small added runtime for the design audit
- larger report surface area
- more moving parts in report generation

### Controlled tradeoff

The system intentionally favors:

- readable, non-blocking audit
- gradual governance

over:

- strict release blocking
- aggressive auto-fix

That was a deliberate design decision.

---

## What The Current Design Rules Mean In Practice

The cleaned rules now say:

### Source of truth

- CCL is the primary system truth
- Storybook is the documentation truth for directly documented components

### Component governance

- use approved public components
- prefer higher abstraction when appropriate
- undocumented exports are governance gaps
- custom replacements are design-system bypasses

### Token and variant rules

- spacing, radius, and typography must follow approved tokens
- undocumented variant combinations are not allowed without approval

### UX rules

- important states must exist and behave consistently
- documented patterns should not be replaced arbitrarily
- missing documented states are UX consistency issues

### Observer rules

- the live screen is classified into documented, undocumented, or custom UI
- the observer validates tokens, variants, states, and responsive behavior
- findings are labeled clearly based on evidence quality

---

## What Is Not Included Yet

The current system does **not** yet fully include:

- Figma-to-production automated comparison
- deep role-based flow understanding
- true regression history across runs
- auto-fix
- blocking design gates

These were discussed and designed conceptually, but not added into the codebase.

---

## Why This Matters

This work changed the automation framework from:

- only functional automation

into:

- functional automation
- design-system compliance checking
- component-library governance reporting
- non-blocking design review

in one integrated testing system.

---

## Recommended Use

Use the current system as:

- a fast functional test runner
- a non-blocking design audit layer
- a design-system drift detector
- a dashboard-backed design review tool

Do not treat it yet as:

- a final visual signoff engine
- a strict release blocker
- a Figma pixel-comparison system

---

## Current Main System Files

- [central-component-library-design-system.json](/Users/jaisingh/Desktop/AI_Gen_Automation/automation-framework/rulesets/shared/central-component-library-design-system.json)
- [design-audit.engine.js](/Users/jaisingh/Desktop/AI_Gen_Automation/automation-framework/src/shared/design/design-audit.engine.js)
- [design-report-summary.js](/Users/jaisingh/Desktop/AI_Gen_Automation/automation-framework/src/shared/design/design-report-summary.js)
- [append-design-report.js](/Users/jaisingh/Desktop/AI_Gen_Automation/automation-framework/src/shared/scripts/append-design-report.js)
- [slack-reporter.js](/Users/jaisingh/Desktop/AI_Gen_Automation/automation-framework/src/shared/scripts/slack-reporter.js)
- [generate-design-dashboard.js](/Users/jaisingh/Desktop/AI_Gen_Automation/automation-framework/src/shared/scripts/generate-design-dashboard.js)

---

## One-Line Summary

The system now uses automation runs to validate not only whether the product works, but also whether the rendered UI stays aligned with the Central Component Library Design System in a readable, evidence-backed, non-blocking way.
