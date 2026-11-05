"use client";

import {
  PAYMENT_OPTIONS,
  type PaymentMethod as PaymentMethodId,
} from "@/lib/checkout";
import styles from "./checkout-forms.module.css";

type Props = {
  value: PaymentMethodId | null;
  error?: string;
  onChange: (next: PaymentMethodId) => void;
};

export function PaymentMethod({ value, error, onChange }: Props) {
  return (
    <section id="checkout-payment" className={styles.section} aria-labelledby="payment-heading">
      <div className={styles.sectionHead}>
        <p className={styles.sectionNumber}>03 · Payment</p>
        <h2 id="payment-heading" className={styles.sectionTitle}>
          Payment method
        </h2>
        <p className={styles.sectionCopy}>
          Selection only for this demonstration — no payment is processed.
        </p>
      </div>

      <div
        className={styles.options}
        role="radiogroup"
        aria-labelledby="payment-heading"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? "payment-error" : undefined}
      >
        {PAYMENT_OPTIONS.map((option) => {
          const selected = value === option.id;
          return (
            <label
              key={option.id}
              className={`${styles.option} ${selected ? styles.optionSelected : ""}`}
            >
              <input
                type="radio"
                name="paymentMethod"
                value={option.id}
                checked={selected}
                onChange={() => onChange(option.id)}
              />
              <span>
                <span className={styles.optionLabel}>{option.label}</span>
                <span className={styles.optionDesc}>{option.description}</span>
              </span>
            </label>
          );
        })}
      </div>

      {error ? (
        <p id="payment-error" className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}