/**
 * Customer account types. Live data comes from the backend (/api/account/*); see
 * backend/app/services/account.py for how orders and quote requests map to these shapes.
 */

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

import type { OrderStatus, OrderTimelineStep } from "@/types/order";
import type { QuoteStatus, QuoteTimelineStep } from "@/types/quote";

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
