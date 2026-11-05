"use client";

import { getProductById } from "@/lib/cart";
import {
  customerTypeLabel,
  orderTypeLabel,
  packagingLabel,
  type BulkQuoteData,
  type QuoteStep,
} from "@/lib/bulkQuote";
import styles from "./QuoteReview.module.css";

type Props = {
  data: BulkQuoteData;
  onEdit: (step: QuoteStep) => void;
};

export function QuoteReview({ data, onEdit }: Props) {
  const { lines, requirements, customer, address } = data;

  return (
    <section className={styles.section} aria-labelledby="quote-review-heading">
      <div className={styles.head}>
        <p className={styles.number}>04 · Review</p>
        <h2 id="quote-review-heading" className={styles.title}>
          Your bulk request
        </h2>
      </div>

      <div className={styles.grid}>
        <div className={`${styles.card} ${styles.wide}`}>
          <div className={styles.cardTop}>
            <p className={styles.label}>Products</p>
            <button
              type="button"
              className={styles.edit}
              onClick={() => onEdit("products")}
            >
              Edit products
            </button>
          </div>
          <div className={styles.body}>
            {lines.map((line) => {
              const product = getProductById(line.productId);
              if (!product) return null;
              return (
                <div key={line.productId} className={styles.item}>
                  <span>
                    {product.name} × {line.quantity}
                  </span>
                  {line.hamperContents?.length ? (
                    <span className={styles.note}>
                      Contents:{" "}
                      {line.hamperContents
                        .map((id) => getProductById(id)?.name ?? id)
                        .join(", ")}
                    </span>
                  ) : null}
                  {line.variantLabel ? (
                    <span className={styles.note}>Color: {line.variantLabel}</span>
                  ) : null}
                  {line.customizationType && line.customizationType !== "text" ? (
                    <span className={styles.note}>
                      Branding:{" "}
                      {line.customizationType === "logo"
                        ? "Company Logo"
                        : "Custom Image"}
                    </span>
                  ) : null}
                  {line.customizationZoneLabel ? (
                    <span className={styles.note}>
                      Surface: {line.customizationZoneLabel}
                    </span>
                  ) : null}
                  {line.customizationText?.trim() ? (
                    <span className={styles.note}>
                      Branding: “{line.customizationText.trim()}”
                      {" · "}
                      Direction:{" "}
                      {line.textOrientation === "vertical"
                        ? "↓ Vertical"
                        : line.textOrientation === "vertical-reverse"
                          ? "↑ Vertical Reverse"
                          : line.textOrientation === "horizontal-reverse"
                            ? "← Reverse"
                            : "→ Horizontal"}
                    </span>
                  ) : null}
                  {line.notes ? (
                    <span className={styles.note}>{line.notes}</span>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardTop}>
            <p className={styles.label}>Requirement</p>
            <button
              type="button"
              className={styles.edit}
              onClick={() => onEdit("requirements")}
            >
              Edit requirements
            </button>
          </div>
          <div className={styles.body}>
            <strong>
              {requirements.orderType
                ? orderTypeLabel(requirements.orderType)
                : "—"}
            </strong>
            <span>
              Customization:{" "}
              {requirements.customization === "yes" ? "Required" : "Not required"}
            </span>
            {requirements.customization === "yes" &&
            requirements.customizationNotes ? (
              <span>{requirements.customizationNotes}</span>
            ) : null}
            <span>Packaging: {packagingLabel(requirements.packaging)}</span>
            {requirements.branding === "yes" ? (
              <span>Branding: {requirements.brandName || "Yes"}</span>
            ) : (
              <span>Branding: No</span>
            )}
            {requirements.designFile ? (
              <span>Reference file: {requirements.designFile.name}</span>
            ) : null}
            {requirements.expectedDelivery ? (
              <span>Preferred delivery: {requirements.expectedDelivery}</span>
            ) : null}
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardTop}>
            <p className={styles.label}>Customer</p>
            <button
              type="button"
              className={styles.edit}
              onClick={() => onEdit("customer")}
            >
              Edit customer
            </button>
          </div>
          <div className={styles.body}>
            <strong>{customer.fullName || "—"}</strong>
            {customer.customerType ? (
              <span>{customerTypeLabel(customer.customerType)}</span>
            ) : null}
            {customer.organizationName ? (
              <span>{customer.organizationName}</span>
            ) : null}
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
              onClick={() => onEdit("customer")}
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
      </div>
    </section>
  );
}
