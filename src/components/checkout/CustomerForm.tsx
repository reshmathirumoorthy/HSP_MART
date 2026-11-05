"use client";

import type { CustomerDetails, CheckoutFieldErrors } from "@/lib/checkout";
import styles from "./checkout-forms.module.css";

type Props = {
  value: CustomerDetails;
  errors: CheckoutFieldErrors;
  onChange: (next: CustomerDetails) => void;
};

export function CustomerForm({ value, errors, onChange }: Props) {
  return (
    <section id="checkout-customer" className={styles.section} aria-labelledby="customer-heading">
      <div className={styles.sectionHead}>
        <p className={styles.sectionNumber}>01 · Customer details</p>
        <h2 id="customer-heading" className={styles.sectionTitle}>
          Customer details
        </h2>
        <p className={styles.sectionCopy}>
          Guest checkout — no account required.
        </p>
      </div>

      <div className={styles.grid}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="checkout-full-name">
            Full name
          </label>
          <input
            id="checkout-full-name"
            name="fullName"
            type="text"
            autoComplete="name"
            placeholder="Your full name"
            className={`${styles.input} ${errors.fullName ? styles.inputError : ""}`}
            value={value.fullName}
            onChange={(event) =>
              onChange({ ...value, fullName: event.target.value })
            }
            aria-invalid={Boolean(errors.fullName)}
            aria-describedby={errors.fullName ? "full-name-error" : undefined}
          />
          {errors.fullName ? (
            <p id="full-name-error" className={styles.error} role="alert">
              {errors.fullName}
            </p>
          ) : null}
        </div>

        <div className={styles.gridTwo}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="checkout-email">
              Email address
            </label>
            <input
              id="checkout-email"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="you@example.com"
              className={`${styles.input} ${errors.email ? styles.inputError : ""}`}
              value={value.email}
              onChange={(event) =>
                onChange({ ...value, email: event.target.value })
              }
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "email-error" : undefined}
            />
            {errors.email ? (
              <p id="email-error" className={styles.error} role="alert">
                {errors.email}
              </p>
            ) : null}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="checkout-phone">
              Phone number
            </label>
            <input
              id="checkout-phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              placeholder="+91 XXXXX XXXXX"
              className={`${styles.input} ${errors.phone ? styles.inputError : ""}`}
              value={value.phone}
              onChange={(event) =>
                onChange({ ...value, phone: event.target.value })
              }
              aria-invalid={Boolean(errors.phone)}
              aria-describedby={errors.phone ? "phone-error" : undefined}
            />
            {errors.phone ? (
              <p id="phone-error" className={styles.error} role="alert">
                {errors.phone}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
