"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useClientHydrated } from "@/hooks/useClientHydrated";
import { getProductById } from "@/lib/cart";
import {
  COMPARE_STORAGE_KEY,
  MAX_COMPARE,
  resolveProductsByIds,
  sanitizeProductIds,
  writeJsonStorage,
} from "@/lib/discovery";
import type { Product } from "@/data/products";

type CompareContextValue = {
  ids: string[];
  products: Product[];
  count: number;
  hydrated: boolean;
  limitMessage: string | null;
  addToCompare: (productId: string) => boolean;
  removeFromCompare: (productId: string) => void;
  toggleCompare: (productId: string) => boolean;
  isInCompare: (productId: string) => boolean;
  clearCompare: () => void;
  dismissLimitMessage: () => void;
};

const CompareContext = createContext<CompareContextValue | null>(null);

const EMPTY: string[] = [];
const CHANGE_EVENT = "hsp-mart-compare-change";

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
    const raw = window.localStorage.getItem(COMPARE_STORAGE_KEY);
    const serialized = raw ?? "[]";
    if (serialized === cachedSerialized) return cachedIds;

    const parsed = raw
      ? sanitizeProductIds(JSON.parse(raw) as unknown, MAX_COMPARE)
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
  const sanitized = sanitizeProductIds(next, MAX_COMPARE);
  writeJsonStorage(COMPARE_STORAGE_KEY, sanitized);
  cachedSerialized = JSON.stringify(sanitized);
  cachedIds = sanitized.length === 0 ? EMPTY : sanitized;
  emitChange();
}

export function CompareProvider({ children }: { children: ReactNode }) {
  const hydrated = useClientHydrated();
  const [limitMessage, setLimitMessage] = useState<string | null>(null);

  const ids = useSyncExternalStore(
    subscribe,
    () => (hydrated ? readIds() : EMPTY),
    getServerSnapshot,
  );

  const addToCompare = useCallback((productId: string) => {
    if (!getProductById(productId)) return false;
    const current = readIds();
    if (current.includes(productId)) {
      setLimitMessage(null);
      return true;
    }
    if (current.length >= MAX_COMPARE) {
      setLimitMessage("You can compare up to 4 products.");
      return false;
    }
    setLimitMessage(null);
    commit([...current, productId]);
    return true;
  }, []);

  const removeFromCompare = useCallback((productId: string) => {
    setLimitMessage(null);
    commit(readIds().filter((id) => id !== productId));
  }, []);

  const toggleCompare = useCallback((productId: string) => {
    const current = readIds();
    if (current.includes(productId)) {
      setLimitMessage(null);
      commit(current.filter((id) => id !== productId));
      return false;
    }
    return addToCompare(productId);
  }, [addToCompare]);

  const isInCompare = useCallback(
    (productId: string) => ids.includes(productId),
    [ids],
  );

  const clearCompare = useCallback(() => {
    setLimitMessage(null);
    commit([]);
  }, []);

  const dismissLimitMessage = useCallback(() => setLimitMessage(null), []);

  const products = useMemo(() => resolveProductsByIds(ids), [ids]);

  const value = useMemo(
    () => ({
      ids,
      products,
      count: products.length,
      hydrated,
      limitMessage,
      addToCompare,
      removeFromCompare,
      toggleCompare,
      isInCompare,
      clearCompare,
      dismissLimitMessage,
    }),
    [
      ids,
      products,
      hydrated,
      limitMessage,
      addToCompare,
      removeFromCompare,
      toggleCompare,
      isInCompare,
      clearCompare,
      dismissLimitMessage,
    ],
  );

  return (
    <CompareContext.Provider value={value}>{children}</CompareContext.Provider>
  );
}

export function useCompare() {
  const ctx = useContext(CompareContext);
  if (!ctx) {
    throw new Error("useCompare must be used within CompareProvider");
  }
  return ctx;
}
