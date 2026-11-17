"use client";

/**
 * Customer profile from the backend (/api/account/profile). The optional avatar photo is a
 * device-local preference and is never uploaded.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { clientApi } from "@/lib/clientApi";
import { useAccountSession } from "@/hooks/useAccountSession";
import type { CustomerProfile } from "@/types/customer";

type AccountProfileContextValue = {
  profile: CustomerProfile;
  hydrated: boolean;
  signedIn: boolean;
  error: string | null;
  saving: boolean;
  /** Saves name, customer type, organisation and GSTIN to the account; the avatar stays on this device. */
  saveProfile: (profile: CustomerProfile) => Promise<boolean>;
  resetProfileOverlay: () => void;
};

const AVATAR_KEY = "hsp-mart-account-avatar";
const EMPTY_PROFILE: CustomerProfile = {
  id: "",
  fullName: "",
  firstName: "",
  email: "",
  phone: "",
  customerType: "individual",
  organizationName: "",
  gstin: "",
  address: { line1: "", line2: "", city: "", state: "", pincode: "", country: "India" },
};

const AccountProfileContext = createContext<AccountProfileContextValue | null>(null);

function readAvatar(): string | undefined {
  try {
    return window.localStorage.getItem(AVATAR_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

function writeAvatar(v: string | undefined) {
  try {
    if (v) window.localStorage.setItem(AVATAR_KEY, v);
    else window.localStorage.removeItem(AVATAR_KEY);
  } catch {}
}

export function AccountProfileProvider({ children }: { children: ReactNode }) {
  const { user, ready } = useAccountSession();
  const [profile, setProfile] = useState<CustomerProfile>(EMPTY_PROFILE);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!ready || !user) return;
    clientApi<CustomerProfile>("/account/profile")
      .then((p) => setProfile({ ...p, avatar: readAvatar() }))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoaded(true));
  }, [ready, user]);

  const saveProfile = useCallback(
    async (next: CustomerProfile) => {
      writeAvatar(next.avatar);
      setError(null);
      if (!user) {
        setProfile((p) => ({ ...p, avatar: next.avatar }));
        return false;
      }
      setSaving(true);
      try {
        const saved = await clientApi<CustomerProfile>("/account/profile", {
          body: {
            fullName: next.fullName,
            customerType: next.customerType,
            organizationName: next.organizationName,
            gstin: next.gstin,
          },
        });
        setProfile({ ...saved, avatar: next.avatar });
        return true;
      } catch (e) {
        setError((e as Error).message);
        return false;
      } finally {
        setSaving(false);
      }
    },
    [user],
  );

  const resetProfileOverlay = useCallback(() => {
    writeAvatar(undefined);
    setProfile((p) => ({ ...p, avatar: undefined }));
  }, []);

  const value = useMemo(
    () => ({ profile, hydrated: ready && (!user || loaded), signedIn: !!user, error, saving, saveProfile, resetProfileOverlay }),
    [profile, ready, loaded, user, error, saving, saveProfile, resetProfileOverlay],
  );
  return <AccountProfileContext.Provider value={value}>{children}</AccountProfileContext.Provider>;
}

export function useAccountProfile() {
  const ctx = useContext(AccountProfileContext);
  if (!ctx) throw new Error("useAccountProfile must be used within AccountProfileProvider");
  return ctx;
}
