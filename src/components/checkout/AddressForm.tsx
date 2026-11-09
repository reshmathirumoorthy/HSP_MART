"use client";

import type { ReactNode } from "react";
import {
  INDIAN_STATES,
  type DeliveryAddress,
  type CheckoutFieldErrors,
} from "@/lib/checkout";
import styles from "./checkout-forms.module.css";

type Props = {
  value: DeliveryAddress;
  errors: CheckoutFieldErrors;
  onChange: (next: DeliveryAddress) => void;
  beforeFields?: ReactNode;
};

export function AddressForm({
  value,
  errors,
  onChange,
  beforeFields,
}: Props) {
  return (
    <section id="checkout-delivery" className={styles.section} aria-labelledby="delivery-heading">
      <div className={styles.sectionHead}>
        <h2 id="delivery-heading" className={styles.sectionTitle}>
          Delivery address
        </h2>
        <p className={styles.sectionCopy}>
          Where should we send your order?
        </p>
      </div>

      {beforeFields}

      <div className={styles.grid}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="checkout-line1">
            Address line 1
          </label>
          <input
            id="checkout-line1"
            name="addressLine1"
            type="text"
            autoComplete="address-line1"
            placeholder="House / flat / street"
            className={`${styles.input} ${errors.line1 ? styles.inputError : ""}`}
            value={value.line1}
            onChange={(event) =>
              onChange({ ...value, line1: event.target.value })
            }
            aria-invalid={Boolean(errors.line1)}
            aria-describedby={errors.line1 ? "line1-error" : undefined}
          />
          {errors.line1 ? (
            <p id="line1-error" className={styles.error} role="alert">
              {errors.line1}
            </p>
          ) : null}
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="checkout-line2">
            Address line 2{" "}
            <span className={styles.optional}>(optional)</span>
          </label>
          <input
            id="checkout-line2"
            name="addressLine2"
            type="text"
            autoComplete="address-line2"
            placeholder="Landmark, area"
            className={styles.input}
            value={value.line2}
            onChange={(event) =>
              onChange({ ...value, line2: event.target.value })
            }
          />
        </div>

        <div className={styles.gridTwo}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="checkout-city">
              City
            </label>
            <input
              id="checkout-city"
              name="city"
              type="text"
              autoComplete="address-level2"
              placeholder="City"
              className={`${styles.input} ${errors.city ? styles.inputError : ""}`}
              value={value.city}
              onChange={(event) =>
                onChange({ ...value, city: event.target.value })
              }
              aria-invalid={Boolean(errors.city)}
              aria-describedby={errors.city ? "city-error" : undefined}
            />
            {errors.city ? (
              <p id="city-error" className={styles.error} role="alert">
                {errors.city}
              </p>
            ) : null}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="checkout-state">
              State
            </label>
            <select
              id="checkout-state"
              name="state"
              autoComplete="address-level1"
              className={`${styles.select} ${errors.state ? styles.selectError : ""}`}
              value={value.state}
              onChange={(event) =>
                onChange({ ...value, state: event.target.value })
              }
              aria-invalid={Boolean(errors.state)}
              aria-describedby={errors.state ? "state-error" : undefined}
            >
              <option value="">Select state</option>
              {INDIAN_STATES.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
            {errors.state ? (
              <p id="state-error" className={styles.error} role="alert">
                {errors.state}
              </p>
            ) : null}
          </div>
        </div>

        <div className={styles.gridTwo}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="checkout-pincode">
              Pincode
            </label>
            <input
              id="checkout-pincode"
              name="postalCode"
              type="text"
              inputMode="numeric"
              autoComplete="postal-code"
              placeholder="6-digit pincode"
              maxLength={6}
              className={`${styles.input} ${errors.pincode ? styles.inputError : ""}`}
              value={value.pincode}
              onChange={(event) =>
                onChange({
                  ...value,
                  pincode: event.target.value.replace(/\D/g, "").slice(0, 6),
                })
              }
              aria-invalid={Boolean(errors.pincode)}
              aria-describedby={errors.pincode ? "pincode-error" : undefined}
            />
            {errors.pincode ? (
              <p id="pincode-error" className={styles.error} role="alert">
                {errors.pincode}
              </p>
            ) : null}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="checkout-country">
              Country
            </label>
            <input
              id="checkout-country"
              name="country"
              type="text"
              autoComplete="country-name"
              className={`${styles.input} ${errors.country ? styles.inputError : ""}`}
              value={value.country}
              onChange={(event) =>
                onChange({ ...value, country: event.target.value })
              }
              aria-invalid={Boolean(errors.country)}
              aria-describedby={errors.country ? "country-error" : undefined}
            />
            {errors.country ? (
              <p id="country-error" className={styles.error} role="alert">
                {errors.country}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
