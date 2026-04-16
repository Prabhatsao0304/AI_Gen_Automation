# Ruleset: Purchase Order Approval (SHP)

> **Product:** FMT OS  
> **Author:** Automation Team  
> **Created:** 2026-04-16  
> **Status:** draft  

---

## 1. Overview

This ruleset covers Stage 2 of PO lifecycle in FMT OS:

1. SHP opens **Purchase Order** screen in FMT OS
2. SHP searches target PO in **Review PO** tab
3. SHP opens PO details and clicks **Approve**
4. System moves PO to next stage (`Approval Pending` / `Map SO` flow)

---

## 2. Design

### Entry Point
FMT OS Purchase Order screen

### URL Pattern
```
<FMT_OS_URL>/procurement/purchase-order
```

### UI Components
| Component | Description |
|-----------|-------------|
| Tab: Review PO | POs awaiting SHP action |
| Search bar | Search by PO number |
| PO card/list row | Result row for target PO |
| Approve button | Action to approve PO request |
| Confirmation dialog | Optional modal after approve action |
| Tab: Map SO | Post-approval holding stage |

---

## 3. Flows

### F1 — SHP approves requested PO from Review PO `@regression`
**Priority:** Critical

| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | Read target PO number from `.env` (`SHP_APPROVAL_PO_NUMBER` or `PO_NUMBER`) | PO number is available |
| 2 | Open Review PO and search target PO | Target PO appears in results |
| 3 | Open target PO and click Approve | Approval action is submitted |
| 4 | Confirm dialog if shown | Approval is finalized |
| 5 | Verify post-approval state | PO is visible in `Approval Pending` or under `Map SO` |

---

## 4. Business Logic

### Business Rules
1. Only requested POs in Review PO are eligible for SHP approval.
2. Approval may show a confirmation dialog depending on build.
3. After approval, PO should leave Review PO lifecycle and enter the next stage.

### Validations
| Check | Rule |
|-------|------|
| Target PO selection | PO number match is exact text match |
| Approval action | Approve button click succeeds |
| Stage transition | `Approval Pending` indicator OR PO visible in `Map SO` |

---

## 5. Test Data

| Type | Value | Purpose |
|------|-------|---------|
| Account | Read from `.env` `FMT_OS_USERNAME`/`FMT_OS_PASSWORD` (fallback `USERNAME/PASSWORD`) | SHP login |
| Product URL | Read from `.env` `FMT_OS_URL` | Product under test |
| Target PO Number | Read from `.env` `SHP_APPROVAL_PO_NUMBER` (fallback `PO_NUMBER`) | PO selection |

---

## 6. Dependencies

- **Requires Login:** Yes (Google SSO)
- **Required Role:** SHP user with PO approval access
- **Prerequisite Features:** Stage-1 Purchase Order Request from FMT PRO
