import type {
  CustomerType,
  OrderType,
  PackagingPreference,
  YesNo,
} from "@/lib/bulkQuote";
import type { CustomerAddress } from "@/types/customer";

/**
 * Bulk quote request types for demo account + future Quotation mapping.
 * DEMO / MOCK FRONTEND DATA — no fake quote pricing.
 */

export type QuoteStatus =
  | "submitted"
  | "under-review"
  | "responded"
  | "approved"
  | "closed";

export type QuoteTimelineStep =
  | "submitted"
  | "under-review"
  | "quotation"
  | "confirmation";

export type QuoteItem = {
  productId: string;
  sku: string;
  productSlug: string;
  productName: string;
  quantity: number;
  notes: string;
  customization?: string;
};

export type QuoteRequest = {
  id: string;
  reference: string;
  submittedAt: string;
  status: QuoteStatus;
  timelineStep: QuoteTimelineStep;
  orderType: OrderType;
  customerType?: CustomerType;
  items: QuoteItem[];
  totalUnits: number;
  customization: YesNo;
  customizationNotes: string;
  packaging: PackagingPreference;
  branding: YesNo;
  brandName: string;
  expectedDelivery: string;
  additionalNotes: string;
  designFileName: string | null;
  customerName: string;
  organizationName: string;
  email: string;
  phone: string;
  deliveryAddress: CustomerAddress;
};
