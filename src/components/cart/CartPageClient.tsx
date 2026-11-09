"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { formatPrice } from "@/data/products";
import { useCart } from "@/context/CartContext";
import { CartItem } from "@/components/cart/CartItem";
import { CartSummary } from "@/components/cart/CartSummary";
import { CartEmptyState } from "@/components/cart/CartEmptyState";
import { SavedVariants } from "@/components/cart/SavedVariants";
import type { CartLine } from "@/lib/cart";
import { validateResolvedCart } from "@/lib/cartValidation";
import styles from "./CartPageClient.module.css";

const TOAST_MS = 5000;

type PendingUndo = {
  line: CartLine;
  index: number;
  productName: string;
};

type Notice = {
  kind: "undo" | "saved";
  message: string;
  undo?: PendingUndo;
};

export function CartPageClient() {
  const {
    resolvedItems,
    cartCount,
    cartSubtotal,
    hydrated,
    restoreCartLine,
  } = useCart();
  const [notice, setNotice] = useState<Notice | null>(null);
  const timerRef = useRef<number | null>(null);

  const validation = useMemo(
    () => validateResolvedCart(resolvedItems),
    [resolvedItems],
  );

  const unavailableCount = validation.issues.filter(
    (issue) => issue.code === "unavailable",
  ).length;

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const showNotice = useCallback(
    (next: Notice) => {
      clearTimer();
      setNotice(next);
      timerRef.current = window.setTimeout(() => {
        setNotice(null);
        timerRef.current = null;
      }, TOAST_MS);
    },
    [clearTimer],
  );

  useEffect(() => () => clearTimer(), [clearTimer]);

  const checkoutBlockedReason =
    unavailableCount > 0
      ? unavailableCount === 1
        ? "Remove or resolve the unavailable item before checkout."
        : "Remove or resolve unavailable items before checkout."
      : null;

  return (
    <div className={styles.page} data-nav-surface="light">
      <div className={`shell ${styles.inner}`}>
        <header className={styles.header}>
          <h1 className={styles.title}>Your cart</h1>
          <p className={styles.count}>
            {hydrated
              ? `${cartCount} ${cartCount === 1 ? "item" : "items"}`
              : "Loading cart…"}
          </p>
        </header>

        {!hydrated ? null : resolvedItems.length === 0 ? (
          <>
            <CartEmptyState />
            <SavedVariants />
          </>
        ) : (
          <>
            {unavailableCount > 0 ? (
              <div className={styles.banner} role="alert">
                {unavailableCount === 1
                  ? "1 product in your cart is currently unavailable."
                  : `${unavailableCount} products in your cart are currently unavailable.`}{" "}
                Checkout stays disabled until those items are removed.
              </div>
            ) : null}

            <div className={styles.layout}>
              <section className={styles.items} aria-label="Cart items">
                <ul>
                  {resolvedItems.map((item, index) => (
                    <li key={item.lineKey}>
                      <CartItem
                        item={item}
                        lineIndex={index}
                        onRemoved={(line, previousIndex, productName) => {
                          showNotice({
                            kind: "undo",
                            message: `Removed ${productName} from cart.`,
                            undo: { line, index: previousIndex, productName },
                          });
                        }}
                        onSavedForLater={(productName) => {
                          showNotice({
                            kind: "saved",
                            message: `Saved ${productName} for later. Find it in your wishlist.`,
                          });
                        }}
                      />
                    </li>
                  ))}
                </ul>
              </section>

              <div className={styles.summaryCol}>
                <CartSummary
                  showCheckout
                  showClear
                  canCheckout={validation.canCheckout}
                  checkoutBlockedReason={checkoutBlockedReason}
                />
              </div>
            </div>

            <SavedVariants />

            <div className={styles.mobileBar} data-sticky-purchase>
              <div className={styles.mobileBarMeta}>
                <span>Merchandise subtotal</span>
                <strong>{formatPrice(cartSubtotal)}</strong>
                {!validation.canCheckout && checkoutBlockedReason ? (
                  <p
                    id="cart-mobile-blocked"
                    className={styles.mobileBlocked}
                    role="status"
                  >
                    {checkoutBlockedReason}
                  </p>
                ) : null}
              </div>
              {validation.canCheckout ? (
                <Link
                  href="/checkout"
                  className={`btn btn--dark ${styles.mobileCheckout}`}
                  aria-label="Proceed to checkout"
                >
                  Checkout
                </Link>
              ) : (
                <button
                  type="button"
                  className={`btn btn--dark ${styles.mobileCheckout}`}
                  disabled
                  aria-disabled="true"
                  aria-describedby={
                    checkoutBlockedReason ? "cart-mobile-blocked" : undefined
                  }
                >
                  Checkout
                </button>
              )}
            </div>
          </>
        )}

        {notice ? (
          <div className={styles.toast} role="status">
            <p>{notice.message}</p>
            <div className={styles.toastActions}>
              {notice.undo ? (
                <button
                  type="button"
                  className={styles.toastBtn}
                  onClick={() => {
                    restoreCartLine(notice.undo!.line, notice.undo!.index);
                    clearTimer();
                    setNotice(null);
                  }}
                >
                  Undo
                </button>
              ) : null}
              {notice.kind === "saved" ? (
                <Link href="/wishlist" className={styles.toastBtn}>
                  View wishlist
                </Link>
              ) : null}
              <button
                type="button"
                className={styles.toastBtn}
                onClick={() => {
                  clearTimer();
                  setNotice(null);
                }}
              >
                Dismiss
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
