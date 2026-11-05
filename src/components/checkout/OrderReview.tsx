"use client";

import { formatPrice } from "@/data/products";
import {
  paymentMethodLabel,
  type CheckoutData,
  type CheckoutStep,
} from "@/lib/checkout";
import type { ResolvedCartItem } from "@/lib/cart";
import {
  customizationDetails,
  formatCustomizationSummary,
} from "@/components/customization/customization.utils";
import styles from "./OrderReview.module.css";

type Props = {
  data: CheckoutData;
  items: ResolvedCartItem[];
  subtotal: number;
  shipping: number;
  total: number;
  onEdit: (step: CheckoutStep) => void;
};

export function OrderReview({
  data,
  items,
  subtotal,
  shipping: _shipping,
  total: _total,
  onEdit,
}: Props) {
  void _shipping;
  void _total;
  const { customer, address, paymentMethod } = data;

  return (
    <section id="checkout-review" className={styles.section} aria-labelledby="review-heading">
      <div className={styles.head}>
        <p className={styles.number}>04 · Review</p>
        <h2 id="review-heading" className={styles.title}>
          Review your order
        </h2>
      </div>

      <div className={styles.grid}>
        <div className={styles.card}>
          <div className={styles.cardTop}>
            <p className={styles.label}>Customer</p>
            <button
              type="button"
              className={styles.edit}
              onClick={() => onEdit("customer")}
            >
              Edit customer details
            </button>
          </div>
          <div className={styles.body}>
            <strong>{customer.fullName || "—"}</strong>
            <span>{customer.email || "—"}</span>
            <span>{customer.phone || "—"}</span>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardTop}>
            <p className={styles.label}>Delivery</p>
            <button
              type="button"
              className={styles.edit}
              onClick={() => onEdit("delivery")}
            >
              Edit delivery
            </button>
          </div>
          <div className={styles.body}>
            <strong>{address.line1 || "—"}</strong>
            {address.line2 ? <span>{address.line2}</span> : null}
            <span>
              {[address.city, address.state].filter(Boolean).join(", ") || "—"}
            </span>
            <span>{address.pincode || "—"}</span>
            <span>{address.country || "—"}</span>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardTop}>
            <p className={styles.label}>Payment</p>
            <button
              type="button"
              className={styles.edit}
              onClick={() => onEdit("payment")}
            >
              Edit payment
            </button>
          </div>
          <div className={styles.body}>
            <strong>
              {paymentMethod ? paymentMethodLabel(paymentMethod) : "—"}
            </strong>
            <span>No payment will be processed in this demo.</span>
          </div>
        </div>

        <div className={`${styles.card} ${styles.orderCard}`}>
          <p className={styles.label}>Order</p>
          <div className={styles.items}>
            {items.map((item) => {
              const customLabel = formatCustomizationSummary(item.customization);
              const details = customizationDetails(item.customization);
              return (
                <div key={item.lineKey} className={styles.item}>
                  <span>
                    {item.product.name} × {item.quantity}
                    {details.length > 0 ? (
                      <>
                        <br />
                        <small>{details.join(" · ")}</small>
                      </>
                    ) : customLabel ? (
                      <>
                        <br />
                        <small>Customization: {customLabel}</small>
                      </>
                    ) : null}
                  </span>
                  <span>{formatPrice(item.lineTotal)}</span>
                </div>
              );
            })}
          </div>
          <div className={styles.totals}>
            <div className={styles.row}>
              <span>Merchandise subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className={styles.row}>
              <span>Shipping</span>
              <span>Not calculated (demo)</span>
            </div>
            <div className={styles.row}>
              <span>Tax</span>
              <span>Not calculated (demo)</span>
            </div>
            <div className={`${styles.row} ${styles.total}`}>
              <span>Total</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
