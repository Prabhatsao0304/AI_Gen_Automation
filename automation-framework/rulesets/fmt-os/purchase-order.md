# Ruleset: Purchase Order

> **Product:** FMT OS  
> **Author:** Sundram Bhardwaj  
> **Created:** 2026-04-13  
> **Status:** approved  

---

## 1. Overview

The Purchase Order (PO) screen is accessed from the left sidebar under **Procurement > Purchase Order**. It is the central hub for managing the full PO lifecycle. The screen has a search bar and five tabs, each representing a different PO lifecycle stage. When no POs exist (or search yields no results), each tab shows a specific empty state with a primary message and supporting text.

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
| Search bar | Free text input; filters POs on the active tab |
| Tab: Review PO | Default/first tab; POs awaiting approval |
| Tab: Map SO | POs approved, waiting to be linked to a Sales Order |
| Tab: In Progress | POs actively being fulfilled |
| Tab: Completed | POs fully received and confirmed |
| Tab: All | All POs regardless of status |
| Empty state | Primary message + supporting text shown when tab has no data |
| CTA Button | `+ Create Purchase Order` — shown only on Review PO empty state |

---

## 3. Flows

### F1 — Navigate to Purchase Order screen `@smoke`
**Priority:** Critical

| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | User is logged in | Dashboard is visible |
| 2 | Click Procurement in sidebar | Procurement submenu expands |
| 3 | Click Purchase Order | PO screen loads |
| 4 | Review PO tab is active by default | First tab highlighted |

---

### F2 — Search bar with random text `@smoke`
**Priority:** High

| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | User is on the PO screen | Screen loaded |
| 2 | Type random text in search bar | Input accepted |
| 3 | Active tab shows empty state | No results found |

---

### F3 — Tab: Review PO empty state `@smoke`
**Priority:** Critical

| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | Click Review PO tab | Tab becomes active |
| 2 | Observe empty state | Primary: **"No purchase orders to review"** |
| 3 | | Supporting: *"New purchase orders will appear here for your review. You can approve, request changes, or map to sales orders."* |
| 4 | | CTA: **"+ Create Purchase Order"** is visible |

---

### F4 — Tab: Map SO empty state `@regression`
**Priority:** High

| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | Click Map SO tab | Tab becomes active |
| 2 | Observe empty state | Primary: **"No purchase orders to map"** |
| 3 | | Supporting: *"Purchase orders awaiting sales order mapping will appear here. Map them to track the complete order flow."* |

---

### F5 — Tab: In Progress empty state `@regression`
**Priority:** High

| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | Click In Progress tab | Tab becomes active |
| 2 | Observe empty state | Primary: **"No purchase orders in progress"** |
| 3 | | Supporting: *"Active purchase orders being fulfilled will appear here. Track their status and expected delivery dates."* |

---

### F6 — Tab: Completed empty state `@regression`
**Priority:** High

| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | Click Completed tab | Tab becomes active |
| 2 | Observe empty state | Primary: **"No completed purchase orders"** |
| 3 | | Supporting: *"Fulfilled purchase orders will appear here once the goods are received and confirmed."* |

---

### F7 — Tab: All empty state `@regression`
**Priority:** High

| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | Click All tab | Tab becomes active |
| 2 | Observe empty state | Primary: **"No purchase orders found"** |
| 3 | | Supporting: *"All your purchase orders across all statuses will appear here. Create your first PO to get started."* |

---

## 4. Business Logic

### Business Rules
1. Each tab represents a distinct PO lifecycle stage.
2. **Review PO** — newly created POs needing approval.
3. **Map SO** — approved POs waiting to be linked to a Sales Order.
4. **In Progress** — POs actively being fulfilled.
5. **Completed** — POs where goods are received and confirmed.
6. **All** — shows every PO regardless of status.

### Validations
| Check | Rule |
|-------|------|
| Empty state text | Must match exact copy per tab |
| CTA button | Only visible on Review PO tab in empty state |
| Search | Returns empty state of the active tab when no match found |

### Edge Cases
- Search with special characters (e.g. `@#$%`)
- Search with only whitespace
- Rapidly switching tabs

---

## 5. Expected Empty State Copy (source of truth)

| Tab | Primary Message | Supporting Text | CTA |
|-----|----------------|-----------------|-----|
| Review PO | No purchase orders to review | New purchase orders will appear here for your review. You can approve, request changes, or map to sales orders. | + Create Purchase Order |
| Map SO | No purchase orders to map | Purchase orders awaiting sales order mapping will appear here. Map them to track the complete order flow. | — |
| In Progress | No purchase orders in progress | Active purchase orders being fulfilled will appear here. Track their status and expected delivery dates. | — |
| Completed | No completed purchase orders | Fulfilled purchase orders will appear here once the goods are received and confirmed. | — |
| All | No purchase orders found | All your purchase orders across all statuses will appear here. Create your first PO to get started. | — |

---

## 6. Dependencies
- **Requires Login:** Yes (Google SSO)
- **Required Role:** Procurement user
- **Prerequisite Features:** Login / session setup
