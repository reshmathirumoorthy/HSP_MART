"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export type SessionUser = { id: string; email: string | null; phone: string | null; name: string | null; role: string };

let pending: Promise<SessionUser | null> | null = null;
let lastKnown: SessionUser | null | undefined;

/** Who is signed in, according to the backend. Shared by all account contexts (one request per check). */
export function fetchSession(force = false): Promise<SessionUser | null> {
  if (!pending || force) {
    pending = fetch("/api/auth/me", { credentials: "same-origin", cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<SessionUser>) : null))
      .catch(() => null)
      .then((u) => (lastKnown = u));
  }
  return pending;
}

/**
 * Sign-in and sign-out finish with a client-side navigation that keeps the root layout (and these
 * providers) mounted, so the session is re-checked after navigation whenever it may have changed.
 */
export function useAccountSession() {
  const pathname = usePathname();
  const [state, setState] = useState<{ user: SessionUser | null; ready: boolean }>({ user: null, ready: false });
  useEffect(() => {
    let live = true;
    const stale = lastKnown === null || pathname === "/login";
    fetchSession(stale).then((user) => {
      if (!live) return;
      setState((s) => (s.ready && s.user?.id === user?.id ? s : { user, ready: true }));
    });
    return () => {
      live = false;
    };
  }, [pathname]);
  return state;
}
