# Ruleset: Dispatch Order Request

> **Product:** FMT PRO  
> **Author:** Automation Team  
> **Created:** 2026-04-16  
> **Status:** draft  

---

## 1. Overview

This ruleset covers Dispatch Order (DO) creation from an approved Purchase Order on FMT PRO happy flow:

1. Open target approved PO details
2. Click `Create Dispatch Order`
3. Enter transport details (vehicle + driver mobile)
4. Submit transport details
5. Click `Add Dispatch Details`
6. Upload all required dispatch documents

---

## 2. Design

### Entry Point
FMT PRO Purchase Order screen

### URL Pattern
```
<FMT_PRO_URL>/purchase-order
```

### UI Components
| Component | Description |
|-----------|-------------|
| PO search input | Locate specific PO by PO number |
| Create Dispatch Order button | Opens DO creation from PO details |
| Vehicle number input | Captures transport vehicle number |
| Driver mobile input | Captures driver contact number |
| Submit button | Saves transport details |
| Add Dispatch Details button | Opens dispatch document upload section |
| Upload fields | Supplier invoice, loading weight slip, bill of transport, mandi tax 9R, mandi tax 9R gatepass |

---

## 3. Flows

### F1 — Create DO and upload required docs `@smoke`
**Priority:** Critical

| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | Resolve target PO number from env/shared context | PO number available for search |
| 2 | Open Purchase Order list and open PO details | Correct PO details screen opens |
| 3 | Click `Create Dispatch Order` | Transport details form opens |
| 4 | Enter vehicle `CG09UI9090` and mobile `9886293565` | Inputs accept values |
| 5 | Click `Submit` | Transport details success state appears |
| 6 | Click `Add Dispatch Details` | Dispatch docs section opens |
| 7 | Upload all 5 docs | Upload controls accept files and stay stable |

---

## 4. Business Logic

### Business Rules
1. Dispatch Order starts only from an existing PO detail screen.
2. Transport details are mandatory before dispatch document upload.
3. All required dispatch documents must be attachable in one run.
4. If explicit PO number is not provided, latest PO context may be reused.

### Validations
| Check | Rule |
|-------|------|
| Target PO number | Loaded from `DISPATCH_PO_NUMBER`/fallback context |
| PO open action | PO details opens for searched PO |
| Transport submit | Success state or next-step CTA is visible |
| Add Dispatch Details | Document section opens |
| Document upload | Each required file path is readable and uploaded |

---

## 5. Test Data

| Type | Value | Purpose |
|------|-------|---------|
| Vehicle number | `CG09UI9090` | Transport detail input |
| Driver mobile | `9886293565` | Transport detail input |
| Supplier invoice | `/Users/srinivaschitrali/Documents/Supplier Invoice 4.jpg` | Required dispatch doc |
| Loading weight slip | `/Users/srinivaschitrali/Documents/Loading Weight Slip 4 (1).jpg` | Required dispatch doc |
| Bill of transport | `/Users/srinivaschitrali/Documents/Bill of Transport (Primary).jpg` | Required dispatch doc |
| Mandi tax 9R | `/Users/srinivaschitrali/Documents/9R 4.jpg` | Required dispatch doc |
| Mandi tax 9R gatepass | `/Users/srinivaschitrali/Documents/9R 4.jpg` | Required dispatch doc |

---

## 6. Dependencies

- **Requires Login:** Yes (Google SSO)
- **Required Role:** User with PO + DO creation permissions
- **Prerequisite Features:** PO request + approval + supplier acceptance completed
