"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { getProductById } from "@/lib/cart";
import {
  MAX_RECENTLY_VIEWED,
  RECENTLY_VIEWED_STORAGE_KEY,
  pushUniqueId,
  resolveProductsByIds,
  sanitizeProductIds,
  writeJsonStorage,
} from "@/lib/discovery";
import type { Product } from "@/data/products";
import { useClientHydrated } from "@/hooks/useClientHydrated";

type RecentlyViewedContextValue = {
  ids: string[];
  products: Product[];
  hydrated: boolean;
  trackView: (productId: string) => void;
  clearRecentlyViewed: () => void;
};

const RecentlyViewedContext =
  createContext<RecentlyViewedContextValue | null>(null);

const EMPTY: string[] = [];
const CHANGE_EVENT = "hsp-mart-recently-viewed-change";

let cachedSerialized = "__unset__";
let cachedIds: string[] = EMPTY;

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

function getServerSnapshot() {
  return EMPTY;
}

function readIds() {
  try {
    const raw = window.localStorage.getItem(RECENTLY_VIEWED_STORAGE_KEY);
    const serialized = raw ?? "[]";
    if (serialized === cachedSerialized) return cachedIds;

    const parsed = raw
      ? sanitizeProductIds(JSON.parse(raw) as unknown, MAX_RECENTLY_VIEWED)
      : EMPTY;
    cachedSerialized = serialized;
    cachedIds = parsed.length === 0 ? EMPTY : parsed;
    return cachedIds;
  } catch {
    cachedSerialized = "[]";
    cachedIds = EMPTY;
    return EMPTY;
  }
}

function commit(next: string[]) {
  const sanitized = sanitizeProductIds(next, MAX_RECENTLY_VIEWED);
  writeJsonStorage(RECENTLY_VIEWED_STORAGE_KEY, sanitized);
  cachedSerialized = JSON.stringify(sanitized);
  cachedIds = sanitized.length === 0 ? EMPTY : sanitized;
  emitChange();
}

export function RecentlyViewedProvider({ children }: { children: ReactNode }) {
  const hydrated = useClientHydrated();

  const ids = useSyncExternalStore(
    subscribe,
    () => (hydrated ? readIds() : EMPTY),
    getServerSnapshot,
  );

  const trackView = useCallback((productId: string) => {
    if (!getProductById(productId)) return;
    commit(pushUniqueId(readIds(), productId, MAX_RECENTLY_VIEWED));
  }, []);

  const clearRecentlyViewed = useCallback(() => commit([]), []);

  const products = useMemo(() => resolveProductsByIds(ids), [ids]);

  const value = useMemo(
    () => ({
      ids,
      products,
      hydrated,
      trackView,
      clearRecentlyViewed,
    }),
    [ids, products, hydrated, trackView, clearRecentlyViewed],
  );

  return (
    <RecentlyViewedContext.Provider value={value}>
      {children}
    </RecentlyViewedContext.Provider>
  );
}

export function useRecentlyViewed() {
  const ctx = useContext(RecentlyViewedContext);
  if (!ctx) {
    throw new Error(
      "useRecentlyViewed must be used within RecentlyViewedProvider",
    );
  }
  return ctx;
}
