"use client";

import { useState } from "react";
import Link from "next/link";
import { formatPrice } from "@/data/products";
import { useCart } from "@/context/CartContext";
import styles from "./CartSummary.module.css";

type Props = {
  showCheckout?: boolean;
  showClear?: boolean;
  canCheckout?: boolean;
  checkoutBlockedReason?: string | null;
};

export function CartSummary({
  showCheckout = true,
  showClear = false,
  canCheckout = true,
  checkoutBlockedReason = null,
}: Props) {
  const { cartSubtotal, clearCart, cartCount } = useCart();
  const [confirmClear, setConfirmClear] = useState(false);
  const checkoutEnabled = cartCount > 0 && canCheckout;

  return (
    <aside className={styles.summary}>
      <p className={styles.label}>Order summary</p>

      <div className={styles.rows}>
        <div className={styles.row}>
          <span>Merchandise subtotal</span>
          <strong>{formatPrice(cartSubtotal)}</strong>
        </div>
        <div className={styles.rowMuted}>
          <span>Shipping</span>
          <span>Not calculated (demo)</span>
        </div>
        <div className={styles.rowMuted}>
          <span>Tax</span>
          <span>Not calculated (demo)</span>
        </div>
        <div className={`${styles.row} ${styles.totalRow}`}>
          <span>Total</span>
          <strong>{formatPrice(cartSubtotal)}</strong>
        </div>
      </div>

      <p className={styles.note}>
        Total equals the merchandise subtotal. Shipping and tax are not
        calculated in this demonstration.
      </p>

      {checkoutBlockedReason ? (
        <p className={styles.blocked} role="alert">
          {checkoutBlockedReason}
        </p>
      ) : null}

      {showCheckout ? (
        checkoutEnabled ? (
          <Link
            href="/checkout"
            className={`btn btn--dark ${styles.checkout}`}
            aria-label="Proceed to checkout"
          >
            Proceed to checkout
          </Link>
        ) : (
          <button
            type="button"
            className={`btn btn--dark ${styles.checkout}`}
            disabled
            aria-disabled="true"
            aria-label="Proceed to checkout unavailable"
          >
            Proceed to checkout
          </button>
        )
      ) : null}

      <Link href="/products" className={styles.continue}>
        Continue shopping
      </Link>

      <div className={styles.bulkBlock}>
        <p className={styles.bulkLabel}>Buying in bulk?</p>
        <p className={styles.bulkCopy}>
          Need a larger quantity or customization?
        </p>
        <Link href="/bulk-quote" className={styles.bulkLink}>
          Request a bulk quote
        </Link>
      </div>

      {showClear && cartCount > 0 ? (
        <div className={styles.clearBlock}>
          {!confirmClear ? (
            <button
              type="button"
              className={styles.clearTrigger}
              onClick={() => setConfirmClear(true)}
            >
              Clear cart
            </button>
          ) : (
            <div className={styles.confirm}>
              <p>Clear your cart?</p>
              <div className={styles.confirmActions}>
                <button type="button" onClick={() => setConfirmClear(false)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className={styles.confirmClear}
                  onClick={() => {
                    clearCart();
                    setConfirmClear(false);
                  }}
                >
                  Clear cart
                </button>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </aside>
  );
}
