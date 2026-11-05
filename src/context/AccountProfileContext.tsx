"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { getCustomer as getSeedCustomer } from "@/data/account";
import {
  ACCOUNT_PROFILE_STORAGE_KEY,
  clearAccountProfileOverlay,
  readAccountProfile,
  writeAccountProfile,
} from "@/lib/accountProfile";
import { useClientHydrated } from "@/hooks/useClientHydrated";
import type { CustomerProfile } from "@/types/customer";

type AccountProfileContextValue = {
  profile: CustomerProfile;
  hydrated: boolean;
  saveProfile: (profile: CustomerProfile) => void;
  resetProfileOverlay: () => void;
};

const AccountProfileContext =
  createContext<AccountProfileContextValue | null>(null);

const CHANGE_EVENT = "hsp-mart-account-profile-change";
const SEED_PROFILE = getSeedCustomer();
let cachedSerialized = "__unset__";
let cachedProfile: CustomerProfile | null = null;

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

function readProfileSnapshot(): CustomerProfile {
  try {
    const raw = window.localStorage.getItem(ACCOUNT_PROFILE_STORAGE_KEY);
    const serialized = raw ?? "__seed__";
    if (serialized === cachedSerialized && cachedProfile) return cachedProfile;
    const profile = readAccountProfile();
    cachedSerialized = serialized;
    cachedProfile = profile;
    return profile;
  } catch {
    const profile = readAccountProfile();
    cachedSerialized = "__seed__";
    cachedProfile = profile;
    return profile;
  }
}

/** Must never touch localStorage — called on the client during hydration. */
function getServerSnapshot(): CustomerProfile {
  return SEED_PROFILE;
}

export function AccountProfileProvider({ children }: { children: ReactNode }) {
  const hydrated = useClientHydrated();
  const profile = useSyncExternalStore(
    subscribe,
    () => (hydrated ? readProfileSnapshot() : SEED_PROFILE),
    getServerSnapshot,
  );

  const saveProfile = useCallback((next: CustomerProfile) => {
    writeAccountProfile(next);
    cachedSerialized = "__unset__";
    cachedProfile = null;
    emitChange();
  }, []);

  const resetProfileOverlay = useCallback(() => {
    clearAccountProfileOverlay();
    cachedSerialized = "__unset__";
    cachedProfile = null;
    emitChange();
  }, []);

  const value = useMemo(
    () => ({
      profile,
      hydrated,
      saveProfile,
      resetProfileOverlay,
    }),
    [profile, hydrated, saveProfile, resetProfileOverlay],
  );

  return (
    <AccountProfileContext.Provider value={value}>
      {children}
    </AccountProfileContext.Provider>
  );
}

export function useAccountProfile() {
  const ctx = useContext(AccountProfileContext);
  if (!ctx) {
    throw new Error(
      "useAccountProfile must be used within AccountProfileProvider",
    );
  }
  return ctx;
}
