# Ruleset: Purchase Order Search

> **Product:** FMT OS  
> **Author:** Automation Team  
> **Created:** 2026-04-14  
> **Status:** draft  

---

## 1. Overview

The Purchase Order Search flow validates the search experience on the **Purchase Order** screen in FMT OS. The goal is to ensure the search bar accepts input correctly, preserves search state while moving across tabs, handles non-matching input safely, and keeps the screen stable for edge-case input such as special characters, long text, whitespace-only values, and cleared input.

---

## 2. Design

### Entry Point
Sidebar → Procurement → Purchase Order

### URL Pattern
```
/procurement/purchase-order
```

### UI Components
| Component | Description |
|-----------|-------------|
| Search bar | Free text input to search purchase orders |
| Tab: Review PO | Default/first tab |
| Tab: Map SO | Approved POs pending sales-order mapping |
| Tab: In Progress | POs under fulfillment |
| Tab: Completed | Fulfilled POs |
| Tab: All | All POs regardless of state |
| Empty state message | Primary no-data text shown when search returns no results |

---

## 3. Flows

### F1 — Search bar visibility and input acceptance `@smoke`
**Priority:** Critical

| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | User opens Purchase Order screen | Search bar is visible |
| 2 | User types random non-matching text | Input is accepted in the search field |
| 3 | Search field is inspected | Entered text remains visible |

---

### F2 — Non-matching search across all tabs `@smoke`
**Priority:** Critical

| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | User types random non-matching text in search bar | Search is applied |
| 2 | User checks Review PO | Empty state: **"No purchase orders to review"** |
| 3 | User checks Map SO | Empty state: **"No purchase orders to map"** |
| 4 | User checks In Progress | Empty state: **"No purchase orders in progress"** |
| 5 | User checks Completed | Empty state: **"No completed purchase orders"** |
| 6 | User checks All | Empty state: **"No purchase orders found"** |
| 7 | Search field is checked after each tab switch | Search text remains applied |

---

### F3 — Search from non-default tab `@regression`
**Priority:** High

| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | User opens Map SO tab first | Map SO tab becomes active |
| 2 | User types random non-matching text | Search is applied in the active tab context |
| 3 | Empty state is shown | Primary message: **"No purchase orders to map"** |

---

### F4 — Special-character search `@regression`
**Priority:** High

| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | User types special characters such as `@#$%` | Input is accepted |
| 2 | Search completes | Screen remains stable |
| 3 | Empty state is shown on Review PO | Primary message: **"No purchase orders to review"** |

---

### F5 — Long-text search `@regression`
**Priority:** High

| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | User types a long search string | Input is accepted without UI breakage |
| 2 | Search completes | Screen remains stable |
| 3 | Empty state is shown on Review PO | Primary message: **"No purchase orders to review"** |

---

### F6 — Whitespace-only search `@regression`
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | User types only spaces in search bar | Input is accepted |
| 2 | Search completes | Purchase Order screen remains stable |
| 3 | Tabs are inspected | All tabs remain visible and Review PO remains active |

---

### F7 — Clear search behavior `@regression`
**Priority:** High

| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | User types random non-matching text | Search is applied |
| 2 | User clears the search bar | Input becomes empty |
| 3 | Screen is inspected | All tabs remain visible and screen remains stable |

---

### F8 — Leading/trailing spaces are trimmed `@regression`
**Priority:** High

| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | User types a value with leading/trailing spaces (e.g. `"  trim-check-123  "`) | Search is applied |
| 2 | Search input is inspected | Input value is trimmed to **"trim-check-123"** |
| 3 | Empty state is verified on active tab | Expected no-data message is shown |

---

## 4. Business Logic

### Business Rules
1. Search works within the currently active Purchase Order tab.
2. Non-matching search should show the empty-state message relevant to the active tab.
3. Search text should remain in the input while switching tabs unless the user clears it.
4. Search input should accept alphanumeric text, special characters, long text, and whitespace without breaking the page.
5. Clearing the search bar should reset the input state safely.
6. Leading and trailing spaces in search input should be trimmed by the system.

### Validations
| Check | Rule |
|-------|------|
| Search bar visibility | Search input must be visible on Purchase Order screen |
| Search value persistence | Entered search value must remain in the input after tab switching |
| Empty state primary text | Must match expected tab-specific copy |
| Active tab behavior | Search on a selected tab must respect that active tab |
| Clear search | Search input becomes empty and screen remains stable |
| Trim behavior | Leading/trailing spaces are removed from search value |

### Edge Cases Covered
- Search with special characters (e.g. `@#$%`)
- Search with long text
- Search with only whitespace
- Clear input after applying a search
- Search while using a non-default tab
- Leading/trailing spaces around text input

---

## 5. Expected Empty State Copy (source of truth for current automation)

| Tab | Primary Message |
|-----|-----------------|
| Review PO | No purchase orders to review |
| Map SO | No purchase orders to map |
| In Progress | No purchase orders in progress |
| Completed | No completed purchase orders |
| All | No purchase orders found |

---

## 6. Test Data

| Type | Value | Purpose |
|------|-------|---------|
| Random search | `xyzabc123notexist` | No-match validation across tabs |
| Special-character search | `@#$%` | Special-character handling |
| Long search | `purchase-order-search-validation-string-1234567890-long-input` | Long-input stability |
| Whitespace search | `"   "` | Whitespace handling |
| Trim check | `"  trim-check-123  "` | Leading/trailing trim validation |

---

## 7. Dependencies

- **Requires Login:** Yes (Google SSO)
- **Required Role:** Procurement user
- **Prerequisite Features:** Login / session setup, Purchase Order page access
