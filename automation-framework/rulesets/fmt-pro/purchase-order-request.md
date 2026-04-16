# Ruleset: Purchase Order Request

> **Product:** FMT PRO  
> **Author:** Automation Team  
> **Created:** 2026-04-15  
> **Status:** draft  

---

## 1. Overview

This ruleset covers the first checkpoint for Purchase Order Request on FMT PRO:

1. Login to FMT PRO with QA credentials from `.env`
2. Open **Purchase Order** from the bottom tab navigation
3. Click the bottom-right `+` icon and open the Purchase Order Request form
4. Select supplier as `vimal traders` from Select Supplier bottom sheet
5. Click `Next` to proceed in Purchase Order Request flow

---

## 2. Design

### Entry Point
FMT PRO login page

### URL Pattern
```
<FMT_PRO_URL>
```

### UI Components
| Component | Description |
|-----------|-------------|
| Bottom tab: Purchase Order | Navigation tab used to open Purchase Order section |
| Bottom-right `+` icon | Action button to open Purchase Order Request form |
| Purchase Order Request form | Form opened after clicking `+` icon |
| Select Supplier dropdown | Field to open supplier picker |
| Supplier bottom sheet | Modal sheet to search and choose supplier |
| Next button | Advances Purchase Order Request flow |

---

## 3. Flows

### F1 — Login, open Purchase Order Request form, choose supplier, and continue `@smoke`
**Priority:** Critical

| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | User runs FMT PRO suite with valid QA credentials in `.env` | User is logged in successfully |
| 2 | User clicks `Purchase Order` in bottom tab navigation | Purchase Order screen opens |
| 3 | User clicks bottom-right `+` icon | Purchase Order Request form opens |
| 4 | User clicks Select Supplier dropdown | Supplier bottom sheet opens |
| 5 | User searches and selects `vimal traders` | Supplier value is selected in form |
| 6 | User clicks `Next` | Purchase Order Request flow continues |

---

## 4. Business Logic

### Business Rules
1. Login should complete before scenario actions begin.
2. Purchase Order tab should be reachable from the main FMT PRO screen.
3. Bottom-right `+` icon should open Purchase Order Request form.
4. Select Supplier should open bottom sheet and allow supplier search/selection.
5. Next button should continue the form after supplier is selected.

### Validations
| Check | Rule |
|-------|------|
| Authenticated state | URL is not on `/login` |
| Purchase Order access | Purchase Order tab click opens Purchase Order section |
| Request form access | `+` icon click opens Purchase Order Request form |
| Supplier selection | `vimal traders` can be selected from supplier bottom sheet |
| Next action | `Next` click continues Purchase Order Request flow |

---

## 5. Test Data

| Type | Value | Purpose |
|------|-------|---------|
| Account | Read from `.env` `FMT_PRO_USERNAME` and `FMT_PRO_PASSWORD` (fallback `USERNAME/PASSWORD`) | Login setup |
| Product URL | Read from `.env` `FMT_PRO_URL` | Product under test |
| Supplier | `vimal traders` | Supplier selection validation |

---

## 6. Dependencies

- **Requires Login:** Yes (Google SSO)
- **Required Role:** User with Purchase Order access
- **Prerequisite Features:** FMT PRO authentication flow
