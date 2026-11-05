/**
 * Demo customer account data for the frontend.
 * DEMO / MOCK FRONTEND DATA — not live ERPNext Customer / Sales Order / Quotation records.
 */

import type { CustomerType, OrderType, PackagingPreference, YesNo } from "@/lib/bulkQuote";
import type { PaymentMethod } from "@/lib/checkout";
import type { CustomerProfile } from "@/types/customer";
import type {
  Order,
  OrderItem,
  OrderStatus,
  OrderTimelineStep,
} from "@/types/order";
import type {
  QuoteItem,
  QuoteRequest,
  QuoteStatus,
  QuoteTimelineStep,
} from "@/types/quote";
import { getProductById } from "@/lib/products";

export type {
  CustomerProfile,
} from "@/types/customer";
export type {
  Order,
  OrderItem,
  OrderStatus,
  OrderTimelineStep,
} from "@/types/order";
export type {
  QuoteItem,
  QuoteRequest,
  QuoteStatus,
  QuoteTimelineStep,
} from "@/types/quote";

function orderItem(
  productId: string,
  quantity: number,
): OrderItem {
  const product = getProductById(productId);
  const unitPrice = product?.price ?? 0;
  return {
    productId,
    sku: product?.sku ?? "HSP-DEMO-000",
    productSlug: product?.slug ?? productId,
    productName: product?.name ?? productId,
    quantity,
    unitPrice,
    lineTotal: unitPrice * quantity,
  };
}

function quoteItem(
  productId: string,
  quantity: number,
  notes = "",
  customization?: string,
): QuoteItem {
  const product = getProductById(productId);
  return {
    productId,
    sku: product?.sku ?? "HSP-DEMO-000",
    productSlug: product?.slug ?? productId,
    productName: product?.name ?? productId,
    quantity,
    notes,
    customization,
  };
}

/** DEMO customer profile — placeholder contact details only. */
const demoCustomer: CustomerProfile = {
  id: "demo-customer-01",
  fullName: "Reshma Thirumoorthy",
  firstName: "Reshma",
  email: "customer@example.com",
  phone: "+91 98765 43210",
  customerType: "business" satisfies CustomerType,
  organizationName: "HSP Studio Co.",
  gstin: "33AAAAA0000A1Z5",
  address: {
    line1: "12 Lake View Road",
    line2: "RS Puram",
    city: "Coimbatore",
    state: "Tamil Nadu",
    pincode: "641002",
    country: "India",
  },
};

const mockOrders: Order[] = [
  {
    id: "HSP-1024",
    reference: "HSP-1024",
    placedAt: "2026-09-18",
    status: "delivered",
    timelineStep: "delivered",
    items: [
      orderItem("executive-notebook-01", 2),
      orderItem("premium-pen-set-01", 1),
    ],
    itemCount: 3,
    subtotal: 1400,
    shipping: 0,
    total: 1400,
    currency: "INR",
    paymentMethod: "upi" satisfies PaymentMethod,
    deliveryName: "Reshma Thirumoorthy",
    deliveryAddress: { ...demoCustomer.address },
  },
  {
    id: "HSP-1018",
    reference: "HSP-1018",
    placedAt: "2026-09-04",
    status: "shipped",
    timelineStep: "shipped",
    items: [
      orderItem("desk-organizer-01", 1),
      orderItem("sticky-notes-01", 3),
      orderItem("gel-pen-pack-01", 1),
    ],
    itemCount: 5,
    subtotal: 1536,
    shipping: 0,
    total: 1536,
    currency: "INR",
    paymentMethod: "card",
    deliveryName: "Reshma Thirumoorthy",
    deliveryAddress: { ...demoCustomer.address },
  },
  {
    id: "HSP-1007",
    reference: "HSP-1007",
    placedAt: "2026-08-12",
    status: "processing",
    timelineStep: "processing",
    items: [
      orderItem("writing-pad-01", 1),
      orderItem("clipboard-01", 1),
    ],
    itemCount: 2,
    subtotal: 480,
    shipping: 0,
    total: 480,
    currency: "INR",
    paymentMethod: "cod",
    deliveryName: "Reshma Thirumoorthy",
    deliveryAddress: { ...demoCustomer.address },
  },
];

const mockQuotes: QuoteRequest[] = [
  {
    id: "HSP-QUOTE-7F42A1",
    reference: "HSP-QUOTE-7F42A1",
    submittedAt: "2026-09-22",
    status: "under-review",
    timelineStep: "under-review",
    orderType: "corporate" satisfies OrderType,
    items: [
      quoteItem("executive-notebook-01", 500, "Logo on cover", "logo"),
    ],
    totalUnits: 500,
    customization: "yes" satisfies YesNo,
    customizationNotes: "Logo printing on hardcover.",
    packaging: "custom" satisfies PackagingPreference,
    branding: "yes",
    brandName: "HSP Studio Co.",
    expectedDelivery: "2026-10-30",
    additionalNotes: "Needed for team onboarding kits.",
    designFileName: "studio-logo.png",
    customerName: "Reshma Thirumoorthy",
    organizationName: "HSP Studio Co.",
    email: "customer@example.com",
    phone: "+91 98765 43210",
    deliveryAddress: { ...demoCustomer.address },
  },
  {
    id: "HSP-QUOTE-3A92BC",
    reference: "HSP-QUOTE-3A92BC",
    submittedAt: "2026-08-28",
    status: "responded",
    timelineStep: "quotation",
    orderType: "event",
    items: [
      quoteItem("desk-organizer-01", 200),
      quoteItem("signature-pen-01", 300, "Gift packaging preferred", "packaging"),
    ],
    totalUnits: 500,
    customization: "no",
    customizationNotes: "",
    packaging: "standard",
    branding: "no",
    brandName: "",
    expectedDelivery: "2026-09-20",
    additionalNotes: "For a client appreciation event.",
    designFileName: null,
    customerName: "Reshma Thirumoorthy",
    organizationName: "HSP Studio Co.",
    email: "customer@example.com",
    phone: "+91 98765 43210",
    deliveryAddress: { ...demoCustomer.address },
  },
];

export function getCustomer(): CustomerProfile {
  return demoCustomer;
}

export function getOrders(): Order[] {
  return mockOrders;
}

export function getOrderById(id: string): Order | undefined {
  return mockOrders.find(
    (order) => order.id === id || order.reference === id,
  );
}

export function getQuotes(): QuoteRequest[] {
  return mockQuotes;
}

export function getQuoteById(id: string): QuoteRequest | undefined {
  return mockQuotes.find(
    (quote) => quote.id === id || quote.reference === id,
  );
}

export function getAccountOverview() {
  const orders = getOrders();
  const quotes = getQuotes();
  const activeRequests = quotes.filter(
    (quote) =>
      quote.status === "submitted" || quote.status === "under-review",
  ).length;

  return {
    orderCount: orders.length,
    quoteCount: quotes.length,
    activeRequests,
    accountStatus: "Customer" as const,
  };
}

export function formatAccountDate(isoDate: string): string {
  const date = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function orderStatusLabel(status: OrderStatus): string {
  switch (status) {
    case "processing":
      return "Processing";
    case "confirmed":
      return "Confirmed";
    case "shipped":
      return "Shipped";
    case "delivered":
      return "Delivered";
    case "cancelled":
      return "Cancelled";
  }
}

export function quoteStatusLabel(status: QuoteStatus): string {
  switch (status) {
    case "submitted":
      return "Submitted";
    case "under-review":
      return "Under Review";
    case "responded":
      return "Responded";
    case "approved":
      return "Approved";
    case "closed":
      return "Closed";
  }
}

export const ORDER_TIMELINE: Array<{ id: OrderTimelineStep; label: string }> = [
  { id: "placed", label: "Order placed" },
  { id: "confirmed", label: "Confirmed" },
  { id: "processing", label: "Processing" },
  { id: "shipped", label: "Shipped" },
  { id: "delivered", label: "Delivered" },
];

export const QUOTE_TIMELINE: Array<{ id: QuoteTimelineStep; label: string }> = [
  { id: "submitted", label: "Request submitted" },
  { id: "under-review", label: "Under review" },
  { id: "quotation", label: "Quotation" },
  { id: "confirmation", label: "Confirmation" },
];
