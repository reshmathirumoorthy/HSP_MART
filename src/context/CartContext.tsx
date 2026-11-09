"use client";

import { isPurchasable } from "@/lib/productAvailability";
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
import {
  CART_STORAGE_KEY,
  getCartCount,
  getCartLineKey,
  getCartSubtotal,
  getProductById,
  normalizeCustomization,
  resolveCartItems,
  sanitizeCartLines,
  writeCartToStorage,
  type CartLine,
  type ResolvedCartItem,
} from "@/lib/cart";
import type { CartCustomization } from "@/types/customization";

type CartContextValue = {
  items: CartLine[];
  resolvedItems: ResolvedCartItem[];
  cartCount: number;
  cartSubtotal: number;
  isCartOpen: boolean;
  hydrated: boolean;
  addToCart: (
    productId: string,
    quantity?: number,
    customization?: CartCustomization,
  ) => boolean;
  removeFromCart: (lineKey: string) => void;
  /** Restore a full cart line (undo). Prevents duplicate line keys. */
  restoreCartLine: (line: CartLine, index?: number) => boolean;
  updateQuantity: (lineKey: string, quantity: number) => void;
  increaseQuantity: (lineKey: string) => void;
  decreaseQuantity: (lineKey: string) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

const EMPTY_CART: CartLine[] = [];
const CART_CHANGE_EVENT = "hsp-mart-cart-change";

let cachedSerialized = "__unset__";
let cachedLines: CartLine[] = EMPTY_CART;

function emitCartChange() {
  window.dispatchEvent(new Event(CART_CHANGE_EVENT));
}

function subscribe(onStoreChange: () => void) {
  const handle = () => onStoreChange();
  window.addEventListener("storage", handle);
  window.addEventListener(CART_CHANGE_EVENT, handle);
  return () => {
    window.removeEventListener("storage", handle);
    window.removeEventListener(CART_CHANGE_EVENT, handle);
  };
}

function getServerSnapshot(): CartLine[] {
  return EMPTY_CART;
}

/** Always read storage — used by mutations and post-hydration snapshots. */
function readCartLines(): CartLine[] {
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    const serialized = raw ?? "[]";

    if (serialized === cachedSerialized) {
      return cachedLines;
    }

    const parsed = raw
      ? sanitizeCartLines(JSON.parse(raw) as unknown)
      : EMPTY_CART;
    cachedSerialized = serialized;
    cachedLines = parsed.length === 0 ? EMPTY_CART : parsed;
    return cachedLines;
  } catch {
    cachedSerialized = "[]";
    cachedLines = EMPTY_CART;
    return EMPTY_CART;
  }
}

function commitCart(next: CartLine[]) {
  const sanitized = sanitizeCartLines(next);
  writeCartToStorage(sanitized);
  cachedSerialized = JSON.stringify(sanitized);
  cachedLines = sanitized.length === 0 ? EMPTY_CART : sanitized;
  emitCartChange();
}

function matchesLineKey(line: CartLine, lineKey: string): boolean {
  return getCartLineKey(line) === lineKey;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const hydrated = useClientHydrated();
  const [isCartOpen, setIsCartOpen] = useState(false);

  const items = useSyncExternalStore(
    subscribe,
    () => (hydrated ? readCartLines() : EMPTY_CART),
    getServerSnapshot,
  );

  const addToCart = useCallback(
    (productId: string, quantity = 1, customization?: CartCustomization) => {
      const product = getProductById(productId);
      if (!product || !isPurchasable(product)) return false;

      const safeQty = Math.max(1, Math.min(999, Math.floor(quantity)));
      const normalized = normalizeCustomization(customization);
      const incoming: CartLine = normalized
        ? { productId, quantity: safeQty, customization: normalized }
        : { productId, quantity: safeQty };
      const incomingKey = getCartLineKey(incoming);
      const current = readCartLines();
      const existing = current.find((line) => matchesLineKey(line, incomingKey));

      if (!existing) {
        commitCart([...current, incoming]);
        return true;
      }

      commitCart(
        current.map((line) =>
          matchesLineKey(line, incomingKey)
            ? {
                ...line,
                quantity: Math.min(999, line.quantity + safeQty),
              }
            : line,
        ),
      );

      return true;
    },
    [],
  );

  const removeFromCart = useCallback((lineKey: string) => {
    commitCart(readCartLines().filter((line) => !matchesLineKey(line, lineKey)));
  }, []);

  const restoreCartLine = useCallback((line: CartLine, index?: number) => {
    const product = getProductById(line.productId);
    if (!product) return false;

    const safeQty = Math.max(1, Math.min(999, Math.floor(line.quantity) || 1));
    const normalized = normalizeCustomization(line.customization);
    const restored: CartLine = normalized
      ? { productId: line.productId, quantity: safeQty, customization: normalized }
      : { productId: line.productId, quantity: safeQty };
    const key = getCartLineKey(restored);
    const current = readCartLines();

    if (current.some((entry) => matchesLineKey(entry, key))) {
      return true;
    }

    const next = [...current];
    if (typeof index === "number" && index >= 0) {
      next.splice(Math.min(index, next.length), 0, restored);
    } else {
      next.push(restored);
    }
    commitCart(next);
    return true;
  }, []);

  const updateQuantity = useCallback((lineKey: string, quantity: number) => {
    if (!Number.isFinite(quantity)) return;

    const safeQty = Math.max(1, Math.min(999, Math.floor(quantity)));
    commitCart(
      readCartLines().map((line) =>
        matchesLineKey(line, lineKey)
          ? { ...line, quantity: safeQty }
          : line,
      ),
    );
  }, []);

  const increaseQuantity = useCallback((lineKey: string) => {
    commitCart(
      readCartLines().map((line) => {
        if (!matchesLineKey(line, lineKey)) return line;
        const product = getProductById(line.productId);
        const stockCap =
          typeof product?.stockQuantity === "number" &&
          Number.isFinite(product.stockQuantity) &&
          product.stockQuantity > 0
            ? Math.floor(product.stockQuantity)
            : 999;
        return {
          ...line,
          quantity: Math.min(stockCap, 999, line.quantity + 1),
        };
      }),
    );
  }, []);

  const decreaseQuantity = useCallback((lineKey: string) => {
    // Quantity controls never remove the line — use removeFromCart instead.
    commitCart(
      readCartLines().map((line) =>
        matchesLineKey(line, lineKey) && line.quantity > 1
          ? { ...line, quantity: line.quantity - 1 }
          : line,
      ),
    );
  }, []);

  const clearCart = useCallback(() => {
    commitCart([]);
  }, []);

  const openCart = useCallback(() => setIsCartOpen(true), []);
  const closeCart = useCallback(() => setIsCartOpen(false), []);
  const toggleCart = useCallback(() => setIsCartOpen((v) => !v), []);

  const value = useMemo<CartContextValue>(() => {
    const resolvedItems = resolveCartItems(items);
    return {
      items,
      resolvedItems,
      cartCount: getCartCount(items),
      cartSubtotal: getCartSubtotal(items),
      isCartOpen,
      hydrated,
      addToCart,
      removeFromCart,
      restoreCartLine,
      updateQuantity,
      increaseQuantity,
      decreaseQuantity,
      clearCart,
      openCart,
      closeCart,
      toggleCart,
    };
  }, [
    items,
    isCartOpen,
    hydrated,
    addToCart,
    removeFromCart,
    restoreCartLine,
    updateQuantity,
    increaseQuantity,
    decreaseQuantity,
    clearCart,
    openCart,
    closeCart,
    toggleCart,
  ]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }
  return context;
}
