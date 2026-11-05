"use client";

import { startTransition, useEffect, useState } from "react";

/**
 * False on SSR and the hydration render; true after mount.
 * Keeps localStorage-backed UI aligned with server HTML.
 */
export function useClientHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    startTransition(() => {
      setHydrated(true);
    });
  }, []);

  return hydrated;
}
