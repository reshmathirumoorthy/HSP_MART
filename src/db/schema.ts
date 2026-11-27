/**
 * HSP GiftOS — central transaction schema (Blueprint §5, "Core data entities").
 * Money is always stored as integer paise. Ledger tables are append-only.
 */
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  json,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  vector,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

const id = () => uuid("id").primaryKey().defaultRandom();
const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();
const paise = (name: string) => bigint(name, { mode: "number" });

/* ── Enums ─────────────────────────────────────────────── */

export const roleEnum = pgEnum("role", [
  "customer",
  "associate",
  "franchise",
  "enterprise_partner",
  "hsp_admin",
  "hsp_finance",
  "hsp_procurement",
  "supplier",
]);

export const divisionEnum = pgEnum("division", [
  "corporate",
  "promotional",
  "premium",
  "personal",
  "festive",
]);

export const budgetBandEnum = pgEnum("budget_band", [
  "under_500",
  "500_1000",
  "1000_2500",
  "2500_5000",
  "5000_plus",
]);

export const partnerTypeEnum = pgEnum("partner_type", [
  "associate",
  "franchise",
  "enterprise",
]);

export const partnerStatusEnum = pgEnum("partner_status", [
  "applied",
  "kyc_pending",
  "active",
  "suspended",
  "terminated",
]);

export const leadStatusEnum = pgEnum("lead_status", [
  "registered",
  "qualified",
  "converted",
  "expired",
  "rejected",
]);

export const quoteStatusEnum = pgEnum("quote_status", [
  "draft",
  "pending_approval",
  "approved",
  "sent",
  "accepted",
  "rejected",
  "expired",
]);

/** Blueprint §5 "Order lifecycle", steps 4–8. */
export const orderStatusEnum = pgEnum("order_status", [
  "confirmed",
  "awaiting_artwork",
  "production_approved",
  "po_issued",
  "dispatched",
  "delivered",
  "closed",
  "cancelled",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "created",
  "authorized",
  "captured",
  "failed",
  "refunded",
  "partially_refunded",
]);

export const commissionStatusEnum = pgEnum("commission_status", [
  "pending",
  "earned",
  "approved",
  "paid",
  "reversed",
]);

export const payoutStatusEnum = pgEnum("payout_status", [
  "requested",
  "approved",
  "processing",
  "processed",
  "failed",
]);

export const supplierStatusEnum = pgEnum("supplier_status", [
  "pending",
  "approved",
  "suspended",
]);

/* ── Identity & access ────────────────────────────────── */

export const users = pgTable(
  "users",
  {
    id: id(),
    email: text("email"),
    phone: text("phone"),
    name: text("name"),
    role: roleEnum("role").notNull().default("customer"),
    locale: text("locale", { enum: ["en", "hi"] }).notNull().default("en"),
    active: boolean("active").notNull().default(true),
    /** Customer profile (storefront account). */
    customerType: text("customer_type", { enum: ["individual", "business", "reseller", "institution"] }),
    organizationName: text("organization_name"),
    gstin: text("gstin"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("users_email_uq").on(t.email),
    uniqueIndex("users_phone_uq").on(t.phone),
  ],
);

export const sessions = pgTable("sessions", {
  id: id(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: createdAt(),
});

export const otpCodes = pgTable(
  "otp_codes",
  {
    id: id(),
    identifier: text("identifier").notNull(),
    codeHash: text("code_hash").notNull(),
    attempts: integer("attempts").notNull().default(0),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("otp_identifier_idx").on(t.identifier)],
);

/* ── Partners ─────────────────────────────────────────── */

export const partners = pgTable("partners", {
  id: id(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  code: text("code").notNull().unique(),
  type: partnerTypeEnum("type").notNull(),
  status: partnerStatusEnum("status").notNull().default("applied"),
  city: text("city"),
  state: text("state"),
  pan: text("pan"),
  gstin: text("gstin"),
  bankAccountLast4: text("bank_account_last4"),
  bankIfsc: text("bank_ifsc"),
  kycVerifiedAt: timestamp("kyc_verified_at", { withTimezone: true }),
  agreementVersion: text("agreement_version"),
  agreementAcceptedAt: timestamp("agreement_accepted_at", {
    withTimezone: true,
  }),
  /** Commission in basis points (1000 = 10%). */
  commissionBps: integer("commission_bps").notNull().default(1000),
  serviceFeeBps: integer("service_fee_bps").notNull().default(0),
  /** Refundable deposit — a liability, never revenue (Blueprint §3). */
  securityDepositPaise: paise("security_deposit_paise").notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/* ── Customers & leads ────────────────────────────────── */

export const customers = pgTable("customers", {
  id: id(),
  userId: uuid("user_id").references(() => users.id),
  kind: text("kind", { enum: ["organisation", "individual"] }).notNull(),
  name: text("name").notNull(),
  contactName: text("contact_name"),
  email: text("email"),
  phone: text("phone"),
  gstin: text("gstin"),
  /** Normalised domain / phone used for lead de-duplication. */
  dedupeKey: text("dedupe_key").notNull(),
  marketingConsent: boolean("marketing_consent").notNull().default(false),
  isNationalKeyAccount: boolean("is_national_key_account")
    .notNull()
    .default(false),
  createdAt: createdAt(),
});

export const leads = pgTable(
  "leads",
  {
    id: id(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id),
    partnerId: uuid("partner_id")
      .notNull()
      .references(() => partners.id),
    source: text("source"),
    status: leadStatusEnum("status").notNull().default("registered"),
    protectionExpiresAt: timestamp("protection_expires_at", {
      withTimezone: true,
    }).notNull(),
    notes: text("notes"),
    createdAt: createdAt(),
  },
  (t) => [index("leads_customer_idx").on(t.customerId)],
);

/* ── Catalogue, suppliers ─────────────────────────────── */

export const products = pgTable("products", {
  id: text("id").primaryKey(),
  sku: text("sku").notNull().unique(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  division: divisionEnum("division").notNull(),
  budgetBand: budgetBandEnum("budget_band").notNull(),
  categorySlug: text("category_slug").notNull(),
  subcategory: text("subcategory"),
  /** Selling price excl. GST. */
  pricePaise: paise("price_paise").notNull(),
  /** Landed procurement + branding cost — null until supplier data arrives. */
  costPaise: paise("cost_paise"),
  gstRateBps: integer("gst_rate_bps").notNull().default(1800),
  hsnCode: text("hsn_code"),
  /** Semantic-search embedding (Voyage, 1024 dims). Null until the embedding job runs with VOYAGE_API_KEY. */
  embedding: vector("embedding", { dimensions: 1024 }),
  customizable: boolean("customizable").notNull().default(false),
  bulkAvailable: boolean("bulk_available").notNull().default(false),
  minOrderQuantity: integer("min_order_quantity").notNull().default(1),
  active: boolean("active").notNull().default(true),
  stockStatus: text("stock_status", { enum: ["in_stock", "low_stock", "out_of_stock"] }).notNull().default("in_stock"),
  /** Storefront listing order (lower first). */
  sortOrder: integer("sort_order").notNull().default(0),
  /**
   * Storefront presentation: descriptions, images, specifications, variants, customization and
   * hamper configuration. Money, stock, MOQ and status live in the columns above and win.
   */
  content: json("content").notNull().default({}),
  /**
   * Physical size (ISO 80000 SI units: integer mm and g; order length × breadth × height per ISO 3394).
   * External size for items; internal size for hamper boxes. Null until entered.
   */
  lengthMm: integer("length_mm"),
  breadthMm: integer("breadth_mm"),
  heightMm: integer("height_mm"),
  /** Item weight, or empty (tare) weight for a hamper box. */
  weightG: integer("weight_g"),
  /** Hamper boxes only: maximum content weight. */
  maxLoadG: integer("max_load_g"),
  packingKind: text("packing_kind", { enum: ["item", "hamper_box"] }).notNull().default("item"),
  /** ISO 780 handling: "upright" = this way up (may only turn about the vertical axis). */
  orientation: text("orientation", { enum: ["any", "upright"] }).notNull().default("any"),
  fragile: boolean("fragile").notNull().default(false),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [
  check("products_dimensions_positive", sql`coalesce(${t.lengthMm}, 1) > 0 and coalesce(${t.breadthMm}, 1) > 0 and coalesce(${t.heightMm}, 1) > 0 and coalesce(${t.weightG}, 1) > 0 and coalesce(${t.maxLoadG}, 1) > 0`),
  check("products_hamper_box_complete", sql`${t.packingKind} <> 'hamper_box' or (${t.lengthMm} is not null and ${t.breadthMm} is not null and ${t.heightMm} is not null and ${t.maxLoadG} is not null)`),
]);

/** Editable storefront content blocks (company, FAQs, categories, navigation, homepage…). */
export const siteContent = pgTable("site_content", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedBy: uuid("updated_by").references(() => users.id),
  updatedAt: updatedAt(),
});

export const suppliers = pgTable("suppliers", {
  id: id(),
  userId: uuid("user_id").references(() => users.id),
  name: text("name").notNull(),
  city: text("city"),
  gstin: text("gstin"),
  status: supplierStatusEnum("status").notNull().default("pending"),
  fssaiLicence: text("fssai_licence"),
  onTimeRateBps: integer("on_time_rate_bps"),
  qualityScoreBps: integer("quality_score_bps"),
  createdAt: createdAt(),
});

export const supplierRates = pgTable(
  "supplier_rates",
  {
    id: id(),
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => suppliers.id),
    productId: text("product_id")
      .notNull()
      .references(() => products.id),
    costPaise: paise("cost_paise").notNull(),
    leadTimeDays: integer("lead_time_days").notNull(),
    dailyCapacity: integer("daily_capacity"),
    stockQuantity: integer("stock_quantity"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("supplier_product_uq").on(t.supplierId, t.productId)],
);

/* ── Quotations & orders ──────────────────────────────── */

export const quotations = pgTable("quotations", {
  id: id(),
  number: text("number").notNull().unique(),
  customerId: uuid("customer_id")
    .notNull()
    .references(() => customers.id),
  partnerId: uuid("partner_id").references(() => partners.id),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  channel: text("channel", {
    enum: ["associate", "franchise", "enterprise", "direct"],
  }).notNull(),
  status: quoteStatusEnum("status").notNull().default("draft"),
  subtotalPaise: paise("subtotal_paise").notNull(),
  gstPaise: paise("gst_paise").notNull(),
  freightPaise: paise("freight_paise").notNull().default(0),
  totalPaise: paise("total_paise").notNull(),
  commissionPaise: paise("commission_paise").notNull().default(0),
  contributionBps: integer("contribution_bps").notNull(),
  belowMinimum: boolean("below_minimum").notNull().default(false),
  exceptionReason: text("exception_reason"),
  approvedBy: uuid("approved_by").references(() => users.id),
  validUntil: timestamp("valid_until", { withTimezone: true }).notNull(),
  createdAt: createdAt(),
});

export const quotationLines = pgTable("quotation_lines", {
  id: id(),
  quotationId: uuid("quotation_id")
    .notNull()
    .references(() => quotations.id, { onDelete: "cascade" }),
  productId: text("product_id")
    .notNull()
    .references(() => products.id),
  quantity: integer("quantity").notNull(),
  unitPricePaise: paise("unit_price_paise").notNull(),
  unitCostPaise: paise("unit_cost_paise").notNull(),
  gstRateBps: integer("gst_rate_bps").notNull(),
  branding: jsonb("branding"),
});

export const orders = pgTable("orders", {
  id: id(),
  number: text("number").notNull().unique(),
  quotationId: uuid("quotation_id").references(() => quotations.id),
  customerId: uuid("customer_id")
    .notNull()
    .references(() => customers.id),
  partnerId: uuid("partner_id").references(() => partners.id),
  /** "quote" = corporate quote flow; "online" = storefront cart checkout. */
  source: text("source", { enum: ["quote", "online"] }).notNull().default("quote"),
  freightPaise: paise("freight_paise").notNull().default(0),
  /** { name, phone, line1, line2, city, state, pincode } for online orders. */
  shippingAddress: jsonb("shipping_address"),
  /** Idempotency key from the storefront (one order per checkout attempt). */
  clientRef: text("client_ref").unique(),
  status: orderStatusEnum("status").notNull().default("confirmed"),
  requiresArtwork: boolean("requires_artwork").notNull().default(false),
  artworkApprovedAt: timestamp("artwork_approved_at", { withTimezone: true }),
  subtotalPaise: paise("subtotal_paise").notNull(),
  gstPaise: paise("gst_paise").notNull(),
  totalPaise: paise("total_paise").notNull(),
  paidPaise: paise("paid_paise").notNull().default(0),
  refundedPaise: paise("refunded_paise").notNull().default(0),
  /** Sum of approved credit notes (incl. GST) and their taxable part. Amount due = total − credited. */
  creditedPaise: paise("credited_paise").notNull().default(0),
  creditedTaxablePaise: paise("credited_taxable_paise").notNull().default(0),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  createdAt: createdAt(),
});

export const orderLines = pgTable("order_lines", {
  id: id(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  productId: text("product_id")
    .notNull()
    .references(() => products.id),
  quantity: integer("quantity").notNull(),
  unitPricePaise: paise("unit_price_paise").notNull(),
  gstRateBps: integer("gst_rate_bps").notNull(),
  /** Quantity credited back through credit notes (returns / short supply). */
  creditedQuantity: integer("credited_quantity").notNull().default(0),
  personalisation: jsonb("personalisation"),
});

export const purchaseOrders = pgTable("purchase_orders", {
  id: id(),
  number: text("number").notNull().unique(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id),
  supplierId: uuid("supplier_id")
    .notNull()
    .references(() => suppliers.id),
  status: text("status", {
    enum: ["issued", "acknowledged", "dispatched", "delivered", "cancelled"],
  })
    .notNull()
    .default("issued"),
  totalCostPaise: paise("total_cost_paise").notNull(),
  createdAt: createdAt(),
});

/* ── Money ────────────────────────────────────────────── */

export const payments = pgTable("payments", {
  id: id(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id),
  provider: text("provider").notNull().default("razorpay"),
  providerOrderId: text("provider_order_id").unique(),
  providerPaymentId: text("provider_payment_id").unique(),
  amountPaise: paise("amount_paise").notNull(),
  status: paymentStatusEnum("status").notNull().default("created"),
  refundedPaise: paise("refunded_paise").notNull().default(0),
  settledAt: timestamp("settled_at", { withTimezone: true }),
  createdAt: createdAt(),
});

/** Processed webhook events — idempotency guard (Blueprint §7 control 2). */
export const webhookEvents = pgTable("webhook_events", {
  id: text("id").primaryKey(),
  provider: text("provider").notNull(),
  type: text("type").notNull(),
  payload: jsonb("payload").notNull(),
  processedAt: createdAt(),
});

/** Append-only. Status changes are new rows referencing the same order. */
export const commissionLedger = pgTable(
  "commission_ledger",
  {
    id: id(),
    partnerId: uuid("partner_id")
      .notNull()
      .references(() => partners.id),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id),
    rateBps: integer("rate_bps").notNull(),
    eligibleBasePaise: paise("eligible_base_paise").notNull(),
    amountPaise: paise("amount_paise").notNull(),
    deductionsPaise: paise("deductions_paise").notNull().default(0),
    status: commissionStatusEnum("status").notNull(),
    payoutId: uuid("payout_id"),
    note: text("note"),
    createdAt: createdAt(),
  },
  (t) => [index("commission_partner_idx").on(t.partnerId)],
);

export const payouts = pgTable("payouts", {
  id: id(),
  partnerId: uuid("partner_id")
    .notNull()
    .references(() => partners.id),
  grossPaise: paise("gross_paise").notNull(),
  tdsPaise: paise("tds_paise").notNull(),
  netPaise: paise("net_paise").notNull(),
  bankDestination: text("bank_destination").notNull(),
  transferReference: text("transfer_reference"),
  idempotencyKey: text("idempotency_key").notNull().unique(),
  status: payoutStatusEnum("status").notNull().default("requested"),
  requestedBy: uuid("requested_by")
    .notNull()
    .references(() => users.id),
  approvedBy: uuid("approved_by").references(() => users.id),
  createdAt: createdAt(),
});

export const shipments = pgTable("shipments", {
  id: id(),
  city: text("city"),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id),
  purchaseOrderId: uuid("purchase_order_id").references(
    () => purchaseOrders.id,
  ),
  courier: text("courier"),
  trackingNumber: text("tracking_number"),
  dispatchedAt: timestamp("dispatched_at", { withTimezone: true }),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  deliveryProofUrl: text("delivery_proof_url"),
  /** Courier aggregator booking (e.g. Shiprocket) — null for manual dispatch. */
  provider: text("provider"),
  providerShipmentId: text("provider_shipment_id"),
  trackingStatus: text("tracking_status"),
  trackingCheckedAt: timestamp("tracking_checked_at", { withTimezone: true }),
  createdAt: createdAt(),
});

/** Append-only audit trail (Blueprint §5 "Audit event"). */
export const auditEvents = pgTable(
  "audit_events",
  {
    id: id(),
    actorId: uuid("actor_id"),
    actorRole: text("actor_role"),
    action: text("action").notNull(),
    entity: text("entity").notNull(),
    entityId: text("entity_id"),
    before: jsonb("before"),
    after: jsonb("after"),
    createdAt: createdAt(),
  },
  (t) => [index("audit_entity_idx").on(t.entity, t.entityId)],
);

/* ── Phase 4: notification outbox (consent-checked) ───── */

export const notifications = pgTable(
  "notifications",
  {
    id: id(),
    channel: text("channel", { enum: ["email", "sms", "whatsapp"] }).notNull(),
    recipient: text("recipient").notNull(),
    template: text("template").notNull(),
    category: text("category", { enum: ["transactional", "marketing"] }).notNull(),
    payload: jsonb("payload").notNull(),
    status: text("status", { enum: ["queued", "sent", "simulated", "blocked", "failed"] }).notNull(),
    reason: text("reason"),
    attempts: integer("attempts").notNull().default(0),
    providerRef: text("provider_ref"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    /** When the recipient marked it read in their account inbox. */
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("notifications_recipient_idx").on(t.recipient)],
);

/* ── Phase 6: corporate gifting programmes & bulk recipients ── */

export const programmes = pgTable("programmes", {
  id: id(),
  customerId: uuid("customer_id")
    .notNull()
    .references(() => customers.id),
  partnerId: uuid("partner_id").references(() => partners.id),
  name: text("name").notNull(),
  occasion: text("occasion").notNull(),
  /** Next occurrence; rolled forward a year after each draft is raised. */
  nextDate: timestamp("next_date", { withTimezone: true }).notNull(),
  leadDays: integer("lead_days").notNull().default(30),
  /** [{ sku, quantity }] */
  lines: jsonb("lines").notNull(),
  active: boolean("active").notNull().default(true),
  lastQuotationId: uuid("last_quotation_id"),
  createdAt: createdAt(),
});

export const recipients = pgTable(
  "recipients",
  {
    id: id(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    addressLine: text("address_line").notNull(),
    city: text("city").notNull(),
    pincode: text("pincode").notNull(),
    quantity: integer("quantity").notNull().default(1),
    shipmentId: uuid("shipment_id"),
    createdAt: createdAt(),
  },
  (t) => [index("recipients_order_idx").on(t.orderId)],
);

/* ── Credit notes (Blueprint §7 control 5) ─────────────── */

/**
 * A credit note reduces the invoice value of an order (returns, short supply, damage claims).
 * Raised by one staff user and approved by a different finance/admin user. Any customer
 * refund is a separate money movement linked to it.
 */
export const creditNotes = pgTable(
  "credit_notes",
  {
    id: id(),
    number: text("number").notNull().unique(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id),
    reason: text("reason").notNull(),
    /** [{ orderLineId, quantity }] — empty for a value-only adjustment. */
    lines: jsonb("lines").notNull(),
    taxablePaise: paise("taxable_paise").notNull(),
    gstPaise: paise("gst_paise").notNull(),
    totalPaise: paise("total_paise").notNull(),
    status: text("status", { enum: ["draft", "approved", "void"] }).notNull().default("draft"),
    /** Amount to be returned to the customer (≤ total, ≤ net paid). */
    refundPaise: paise("refund_paise").notNull().default(0),
    refundStatus: text("refund_status", { enum: ["none", "requested", "processed", "failed"] }).notNull().default("none"),
    providerRefundId: text("provider_refund_id").unique(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    approvedBy: uuid("approved_by").references(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [index("credit_notes_order_idx").on(t.orderId)],
);

/* ── Contracted accounts: renewal-commission rights (Blueprint §2) ── */

export const accountContracts = pgTable(
  "account_contracts",
  {
    id: id(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id),
    partnerId: uuid("partner_id")
      .notNull()
      .references(() => partners.id),
    reference: text("reference"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    /** Commission on renewal orders (may be lower than the acquisition rate). */
    renewalCommissionBps: integer("renewal_commission_bps").notNull(),
    status: text("status", { enum: ["active", "ended"] }).notNull().default("active"),
    endedReason: text("ended_reason"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [index("account_contracts_customer_idx").on(t.customerId)],
);

/* ── File storage: artwork, delivery proofs, invoices ── */

export const files = pgTable(
  "files",
  {
    id: id(),
    kind: text("kind", { enum: ["artwork", "delivery_proof", "document", "product_media"] }).notNull(),
    entity: text("entity").notNull(),
    entityId: text("entity_id").notNull(),
    filename: text("filename").notNull(),
    contentType: text("content_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    sha256: text("sha256").notNull(),
    /** "blob:<url>" (Vercel Blob, private) or "local:<key>" (dev/test). */
    storageKey: text("storage_key").notNull(),
    uploadedBy: uuid("uploaded_by")
      .notNull()
      .references(() => users.id),
    /** Artwork only: customer sign-off / HSP review. */
    reviewStatus: text("review_status", { enum: ["submitted", "approved", "rejected"] }),
    reviewNote: text("review_note"),
    createdAt: createdAt(),
  },
  (t) => [index("files_entity_idx").on(t.entity, t.entityId)],
);

/* ── Storefront account: addresses, wishlist; enquiries (bulk quote / contact) ── */

export const customerAddresses = pgTable(
  "customer_addresses",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    label: text("label").notNull().default("Home"),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    line1: text("line1").notNull(),
    line2: text("line2"),
    city: text("city").notNull(),
    state: text("state").notNull(),
    pincode: text("pincode").notNull(),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [index("customer_addresses_user_idx").on(t.userId)],
);

export const wishlistItems = pgTable(
  "wishlist_items",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => products.id),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("wishlist_items_uq").on(t.userId, t.productId)],
);

export const enquiries = pgTable(
  "enquiries",
  {
    id: id(),
    number: text("number").notNull(),
    kind: text("kind", { enum: ["bulk_quote", "contact"] }).notNull(),
    status: text("status", { enum: ["new", "in_review", "quoted", "closed"] }).notNull().default("new"),
    userId: uuid("user_id").references(() => users.id),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    organization: text("organization"),
    subject: text("subject"),
    message: text("message"),
    /** Bulk quote: [{productId, quantity, notes}]. */
    lines: jsonb("lines"),
    /** Requirements, delivery address, budget, deadline… as submitted. */
    details: jsonb("details"),
    quotationId: uuid("quotation_id").references(() => quotations.id),
    handledBy: uuid("handled_by").references(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("enquiries_number_uq").on(t.number), index("enquiries_email_idx").on(t.email)],
);

/* ── Franchise deposit settlement (Blueprint §2 "Rules for franchise protection") ── */

/** Refund of a security deposit: documented deductions, maker-checker approval, liability released. */
export const depositSettlements = pgTable(
  "deposit_settlements",
  {
    id: id(),
    number: text("number").notNull().unique(),
    partnerId: uuid("partner_id")
      .notNull()
      .references(() => partners.id),
    depositPaise: paise("deposit_paise").notNull(),
    /** [{ reason, amountPaise }] — damages, unpaid dues, documented under the agreement. */
    deductions: jsonb("deductions").notNull(),
    deductionPaise: paise("deduction_paise").notNull(),
    refundPaise: paise("refund_paise").notNull(),
    reason: text("reason").notNull(),
    status: text("status", { enum: ["pending", "approved", "rejected"] }).notNull().default("pending"),
    payoutReference: text("payout_reference"),
    requestedBy: uuid("requested_by")
      .notNull()
      .references(() => users.id),
    decidedBy: uuid("decided_by").references(() => users.id),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("deposit_settlements_partner_idx").on(t.partnerId)],
);

/* ── Customer grievances (Blueprint §1: HSP accountable, partner assists, supplier resolves defects) ── */

export const grievances = pgTable(
  "grievances",
  {
    id: id(),
    number: text("number").notNull().unique(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id),
    raisedBy: uuid("raised_by")
      .notNull()
      .references(() => users.id),
    raisedByRole: text("raised_by_role").notNull(),
    category: text("category", {
      enum: ["damaged", "missing", "wrong_item", "quality", "delay", "billing", "other"],
    }).notNull(),
    description: text("description").notNull(),
    status: text("status", { enum: ["open", "with_supplier", "resolved", "closed"] }).notNull().default("open"),
    supplierId: uuid("supplier_id").references(() => suppliers.id),
    supplierNote: text("supplier_note"),
    resolution: text("resolution"),
    creditNoteId: uuid("credit_note_id").references(() => creditNotes.id),
    dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("grievances_order_idx").on(t.orderId), index("grievances_status_idx").on(t.status)],
);

/* ── Management settings (e.g. financial-plan assumptions); staff-only, never served to the storefront ── */

export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedBy: uuid("updated_by").references(() => users.id),
  updatedAt: updatedAt(),
});

/* ── HSP's sales history before the platform (Blueprint §11 dataset 2), imported from CSV ── */

export const salesHistory = pgTable(
  "sales_history",
  {
    id: id(),
    month: text("month").notNull(),
    channel: text("channel", { enum: ["associate", "franchise", "direct", "online", "other"] }).notNull(),
    division: text("division"),
    orders: integer("orders").notNull(),
    revenuePaise: paise("revenue_paise").notNull(),
    costPaise: paise("cost_paise"),
    createdAt: createdAt(),
  },
  (t) => [unique("sales_history_uq").on(t.month, t.channel, t.division).nullsNotDistinct()],
);
