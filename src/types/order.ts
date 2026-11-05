import type { PaymentMethod } from "@/lib/checkout";
import type { CustomerAddress } from "@/types/customer";

/**
 * Order snapshot types for demo account + future Sales Order mapping.
 * DEMO / MOCK FRONTEND DATA
 */

export type OrderStatus =
  | "processing"
  | "confirmed"
  | "shipped"
  | "delivered"
  | "cancelled";

export type OrderTimelineStep =
  | "placed"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered";

export type OrderItem = {
  productId: string;
  sku: string;
  productSlug: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  /** Optional future CRM fields — omit when unavailable. */
  variantLabel?: string;
  customizationSummary?: string[];
  hamperContents?: string[];
};

/**
 * Future backend tracking event shape.
 * Do not invent events in the frontend — only render when provided.
 */
export type OrderTrackingEvent = {
  status: string;
  timestamp: string;
  label: string;
  description?: string;
};

export type Order = {
  id: string;
  reference: string;
  placedAt: string;
  status: OrderStatus;
  timelineStep: OrderTimelineStep;
  items: OrderItem[];
  itemCount: number;
  subtotal: number;
  shipping: number;
  total: number;
  currency: "INR";
  paymentMethod: PaymentMethod;
  deliveryName: string;
  deliveryAddress: CustomerAddress;
  /** Populated by a future order/tracking service — never invented locally. */
  trackingEvents?: OrderTrackingEvent[];
};
