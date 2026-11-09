"use client";

import { INDIAN_STATES } from "@/lib/checkout";
import {
  CUSTOMER_TYPE_OPTIONS,
  needsOrganization,
  type BulkQuoteFieldErrors,
  type CustomerType,
  type QuoteCustomer,
} from "@/lib/bulkQuote";
import type { DeliveryAddress } from "@/lib/checkout";
import formStyles from "@/components/checkout/checkout-forms.module.css";
import styles from "./QuoteRequirements.module.css";

type Props = {
  customer: QuoteCustomer;
  address: DeliveryAddress;
  errors: BulkQuoteFieldErrors;
  onCustomerChange: (next: QuoteCustomer) => void;
  onAddressChange: (next: DeliveryAddress) => void;
};

export function QuoteCustomerForm({
  customer,
  address,
  errors,
  onCustomerChange,
  onAddressChange,
}: Props) {
  const showOrg = needsOrganization(customer.customerType);

  return (
    <section className={styles.section} aria-labelledby="quote-customer-heading">
      <div className={styles.head}>
        <h2 id="quote-customer-heading" className={styles.title}>
          Customer & delivery
        </h2>
        <p className={styles.copy}>
          Tell us who to contact and where the order may need to go.
        </p>
      </div>

      <div className={styles.block}>
        <p className={styles.blockLabel} id="customer-type-label">
          I am ordering as
        </p>
        <div
          className={styles.options}
          role="radiogroup"
          aria-labelledby="customer-type-label"
        >
          {CUSTOMER_TYPE_OPTIONS.map((option) => {
            const selected = customer.customerType === option.id;
            return (
              <label
                key={option.id}
                className={`${styles.option} ${selected ? styles.optionSelected : ""}`}
              >
                <input
                  type="radio"
                  name="customerType"
                  value={option.id}
                  checked={selected}
                  onChange={() =>
                    onCustomerChange({
                      ...customer,
                      customerType: option.id as CustomerType,
                    })
                  }
                />
                <span>{option.label}</span>
              </label>
            );
          })}
        </div>
        {errors.customerType ? (
          <p className={styles.error} role="alert">
            {errors.customerType}
          </p>
        ) : null}
      </div>

      <div className={formStyles.grid}>
        <div className={formStyles.field}>
          <label className={formStyles.label} htmlFor="quote-full-name">
            Full name
          </label>
          <input
            id="quote-full-name"
            name="fullName"
            type="text"
            autoComplete="name"
            className={`${formStyles.input} ${errors.fullName ? formStyles.inputError : ""}`}
            value={customer.fullName}
            onChange={(event) =>
              onCustomerChange({ ...customer, fullName: event.target.value })
            }
            aria-invalid={Boolean(errors.fullName)}
            aria-describedby={errors.fullName ? "quote-full-name-error" : undefined}
          />
          {errors.fullName ? (
            <p id="quote-full-name-error" className={formStyles.error} role="alert">
              {errors.fullName}
            </p>
          ) : null}
        </div>

        <div className={formStyles.gridTwo}>
          <div className={formStyles.field}>
            <label className={formStyles.label} htmlFor="quote-email">
              Email address
            </label>
            <input
              id="quote-email"
              name="email"
              type="email"
              autoComplete="email"
              className={`${formStyles.input} ${errors.email ? formStyles.inputError : ""}`}
              value={customer.email}
              onChange={(event) =>
                onCustomerChange({ ...customer, email: event.target.value })
              }
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "quote-email-error" : undefined}
            />
            {errors.email ? (
              <p id="quote-email-error" className={formStyles.error} role="alert">
                {errors.email}
              </p>
            ) : null}
          </div>

          <div className={formStyles.field}>
            <label className={formStyles.label} htmlFor="quote-phone">
              Phone number
            </label>
            <input
              id="quote-phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              className={`${formStyles.input} ${errors.phone ? formStyles.inputError : ""}`}
              value={customer.phone}
              onChange={(event) =>
                onCustomerChange({ ...customer, phone: event.target.value })
              }
              aria-invalid={Boolean(errors.phone)}
              aria-describedby={errors.phone ? "quote-phone-error" : undefined}
            />
            {errors.phone ? (
              <p id="quote-phone-error" className={formStyles.error} role="alert">
                {errors.phone}
              </p>
            ) : null}
          </div>
        </div>

        {showOrg ? (
          <>
            <div className={formStyles.field}>
              <label className={formStyles.label} htmlFor="quote-org">
                Organization name
              </label>
              <input
                id="quote-org"
                name="organization"
                type="text"
                autoComplete="organization"
                className={`${formStyles.input} ${errors.organizationName ? formStyles.inputError : ""}`}
                value={customer.organizationName}
                onChange={(event) =>
                  onCustomerChange({
                    ...customer,
                    organizationName: event.target.value,
                  })
                }
                aria-invalid={Boolean(errors.organizationName)}
                aria-describedby={
                  errors.organizationName ? "quote-org-error" : undefined
                }
              />
              {errors.organizationName ? (
                <p id="quote-org-error" className={formStyles.error} role="alert">
                  {errors.organizationName}
                </p>
              ) : null}
            </div>
            <div className={formStyles.field}>
              <label className={formStyles.label} htmlFor="quote-gstin">
                GSTIN{" "}
                <span className={formStyles.optional}>(optional)</span>
              </label>
              <input
                id="quote-gstin"
                name="gstin"
                type="text"
                className={formStyles.input}
                value={customer.gstin}
                onChange={(event) =>
                  onCustomerChange({ ...customer, gstin: event.target.value })
                }
              />
            </div>
          </>
        ) : null}
      </div>

      <div className={styles.block}>
        <p className={styles.blockLabel}>Delivery location</p>
        <div className={formStyles.grid}>
          <div className={formStyles.field}>
            <label className={formStyles.label} htmlFor="quote-line1">
              Address line 1
            </label>
            <input
              id="quote-line1"
              name="addressLine1"
              type="text"
              autoComplete="address-line1"
              className={`${formStyles.input} ${errors.line1 ? formStyles.inputError : ""}`}
              value={address.line1}
              onChange={(event) =>
                onAddressChange({ ...address, line1: event.target.value })
              }
              aria-invalid={Boolean(errors.line1)}
            />
            {errors.line1 ? (
              <p className={formStyles.error} role="alert">
                {errors.line1}
              </p>
            ) : null}
          </div>

          <div className={formStyles.field}>
            <label className={formStyles.label} htmlFor="quote-line2">
              Address line 2{" "}
              <span className={formStyles.optional}>(optional)</span>
            </label>
            <input
              id="quote-line2"
              name="addressLine2"
              type="text"
              autoComplete="address-line2"
              className={formStyles.input}
              value={address.line2}
              onChange={(event) =>
                onAddressChange({ ...address, line2: event.target.value })
              }
            />
          </div>

          <div className={formStyles.gridTwo}>
            <div className={formStyles.field}>
              <label className={formStyles.label} htmlFor="quote-city">
                City
              </label>
              <input
                id="quote-city"
                name="city"
                type="text"
                autoComplete="address-level2"
                className={`${formStyles.input} ${errors.city ? formStyles.inputError : ""}`}
                value={address.city}
                onChange={(event) =>
                  onAddressChange({ ...address, city: event.target.value })
                }
                aria-invalid={Boolean(errors.city)}
              />
              {errors.city ? (
                <p className={formStyles.error} role="alert">
                  {errors.city}
                </p>
              ) : null}
            </div>

            <div className={formStyles.field}>
              <label className={formStyles.label} htmlFor="quote-state">
                State
              </label>
              <select
                id="quote-state"
                name="state"
                autoComplete="address-level1"
                className={`${formStyles.select} ${errors.state ? formStyles.selectError : ""}`}
                value={address.state}
                onChange={(event) =>
                  onAddressChange({ ...address, state: event.target.value })
                }
                aria-invalid={Boolean(errors.state)}
              >
                <option value="">Select state</option>
                {INDIAN_STATES.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
              {errors.state ? (
                <p className={formStyles.error} role="alert">
                  {errors.state}
                </p>
              ) : null}
            </div>
          </div>

          <div className={formStyles.gridTwo}>
            <div className={formStyles.field}>
              <label className={formStyles.label} htmlFor="quote-pincode">
                Pincode
              </label>
              <input
                id="quote-pincode"
                name="postalCode"
                type="text"
                inputMode="numeric"
                autoComplete="postal-code"
                maxLength={6}
                className={`${formStyles.input} ${errors.pincode ? formStyles.inputError : ""}`}
                value={address.pincode}
                onChange={(event) =>
                  onAddressChange({
                    ...address,
                    pincode: event.target.value.replace(/\D/g, "").slice(0, 6),
                  })
                }
                aria-invalid={Boolean(errors.pincode)}
              />
              {errors.pincode ? (
                <p className={formStyles.error} role="alert">
                  {errors.pincode}
                </p>
              ) : null}
            </div>

            <div className={formStyles.field}>
              <label className={formStyles.label} htmlFor="quote-country">
                Country
              </label>
              <input
                id="quote-country"
                name="country"
                type="text"
                autoComplete="country-name"
                className={`${formStyles.input} ${errors.country ? formStyles.inputError : ""}`}
                value={address.country}
                onChange={(event) =>
                  onAddressChange({ ...address, country: event.target.value })
                }
                aria-invalid={Boolean(errors.country)}
              />
              {errors.country ? (
                <p className={formStyles.error} role="alert">
                  {errors.country}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
