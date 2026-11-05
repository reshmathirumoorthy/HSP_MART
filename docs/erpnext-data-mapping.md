# HSP Mart → ERPNext data mapping (Phase 8)

This document describes the **conceptual** mapping between the HSP Mart frontend data model and ERPNext doctypes.

**Status:** Documentation only. No API, webhook, or ERPNext connection is implemented in Phase 8.

All current catalogue, order, and quote values are **DEMO / MOCK FRONTEND DATA**.

---

## Product catalogue

| Frontend (`Product`) | ERPNext | Notes |
| --- | --- | --- |
| `sku` | `Item.item_code` | Primary stable business key for sync |
| `id` | Custom field / external id | Frontend localStorage key; keep stable |
| `slug` | Website Item route / custom field | Used for `/products/[slug]` |
| `name` | `Item.item_name` | |
| `shortDescription` | Website Item short description / custom | |
| `description` | `Item.description` | |
| `category` / `categorySlug` | `Item.item_group` | Map via Item Group tree |
| `subcategory` | Child Item Group or attribute | Keep depth Category → Subcategory |
| `brand` | `Item.brand` | Only when known |
| `manufacturer` | Manufacturer / custom | Only when known |
| `price` + `currency` | `Item Price` (price list) | No fake MRP/discount in Phase 8 |
| `unit` | `Item.stock_uom` | Currently `piece` |
| `stockStatus` | Derived from Bin / stock balance | Customer-facing label only |
| `stockQuantity` | Bin `actual_qty` | Optional; avoid exposing warehouse detail |
| `active` | `Item.disabled` (inverse) / Website published | Listed vs hidden |
| `bulkAvailable` | Custom field | Controls bulk quote eligibility |
| `minOrderQuantity` | Minimum Order Qty / custom | Only where defined |
| `customizable` + `customizationTypes` | Custom fields | Quotation-driven, not fake pricing |
| `packagingOptions` | Custom / quotation notes | |
| `images[]` | File attachments / Website Item images | Empty → frontend visual fallback |
| `tags` | Tags / keywords | |
| `featured` | Website / merchandising flag | Not “best seller” |
| `tone` / `visual` / `layout` | **Frontend only** | Do not map to Item master |

---

## Categories

| Frontend (`ProductCategory`) | ERPNext |
| --- | --- |
| `slug` / `name` | Item Group |
| `description` | Item Group description / website content |
| `id` | External reference |

Online categories in this frontend:

- Stationery
- Office Essentials
- Desk & Accessories
- Writing Instruments
- Presentation
- Gifting
- Custom Products

---

## Customer

| Frontend (`CustomerProfile`) | ERPNext |
| --- | --- |
| `id` | External id / custom |
| `fullName` / `firstName` | Customer name |
| `email` | Customer email |
| `phone` | Customer mobile/phone |
| `organizationName` | Customer (Company) / territory context |
| `gstin` | Tax ID / GSTIN |
| `address` | Address doctype |

No passwords, auth tokens, or ERP credentials are stored in the frontend.

---

## Orders

| Frontend (`Order`) | ERPNext |
| --- | --- |
| `reference` / `id` | `Sales Order.name` / custom naming |
| `placedAt` | `transaction_date` |
| `status` / `timelineStep` | Sales Order / Delivery Note / status workflow |
| `items[]` | Sales Order Item |
| `subtotal` / `shipping` / `total` | SO totals |
| `currency` | Currency |
| `paymentMethod` | Mode of Payment / Payment Entry (later) |
| `deliveryAddress` | Shipping address |

### Order items

| Frontend (`OrderItem`) | ERPNext |
| --- | --- |
| `productId` / `sku` | Item link / `item_code` |
| `productName` | Snapshot `item_name` |
| `quantity` | `qty` |
| `unitPrice` | `rate` |
| `lineTotal` | `amount` |

---

## Bulk quotes

| Frontend (`QuoteRequest`) | ERPNext |
| --- | --- |
| `reference` / `id` | `Quotation.name` |
| `submittedAt` | `transaction_date` |
| `status` / `timelineStep` | Quotation workflow |
| `items[]` | Quotation Item |
| Customer fields | Customer / Lead + contact |
| `customization` / packaging / branding | Custom fields or quotation notes |
| Pricing | **Not stored in Phase 8** — confirmed later via ERP quotation |

### Quote items

| Frontend (`QuoteItem`) | ERPNext |
| --- | --- |
| `sku` / `productId` | Item |
| `quantity` | `qty` |
| `notes` / `customization` | Description / custom |

---

## Company content

| Frontend (`company`) | ERPNext |
| --- | --- |
| `companyName` / `legalName` | Company |
| `contact.website` | Website / Address |
| Services / FAQs | Website content (not doctypes required) |

Phone, email, and postal addresses are **not invented** in Phase 8 when unverified.

---

## Integration boundary (Phase 9+)

Suggested future shape (not implemented):

1. Read Items / Item Groups / Item Prices / stock into the `Product` DTO.
2. Keep frontend `id`/`slug` stable or provide a mapping table.
3. Create Quotation from bulk quote submissions.
4. Create Sales Order from checkout once payments/auth exist.

**Do not** introduce `/api/*` routes in Phase 8. The frontend remains a static Next.js app with local mock data.
