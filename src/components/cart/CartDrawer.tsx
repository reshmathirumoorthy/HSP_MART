"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { formatPrice } from "@/data/products";
import { useCart } from "@/context/CartContext";
import { CartItem } from "@/components/cart/CartItem";
import { CartEmptyState } from "@/components/cart/CartEmptyState";
import { validateResolvedCart } from "@/lib/cartValidation";
import { getFocusableElements, trapTabKey } from "@/lib/focusTrap";
import styles from "./CartDrawer.module.css";

/** Matches the storefront announcement: free delivery above ₹499. */
const FREE_DELIVERY_THRESHOLD = 499;

export function CartDrawer() {
  const pathname = usePathname();
  const {
    isCartOpen,
    closeCart,
    resolvedItems,
    cartSubtotal,
    cartCount,
    hydrated,
  } = useCart();
  const drawerRef = useRef<HTMLElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const visibleItems = hydrated ? resolvedItems : [];
  const visibleCount = hydrated ? cartCount : 0;
  const visibleSubtotal = hydrated ? cartSubtotal : 0;
  const canCheckout =
    hydrated && validateResolvedCart(visibleItems).canCheckout;
  const freeDelivery = visibleSubtotal >= FREE_DELIVERY_THRESHOLD;
  const deliveryProgress = Math.min(
    100,
    Math.round((visibleSubtotal / FREE_DELIVERY_THRESHOLD) * 100),
  );

  // Close on route change so the backdrop cannot block logo/nav.
  useEffect(() => {
    closeCart();
  }, [pathname, closeCart]);

  /* Keep the drawer pinned below the real header (announcement + navbar).
     Both are measured every time the drawer opens/resizes/scrolls — the
     drawer never relies on a hardcoded offset and never covers the header. */
  useEffect(() => {
    if (!isCartOpen) return;
    const update = () => {
      const banner = document.querySelector<HTMLElement>(
        '[aria-label="Store notices"]',
      );
      const navbar = document.querySelector<HTMLElement>(
        'header[role="banner"]',
      );
      const bottom = Math.max(
        banner?.getBoundingClientRect().bottom ?? 0,
        navbar?.getBoundingClientRect().bottom ?? 0,
      );
      const offset = Math.max(0, Math.ceil(bottom));
      rootRef.current?.style.setProperty("--site-header-h", `${offset}px`);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [isCartOpen]);

  useEffect(() => {
    if (!isCartOpen) return;

    returnFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const drawer = drawerRef.current;
    const focusable = drawer ? getFocusableElements(drawer) : [];
    const initial = focusable[0] ?? drawer;
    window.setTimeout(() => initial?.focus({ preventScroll: true }), 30);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeCart();
        return;
      }
      if (drawer) trapTabKey(event, drawer);
    };

    document.addEventListener("keydown", onKeyDown);
    // Lock the document itself, not <body>. Locking body re-parents the
    // sticky navbar into a non-scrollable clip container whose scrollTop is 0,
    // which flings the sticky header above the viewport. html stays the
    // scroller, keeps its scrollTop, and the sticky header stays pinned.
    const docEl = document.documentElement;
    const scrollbarWidth = window.innerWidth - docEl.clientWidth;
    const previousOverflow = docEl.style.overflow;
    const previousPaddingRight = docEl.style.paddingRight;
    docEl.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      docEl.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      docEl.style.overflow = previousOverflow;
      docEl.style.paddingRight = previousPaddingRight;
      returnFocusRef.current?.focus({ preventScroll: true });
    };
  }, [isCartOpen, closeCart]);

  return (
    <div
      ref={rootRef}
      className={`${styles.root} ${isCartOpen ? styles.open : ""}`}
      aria-hidden={!isCartOpen}
      {...(!isCartOpen ? { inert: true as const } : {})}
    >
      <button
        type="button"
        className={styles.backdrop}
        aria-label="Close cart"
        tabIndex={-1}
        onClick={closeCart}
      />

      <aside
        ref={drawerRef}
        className={styles.drawer}
        role="dialog"
        aria-modal={isCartOpen}
        aria-label="Your cart"
        tabIndex={-1}
      >
        <header className={styles.header}>
          <div className={styles.headerIdentity}>
            <span className={styles.headerIcon} aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                width="22"
                height="22"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 7h12l1.5 12.2a1.6 1.6 0 0 1-1.6 1.8H6.1a1.6 1.6 0 0 1-1.6-1.8L6 7Z" />
                <path d="M9 10.5V6.5a3 3 0 0 1 6 0v4" />
              </svg>
            </span>
            <div className={styles.headerText}>
              <h2 className={styles.title}>Your Cart</h2>
              <p className={styles.count} aria-live="polite">
                {visibleCount} {visibleCount === 1 ? "item" : "items"}
              </p>
            </div>
          </div>
          <button
            type="button"
            className={styles.close}
            aria-label="Close cart"
            onClick={closeCart}
          >
            <svg
              viewBox="0 0 24 24"
              width="19"
              height="19"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className={styles.content}>
          {visibleItems.length === 0 ? (
            <CartEmptyState onShop={closeCart} />
          ) : (
            <ul className={styles.list}>
              {visibleItems.map((item, index) => (
                <li key={item.lineKey}>
                  <CartItem item={item} compact lineIndex={index} />
                </li>
              ))}
            </ul>
          )}
        </div>

        {visibleItems.length > 0 ? (
          <footer className={styles.footer}>
            {freeDelivery ? (
              <p className={styles.shippingUnlocked} role="status">
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="m8.6 12.3 2.3 2.3 4.5-4.7" />
                </svg>
                Free delivery unlocked
              </p>
            ) : (
              <div className={styles.shippingProgress}>
                <p className={styles.shippingProgressCopy}>
                  <strong>{formatPrice(FREE_DELIVERY_THRESHOLD - visibleSubtotal)}</strong>{" "}
                  away from free delivery
                </p>
                <div className={styles.shippingTrack} aria-hidden="true">
                  <span style={{ width: `${deliveryProgress}%` }} />
                </div>
              </div>
            )}

            <dl className={styles.totals}>
              <div className={styles.totalRow}>
                <dt>Subtotal</dt>
                <dd>{formatPrice(visibleSubtotal)}</dd>
              </div>
              <div className={styles.totalRow}>
                <dt>Delivery</dt>
                <dd className={freeDelivery ? styles.freeValue : styles.mutedValue}>
                  {freeDelivery ? "Free" : "Calculated at checkout"}
                </dd>
              </div>
              <div className={`${styles.totalRow} ${styles.totalRowGrand}`}>
                <dt>Total</dt>
                <dd>{formatPrice(visibleSubtotal)}</dd>
              </div>
            </dl>

            {canCheckout ? (
              <Link
                href="/checkout"
                className={`btn btn--dark ${styles.checkoutBtn}`}
                onClick={closeCart}
                aria-label="Proceed to checkout"
              >
                Proceed to Checkout
                <svg
                  viewBox="0 0 24 24"
                  width="17"
                  height="17"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M5 12h14" />
                  <path d="m13 6 6 6-6 6" />
                </svg>
              </Link>
            ) : (
              <span className={styles.checkoutBlocked} role="status">
                Resolve unavailable items to checkout
              </span>
            )}
            <Link
              href="/products"
              className={styles.continue}
              onClick={closeCart}
            >
              Continue Shopping
            </Link>
          </footer>
        ) : null}
      </aside>
    </div>
  );
}
