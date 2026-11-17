"use client";

import Link from "next/link";
import { freeDeliveryText } from "@/lib/siteData";
import { formatPrice } from "@/data/products";
import { estimateOnlineTotals } from "@/lib/checkout";
import type { ResolvedCartItem } from "@/lib/cart";
import {
  customizationDetails,
  formatCustomizationSummary,
} from "@/components/customization/customization.utils";
import styles from "./CheckoutSummary.module.css";

type Props = {
  items: ResolvedCartItem[];
  subtotal: number;
  shipping: number;
  total: number;
  processing: boolean;
  placeDisabled: boolean;
  stockAlert?: string;
  hasCustomizable: boolean;
  formErrorSummaryId?: string;
  onPlaceOrder: () => void;
};

export function CheckoutSummary({
  items,
  subtotal,
  shipping: _shipping,
  total: _total,
  processing,
  placeDisabled,
  stockAlert,
  hasCustomizable,
  formErrorSummaryId,
  onPlaceOrder,
}: Props) {
  void _shipping;
  void _total;
  const est = estimateOnlineTotals(subtotal);
  return (
    <aside className={styles.summary} aria-label="Your order">
      <p className={styles.label}>Your order</p>

      <div className={styles.items}>
        {items.map((item) => {
          const customLabel = formatCustomizationSummary(item.customization);
          const details = customizationDetails(item.customization);
          return (
            <div key={item.lineKey} className={styles.item}>
              <div className={styles.itemTop}>
                <span className={styles.name}>{item.product.name}</span>
                <span className={styles.lineTotal}>
                  {formatPrice(item.lineTotal)}
                </span>
              </div>
              <p className={styles.meta}>
                Qty {item.quantity} · {formatPrice(item.product.price)} each
              </p>
              {details.length > 0 ? (
                <p className={styles.meta}>{details.join(" · ")}</p>
              ) : customLabel ? (
                <p className={styles.meta}>Customization: {customLabel}</p>
              ) : null}
              {item.unavailable ? (
                <p className={styles.unavailable}>Currently unavailable</p>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className={styles.rows}>
        <div className={styles.row}>
          <span>Merchandise subtotal</span>
          <span>{formatPrice(subtotal)}</span>
        </div>
        <div className={styles.row}>
          <span>Delivery</span>
          <span>{est.shipping ? formatPrice(est.shipping) : "Free"}</span>
        </div>
        <div className={styles.row}>
          <span>GST (est.)</span>
          <span>{formatPrice(est.gst)}</span>
        </div>
        <p className={styles.shippingNote}>
          {freeDeliveryText()}. The final amount is confirmed on the payment
          screen.
        </p>
        <div className={`${styles.row} ${styles.total}`}>
          <span>Total</span>
          <span>{formatPrice(est.total)}</span>
        </div>
      </div>

      {stockAlert ? (
        <p className={styles.alert} role="alert">
          {stockAlert}
        </p>
      ) : null}

      <button
        type="button"
        className={`btn btn--dark ${styles.place}`}
        onClick={onPlaceOrder}
        disabled={placeDisabled || processing}
        aria-describedby={formErrorSummaryId}
      >
        {processing ? "Placing order…" : "Place order & pay"}
      </button>

      <p className={styles.note}>
        You&apos;ll pay securely through Razorpay (UPI, cards, net banking).
        Sign-in is required so you can track your order.
      </p>

      <Link href="/cart" className={styles.back}>
        Back to cart
      </Link>

      {hasCustomizable ? (
        <div className={styles.customNote}>
          <p className={styles.customLabel}>Customization</p>
          <p>
            Variant and customization details shown above are the configuration
            saved in this cart.
          </p>
        </div>
      ) : null}

      <div className={styles.bulk}>
        <p className={styles.bulkLabel}>Buying in larger quantities?</p>
        <p>Need a bulk order or customized products?</p>
        <Link href="/bulk-quote" className={styles.bulkBtn}>
          Request a bulk quote
        </Link>
      </div>
    </aside>
  );
}
