"use client";

/** Address book stored on the customer's account (/api/account/addresses). */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { clientApi } from "@/lib/clientApi";
import { useAccountSession } from "@/hooks/useAccountSession";
import type { SavedAddress } from "@/types/customer";

type AddressInput = Omit<SavedAddress, "id" | "isDefault"> & { id?: string; isDefault?: boolean };

type AccountAddressContextValue = {
  addresses: SavedAddress[];
  hydrated: boolean;
  signedIn: boolean;
  error: string | null;
  addAddress: (input: AddressInput) => Promise<SavedAddress | null>;
  updateAddress: (id: string, input: AddressInput) => Promise<boolean>;
  removeAddress: (id: string) => Promise<void>;
  setDefaultAddress: (id: string) => Promise<void>;
};

const AccountAddressContext = createContext<AccountAddressContextValue | null>(null);

export function AccountAddressProvider({ children }: { children: ReactNode }) {
  const { user, ready } = useAccountSession();
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => clientApi<SavedAddress[]>("/account/addresses").then(setAddresses), []);

  useEffect(() => {
    if (!ready || !user) return;
    refresh()
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoaded(true));
  }, [ready, user, refresh]);

  const run = useCallback(async <T,>(fn: () => Promise<T>): Promise<T | null> => {
    setError(null);
    try {
      return await fn();
    } catch (e) {
      setError((e as Error).message);
      return null;
    }
  }, []);

  const addAddress = useCallback(
    (input: AddressInput) =>
      run(async () => {
        const saved = await clientApi<SavedAddress>("/account/addresses", { body: input });
        await refresh();
        return saved;
      }),
    [run, refresh],
  );

  const updateAddress = useCallback(
    async (id: string, input: AddressInput) =>
      (await run(async () => {
        await clientApi(`/account/addresses/${id}`, { body: input });
        await refresh();
        return true;
      })) ?? false,
    [run, refresh],
  );

  const removeAddress = useCallback(
    async (id: string) => {
      const next = await run(() => clientApi<SavedAddress[]>(`/account/addresses/${id}`, { method: "DELETE" }));
      if (next) setAddresses(next);
    },
    [run],
  );

  const setDefaultAddress = useCallback(
    async (id: string) => {
      const next = await run(() => clientApi<SavedAddress[]>(`/account/addresses/${id}/default`, { body: {} }));
      if (next) setAddresses(next);
    },
    [run],
  );

  const value = useMemo(
    () => ({ addresses, hydrated: ready && (!user || loaded), signedIn: !!user, error, addAddress, updateAddress, removeAddress, setDefaultAddress }),
    [addresses, ready, loaded, user, error, addAddress, updateAddress, removeAddress, setDefaultAddress],
  );
  return <AccountAddressContext.Provider value={value}>{children}</AccountAddressContext.Provider>;
}

export function useAccountAddresses() {
  const ctx = useContext(AccountAddressContext);
  if (!ctx) throw new Error("useAccountAddresses must be used within AccountAddressProvider");
  return ctx;
}
