"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  ACCOUNT_ADDRESSES_STORAGE_KEY,
  createAddressId,
  sanitizeSavedAddresses,
  withSingleDefault,
  writeSavedAddresses,
} from "@/lib/accountAddresses";
import { useClientHydrated } from "@/hooks/useClientHydrated";
import type { SavedAddress } from "@/types/customer";

type AddressInput = Omit<SavedAddress, "id" | "isDefault"> & {
  id?: string;
  isDefault?: boolean;
};

type AccountAddressContextValue = {
  addresses: SavedAddress[];
  hydrated: boolean;
  addAddress: (input: AddressInput) => SavedAddress;
  updateAddress: (id: string, input: AddressInput) => boolean;
  removeAddress: (id: string) => void;
  setDefaultAddress: (id: string) => void;
};

const AccountAddressContext =
  createContext<AccountAddressContextValue | null>(null);

const EMPTY: SavedAddress[] = [];
const CHANGE_EVENT = "hsp-mart-account-addresses-change";
let cachedSerialized = "__unset__";
let cachedAddresses: SavedAddress[] = EMPTY;

function emitChange() {
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(onStoreChange: () => void) {
  const handle = () => onStoreChange();
  window.addEventListener("storage", handle);
  window.addEventListener(CHANGE_EVENT, handle);
  return () => {
    window.removeEventListener("storage", handle);
    window.removeEventListener(CHANGE_EVENT, handle);
  };
}

function getSnapshot(): SavedAddress[] {
  try {
    const raw = window.localStorage.getItem(ACCOUNT_ADDRESSES_STORAGE_KEY);
    const serialized = raw ?? "[]";
    if (serialized === cachedSerialized) return cachedAddresses;
    const parsed = raw
      ? sanitizeSavedAddresses(JSON.parse(raw) as unknown)
      : EMPTY;
    cachedSerialized = serialized;
    cachedAddresses = parsed.length === 0 ? EMPTY : parsed;
    return cachedAddresses;
  } catch {
    cachedSerialized = "[]";
    cachedAddresses = EMPTY;
    return EMPTY;
  }
}

function getServerSnapshot() {
  return EMPTY;
}

function commit(next: SavedAddress[]) {
  const sanitized = sanitizeSavedAddresses(next);
  writeSavedAddresses(sanitized);
  cachedSerialized = JSON.stringify(sanitized);
  cachedAddresses = sanitized.length === 0 ? EMPTY : sanitized;
  emitChange();
}

export function AccountAddressProvider({ children }: { children: ReactNode }) {
  const hydrated = useClientHydrated();
  const addresses = useSyncExternalStore(
    subscribe,
    () => (hydrated ? getSnapshot() : EMPTY),
    getServerSnapshot,
  );

  const addAddress = useCallback((input: AddressInput) => {
    const current = getSnapshot();
    const id = input.id?.trim() || createAddressId();
    const nextAddress: SavedAddress = {
      id,
      label: input.label.trim() || "Address",
      fullName: input.fullName.trim(),
      phone: input.phone.trim(),
      addressLine1: input.addressLine1.trim(),
      addressLine2: input.addressLine2.trim(),
      city: input.city.trim(),
      state: input.state.trim(),
      postalCode: input.postalCode.trim(),
      country: input.country.trim() || "India",
      isDefault: Boolean(input.isDefault) || current.length === 0,
    };
    const base = [...current.filter((item) => item.id !== id), nextAddress];
    commit(
      nextAddress.isDefault ? withSingleDefault(base, id) : base,
    );
    return nextAddress;
  }, []);

  const updateAddress = useCallback((id: string, input: AddressInput) => {
    const current = getSnapshot();
    if (!current.some((item) => item.id === id)) return false;
    const next = current.map((item) =>
      item.id === id
        ? {
            ...item,
            label: input.label.trim() || item.label,
            fullName: input.fullName.trim(),
            phone: input.phone.trim(),
            addressLine1: input.addressLine1.trim(),
            addressLine2: input.addressLine2.trim(),
            city: input.city.trim(),
            state: input.state.trim(),
            postalCode: input.postalCode.trim(),
            country: input.country.trim() || "India",
            isDefault:
              input.isDefault === undefined
                ? item.isDefault
                : Boolean(input.isDefault),
          }
        : item,
    );
    const updated = next.find((item) => item.id === id);
    commit(
      updated?.isDefault ? withSingleDefault(next, id) : next,
    );
    return true;
  }, []);

  const removeAddress = useCallback((id: string) => {
    const current = getSnapshot();
    const next = current.filter((item) => item.id !== id);
    if (next.length > 0 && !next.some((item) => item.isDefault)) {
      next[0] = { ...next[0], isDefault: true };
    }
    commit(next);
  }, []);

  const setDefaultAddress = useCallback((id: string) => {
    const current = getSnapshot();
    if (!current.some((item) => item.id === id)) return;
    commit(withSingleDefault(current, id));
  }, []);

  const value = useMemo(
    () => ({
      addresses,
      hydrated,
      addAddress,
      updateAddress,
      removeAddress,
      setDefaultAddress,
    }),
    [
      addresses,
      hydrated,
      addAddress,
      updateAddress,
      removeAddress,
      setDefaultAddress,
    ],
  );

  return (
    <AccountAddressContext.Provider value={value}>
      {children}
    </AccountAddressContext.Provider>
  );
}

export function useAccountAddresses() {
  const ctx = useContext(AccountAddressContext);
  if (!ctx) {
    throw new Error(
      "useAccountAddresses must be used within AccountAddressProvider",
    );
  }
  return ctx;
}
