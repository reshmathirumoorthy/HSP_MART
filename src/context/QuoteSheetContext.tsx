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
import { getProductBySlug } from "@/lib/products";

/**
 * Quote Sheet: the corporate buyer's running shortlist (product slug → units).
 * Persisted per browser; handed to /bulk-quote as `product=slug:qty,...`.
 * Frontend-only: nothing is sent to HSP until the bulk-quote form is submitted.
 */

export type QuoteSheetLine = { slug: string; qty: number };

const STORAGE_KEY = "hsp-quote-sheet-v1";
const EVENT = "hsp-quote-sheet-change";
const EMPTY: QuoteSheetLine[] = [];

let cache: { raw: string | null; lines: QuoteSheetLine[] } = { raw: null, lines: EMPTY };

function read(): QuoteSheetLine[] {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return EMPTY;
  }
  if (raw === cache.raw) return cache.lines;
  let lines: QuoteSheetLine[] = EMPTY;
  try {
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    if (Array.isArray(parsed)) {
      lines = parsed
        .filter(
          (l): l is QuoteSheetLine =>
            typeof l?.slug === "string" &&
            Number.isFinite(l?.qty) &&
            Boolean(getProductBySlug(l.slug)),
        )
        .map((l) => ({ slug: l.slug, qty: clampQty(l.qty) }));
    }
  } catch {
    lines = EMPTY;
  }
  cache = { raw, lines };
  return lines;
}

function write(lines: QuoteSheetLine[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  } catch {
    /* storage unavailable: sheet lives for this page view only */
    cache = { raw: JSON.stringify(lines), lines };
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

export function clampQty(qty: number) {
  return Math.max(1, Math.min(99999, Math.floor(qty) || 1));
}

/** Sensible starting quantity for a corporate line: the MOQ, else 10. */
export function defaultQuoteQty(slug: string) {
  const product = getProductBySlug(slug);
  return product?.minOrderQuantity ?? 10;
}

type Ctx = {
  lines: QuoteSheetLine[];
  units: number;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  has: (slug: string) => boolean;
  add: (slug: string, qty?: number) => void;
  setQty: (slug: string, qty: number) => void;
  remove: (slug: string) => void;
  clear: () => void;
  quoteHref: string;
};

const QuoteSheetContext = createContext<Ctx | null>(null);

export function QuoteSheetProvider({ children }: { children: ReactNode }) {
  const lines = useSyncExternalStore(subscribe, read, () => EMPTY);
  const [isOpen, setIsOpen] = useState(false);

  const add = useCallback((slug: string, qty?: number) => {
    const current = read();
    if (current.some((l) => l.slug === slug)) return;
    write([...current, { slug, qty: clampQty(qty ?? defaultQuoteQty(slug)) }]);
  }, []);

  const setQty = useCallback((slug: string, qty: number) => {
    write(read().map((l) => (l.slug === slug ? { ...l, qty: clampQty(qty) } : l)));
  }, []);

  const remove = useCallback((slug: string) => {
    write(read().filter((l) => l.slug !== slug));
  }, []);

  const clear = useCallback(() => write([]), []);

  const value = useMemo<Ctx>(() => {
    const units = lines.reduce((sum, l) => sum + l.qty, 0);
    const quoteHref = lines.length
      ? `/bulk-quote?product=${lines.map((l) => `${l.slug}:${l.qty}`).join(",")}`
      : "/bulk-quote";
    return {
      lines,
      units,
      isOpen,
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
      has: (slug) => lines.some((l) => l.slug === slug),
      add,
      setQty,
      remove,
      clear,
      quoteHref,
    };
  }, [lines, isOpen, add, setQty, remove, clear]);

  return <QuoteSheetContext.Provider value={value}>{children}</QuoteSheetContext.Provider>;
}

export function useQuoteSheet() {
  const ctx = useContext(QuoteSheetContext);
  if (!ctx) throw new Error("useQuoteSheet must be used inside QuoteSheetProvider");
  return ctx;
}
