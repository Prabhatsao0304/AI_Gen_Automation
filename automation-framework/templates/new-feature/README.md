# New Feature Template Workflow

Use this folder whenever a new automation feature starts from a requirement.

## Naming Rule

Pick one **kebab-case** feature slug and reuse it everywhere.

Example:

- `purchase-order-search`

That same slug should be used in:

- `rulesets/<product>/<feature-slug>.md`
- `rulesets/<product>/<feature-slug>.json`
- `src/products/<product>/features/<feature-slug>.feature`
- `src/products/<product>/pages/<feature-slug>.page.js`
- `src/products/<product>/step-definitions/<feature-slug>.steps.js`

## Order Of Work

1. Copy `ruleset.template.md` and rename it to the new feature slug.
2. Copy `ruleset.template.json` and rename it to the same feature slug.
3. Review requirement details and fill both ruleset files first.
4. Copy the automation templates and rename them using the same slug.
5. Implement selectors, steps, and scenarios using the completed ruleset as the source of truth.
6. Run dry-run validation before a full test execution.

## Example

For a feature slug named `purchase-order-search` under `fmt-os`:

- `rulesets/fmt-os/purchase-order-search.md`
- `rulesets/fmt-os/purchase-order-search.json`
- `src/products/fmt-os/features/purchase-order-search.feature`
- `src/products/fmt-os/pages/purchase-order-search.page.js`
- `src/products/fmt-os/step-definitions/purchase-order-search.steps.js`
