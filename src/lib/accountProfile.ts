/**
 * Frontend-only customer profile overlay.
 * Seeded from demoCustomer; local edits persist in localStorage.
 * Future CRM can replace this store without rewriting account UI.
 */

import { getCustomer as getSeedCustomer } from "@/data/account";
import type { CustomerAddress, CustomerProfile } from "@/types/customer";
import { writeJsonStorage } from "@/lib/discovery";

export const ACCOUNT_PROFILE_STORAGE_KEY = "hsp-mart-account-profile";

const EMPTY_ADDRESS: CustomerAddress = {
  line1: "",
  line2: "",
  city: "",
  state: "",
  pincode: "",
  country: "India",
};

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

/**
 * Avatar is a local data URL only (never a remote URL or upload).
 * Capped so the profile stays well under the localStorage quota.
 */
const MAX_AVATAR_LENGTH = 400_000;

function sanitizeAvatar(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed.startsWith("data:image/")) return undefined;
  if (trimmed.length > MAX_AVATAR_LENGTH) return undefined;
  return trimmed;
}

function sanitizeAddress(value: unknown): CustomerAddress {
  if (!value || typeof value !== "object") return { ...EMPTY_ADDRESS };
  const record = value as Record<string, unknown>;
  return {
    line1: asString(record.line1),
    line2: asString(record.line2),
    city: asString(record.city),
    state: asString(record.state),
    pincode: asString(record.pincode),
    country: asString(record.country, "India") || "India",
  };
}

export function sanitizeCustomerProfile(value: unknown): CustomerProfile | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const seed = getSeedCustomer();
  const fullName = asString(record.fullName, seed.fullName);
  if (!fullName) return null;

  const firstName =
    asString(record.firstName) ||
    fullName.split(/\s+/)[0] ||
    seed.firstName;

  const customerType =
    record.customerType === "individual" ||
    record.customerType === "business" ||
    record.customerType === "reseller" ||
    record.customerType === "institution"
      ? record.customerType
      : seed.customerType;

  return {
    id: asString(record.id, seed.id) || seed.id,
    fullName,
    firstName,
    email: asString(record.email, seed.email),
    phone: asString(record.phone, seed.phone),
    customerType,
    organizationName: asString(record.organizationName, seed.organizationName),
    gstin: asString(record.gstin, seed.gstin),
    address: sanitizeAddress(record.address),
    avatar: sanitizeAvatar(record.avatar),
  };
}

export function readAccountProfile(): CustomerProfile {
  if (typeof window === "undefined") return getSeedCustomer();
  try {
    const raw = window.localStorage.getItem(ACCOUNT_PROFILE_STORAGE_KEY);
    if (!raw) return getSeedCustomer();
    const parsed = sanitizeCustomerProfile(JSON.parse(raw) as unknown);
    return parsed ?? getSeedCustomer();
  } catch {
    return getSeedCustomer();
  }
}

export function writeAccountProfile(profile: CustomerProfile): void {
  const sanitized = sanitizeCustomerProfile(profile);
  if (!sanitized) return;
  writeJsonStorage(ACCOUNT_PROFILE_STORAGE_KEY, sanitized);
}

export function clearAccountProfileOverlay(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(ACCOUNT_PROFILE_STORAGE_KEY);
  } catch {
    // Ignore private-mode failures.
  }
}

export function displayOrNotAdded(value: string | undefined | null): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "Not added";
}
