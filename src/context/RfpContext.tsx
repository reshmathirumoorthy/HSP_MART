"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type RfpItem = {
  name: string;
  price: number;
  qty: number;
};

type RfpContextValue = {
  items: RfpItem[];
  isOpen: boolean;
  openRfp: () => void;
  closeRfp: () => void;
  toggleRfp: () => void;
  addItem: (item: RfpItem) => void;
  removeItem: (index: number) => void;
  clear: () => void;
};

const RfpContext = createContext<RfpContextValue | null>(null);

export function RfpProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<RfpItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const addItem = useCallback((item: RfpItem) => {
    setItems((prev) => [...prev, item]);
    setIsOpen(true);
  }, []);

  const removeItem = useCallback((index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  // Stable identities: RfpDrawer's focus effect depends on closeRfp, so these
  // must not change when `items` changes (otherwise focus jumps on every
  // item removal).
  const openRfp = useCallback(() => setIsOpen(true), []);
  const closeRfp = useCallback(() => setIsOpen(false), []);
  const toggleRfp = useCallback(() => setIsOpen((v) => !v), []);

  const value = useMemo(
    () => ({
      items,
      isOpen,
      openRfp,
      closeRfp,
      toggleRfp,
      addItem,
      removeItem,
      clear,
    }),
    [items, isOpen, openRfp, closeRfp, toggleRfp, addItem, removeItem, clear],
  );

  return <RfpContext.Provider value={value}>{children}</RfpContext.Provider>;
}

export function useRfp() {
  const ctx = useContext(RfpContext);
  if (!ctx) throw new Error("useRfp must be used within RfpProvider");
  return ctx;
}
