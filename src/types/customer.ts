import type { CustomerType } from "@/lib/bulkQuote";

/**
 * Frontend customer profile (demo account).
 * No passwords, tokens, or ERP credentials.
 * Structured for future CRM Customer mapping.
 */

export type CustomerAddress = {
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
};

/**
 * Local address-book entry (frontend-only persistence).
 * Future CRM can replace this store without changing the UI shape.
 */
export type SavedAddress = {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
};

export type CustomerProfile = {
  id: string;
  fullName: string;
  firstName: string;
  email: string;
  phone: string;
  customerType: CustomerType;
  organizationName: string;
  gstin: string;
  address: CustomerAddress;
  /** Optional local avatar as a data URL. Frontend-only; never uploaded. */
  avatar?: string;
};
