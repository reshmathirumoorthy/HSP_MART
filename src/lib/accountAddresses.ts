/**
 * Frontend-only saved address book.
 * Starts empty — does not invent addresses.
 * Future CRM can replace this persistence layer.
 */

import { writeJsonStorage } from "@/lib/discovery";
import type { SavedAddress } from "@/types/customer";

export const ACCOUNT_ADDRESSES_STORAGE_KEY = "hsp-mart-account-addresses";

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

export function sanitizeSavedAddress(value: unknown): SavedAddress | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const id = asString(record.id);
  const fullName = asString(record.fullName);
  const addressLine1 = asString(record.addressLine1);
  const city = asString(record.city);
  const state = asString(record.state);
  const postalCode = asString(record.postalCode);
  if (!id || !fullName || !addressLine1 || !city || !state || !postalCode) {
    return null;
  }

  return {
    id,
    label: asString(record.label, "Address") || "Address",
    fullName,
    phone: asString(record.phone),
    addressLine1,
    addressLine2: asString(record.addressLine2),
    city,
    state,
    postalCode,
    country: asString(record.country, "India") || "India",
    isDefault: record.isDefault === true,
  };
}

export function sanitizeSavedAddresses(value: unknown): SavedAddress[] {
  if (!Array.isArray(value)) return [];
  const next: SavedAddress[] = [];
  const seen = new Set<string>();

  for (const entry of value) {
    const address = sanitizeSavedAddress(entry);
    if (!address || seen.has(address.id)) continue;
    seen.add(address.id);
    next.push(address);
  }

  const defaultCount = next.filter((item) => item.isDefault).length;
  if (defaultCount > 1) {
    let kept = false;
    return next.map((item) => {
      if (!item.isDefault) return item;
      if (!kept) {
        kept = true;
        return item;
      }
      return { ...item, isDefault: false };
    });
  }

  return next;
}

export function readSavedAddresses(): SavedAddress[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(ACCOUNT_ADDRESSES_STORAGE_KEY);
    if (!raw) return [];
    return sanitizeSavedAddresses(JSON.parse(raw) as unknown);
  } catch {
    return [];
  }
}

export function writeSavedAddresses(addresses: SavedAddress[]): void {
  writeJsonStorage(
    ACCOUNT_ADDRESSES_STORAGE_KEY,
    sanitizeSavedAddresses(addresses),
  );
}

export function createAddressId(): string {
  return `addr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function withSingleDefault(
  addresses: SavedAddress[],
  defaultId: string,
): SavedAddress[] {
  return addresses.map((address) => ({
    ...address,
    isDefault: address.id === defaultId,
  }));
}
