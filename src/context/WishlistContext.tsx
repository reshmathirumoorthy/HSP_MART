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
  WISHLIST_STORAGE_KEY,
  resolveProductsByIds,
  sanitizeProductIds,
  writeJsonStorage,
} from "@/lib/discovery";
import type { Product } from "@/data/products";
import { useClientHydrated } from "@/hooks/useClientHydrated";

type WishlistContextValue = {
  ids: string[];
  products: Product[];
  count: number;
  hydrated: boolean;
  addToWishlist: (productId: string) => boolean;
  removeFromWishlist: (productId: string) => void;
  /** Restore a product ID at an optional index (undo). Prevents duplicates. */
  restoreToWishlist: (productId: string, index?: number) => boolean;
  toggleWishlist: (productId: string) => boolean;
  isWishlisted: (productId: string) => boolean;
  clearWishlist: () => void;
};

const WishlistContext = createContext<WishlistContextValue | null>(null);

const EMPTY: string[] = [];
const CHANGE_EVENT = "hsp-mart-wishlist-change";

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

/** Always read storage — used by mutations and post-hydration snapshots. */
function readIds(): string[] {
  try {
    const raw = window.localStorage.getItem(WISHLIST_STORAGE_KEY);
    const serialized = raw ?? "[]";
    if (serialized === cachedSerialized) return cachedIds;

    let parsedJson: unknown = [];
    if (raw) {
      parsedJson = JSON.parse(raw) as unknown;
    }

    const parsed = sanitizeProductIds(parsedJson);
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
  const sanitized = sanitizeProductIds(next);
  writeJsonStorage(WISHLIST_STORAGE_KEY, sanitized);
  cachedSerialized = JSON.stringify(sanitized);
  cachedIds = sanitized.length === 0 ? EMPTY : sanitized;
  emitChange();
}

export function WishlistProvider({ children }: { children: ReactNode }) {
  const hydrated = useClientHydrated();

  const ids = useSyncExternalStore(
    subscribe,
    () => (hydrated ? readIds() : EMPTY),
    getServerSnapshot,
  );

  const addToWishlist = useCallback((productId: string) => {
    if (!getProductById(productId)) return false;
    const current = readIds();
    if (current.includes(productId)) return true;
    commit([productId, ...current]);
    return true;
  }, []);

  const removeFromWishlist = useCallback((productId: string) => {
    commit(readIds().filter((id) => id !== productId));
  }, []);

  const restoreToWishlist = useCallback(
    (productId: string, index?: number) => {
      if (!getProductById(productId)) return false;
      const current = readIds();
      if (current.includes(productId)) return true;

      if (typeof index === "number" && index >= 0) {
        const next = [...current];
        next.splice(Math.min(index, next.length), 0, productId);
        commit(next);
        return true;
      }

      commit([productId, ...current]);
      return true;
    },
    [],
  );

  const toggleWishlist = useCallback((productId: string) => {
    const current = readIds();
    if (current.includes(productId)) {
      commit(current.filter((id) => id !== productId));
      return false;
    }
    if (!getProductById(productId)) return false;
    commit([productId, ...current]);
    return true;
  }, []);

  const isWishlisted = useCallback(
    (productId: string) => ids.includes(productId),
    [ids],
  );

  const clearWishlist = useCallback(() => commit([]), []);

  const products = useMemo(() => resolveProductsByIds(ids), [ids]);

  const value = useMemo(
    () => ({
      ids,
      products,
      count: products.length,
      hydrated,
      addToWishlist,
      removeFromWishlist,
      restoreToWishlist,
      toggleWishlist,
      isWishlisted,
      clearWishlist,
    }),
    [
      ids,
      products,
      hydrated,
      addToWishlist,
      removeFromWishlist,
      restoreToWishlist,
      toggleWishlist,
      isWishlisted,
      clearWishlist,
    ],
  );

  return (
    <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) {
    throw new Error("useWishlist must be used within WishlistProvider");
  }
  return ctx;
}
