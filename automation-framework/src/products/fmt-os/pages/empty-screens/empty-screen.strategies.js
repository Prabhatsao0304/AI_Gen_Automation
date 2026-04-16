import { escapeForRegExp } from '../../../../shared/locators/fallback-locator.js';

export function defaultSearchStrategies() {
  return [
    { name: 'type_search', locator: (p) => p.locator('input[type="search"]') },
    { name: 'role_searchbox', locator: (p) => p.getByRole('searchbox') },
    { name: 'getByPlaceholder_search', locator: (p) => p.getByPlaceholder(/search/i) },
    { name: 'first_input', locator: (p) => p.locator('input').first() },
  ];
}

export function defaultAnyTabStrategies() {
  return [
    { name: 'role_tab', locator: (p) => p.locator('[role="tab"]') },
    { name: 'getByRole_tab', locator: (p) => p.getByRole('tab') },
  ];
}

export function defaultTabStrategies(tabName) {
  const pattern = new RegExp(escapeForRegExp(tabName), 'i');
  return [
    { name: 'role_tab_has_text', locator: (p) => p.locator(`[role="tab"]:has-text("${tabName}")`) },
    { name: 'role_tab_hasText_regex', locator: (p) => p.locator('[role="tab"]', { hasText: pattern }) },
    { name: 'getByRole_tab_name', locator: (p) => p.getByRole('tab', { name: pattern }) },
    { name: 'tab_button_mui', locator: (p) => p.locator(`button[role="tab"]:has-text("${tabName}")`) },
    {
      name: 'tablist_descendant_hasText',
      locator: (p) => p.locator('[role="tablist"]').locator('[role="tab"], button', { hasText: pattern }),
    },
    { name: 'any_tab_or_button_hasText', locator: (p) => p.locator('[role="tab"], button', { hasText: pattern }) },
    { name: 'button_has_text', locator: (p) => p.locator(`button:has-text("${tabName}")`) },
    { name: 'role_button_name', locator: (p) => p.getByRole('button', { name: pattern }) },
    {
      name: 'generic_clickable_hasText',
      locator: (p) => p.locator('button, [role="button"], a, div', { hasText: pattern }),
    },
  ];
}

