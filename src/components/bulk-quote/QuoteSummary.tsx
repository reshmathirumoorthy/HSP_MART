"use client";

import { getProductById } from "@/lib/cart";
import {
  getTotalUnits,
  type BulkQuoteData,
  type QuoteStep,
} from "@/lib/bulkQuote";
import styles from "./QuoteSummary.module.css";

type Props = {
  data: BulkQuoteData;
  step: QuoteStep;
  processing: boolean;
  onContinue: () => void;
  onSubmit: () => void;
};

export function QuoteSummary({
  data,
  step,
  processing,
  onContinue,
  onSubmit,
}: Props) {
  const totalUnits = getTotalUnits(data.lines);
  const location = [data.address.city, data.address.state]
    .filter(Boolean)
    .join(", ");

  const ctaLabel =
    step === "review"
      ? processing
        ? "Submitting request..."
        : "Submit quote request"
      : step === "customer"
        ? "Review request"
        : "Continue";

  return (
    <aside className={styles.summary} aria-label="Request summary">
      <p className={styles.label}>Request summary</p>

      <div className={styles.products}>
        {data.lines.length === 0 ? (
          <p className={styles.empty}>No products selected yet.</p>
        ) : (
          data.lines.map((line) => {
            const product = getProductById(line.productId);
            if (!product) return null;
            return (
              <div key={line.productId} className={styles.product}>
                <span>
                  {product.name}
                  {line.hamperContents?.length
                    ? ` · ${line.hamperContents.length} items`
                    : ""}
                  {line.variantLabel ? ` · ${line.variantLabel}` : ""}
                  {line.customizationType && line.customizationType !== "text"
                    ? ` · ${line.customizationType === "logo" ? "Logo" : "Image"}`
                    : ""}
                  {line.customizationZoneLabel
                    ? ` · ${line.customizationZoneLabel}`
                    : ""}
                  {line.customizationText?.trim()
                    ? ` · “${line.customizationText.trim()}” · ${
                        line.textOrientation === "vertical"
                          ? "↓ Vertical"
                          : line.textOrientation === "vertical-reverse"
                            ? "↑ Vertical Reverse"
                            : line.textOrientation === "horizontal-reverse"
                              ? "← Reverse"
                              : "→ Horizontal"
                      }`
                    : ""}
                </span>
                <span>{line.quantity.toLocaleString("en-IN")} units</span>
              </div>
            );
          })
        )}
      </div>

      <div className={styles.rows}>
        <div className={styles.row}>
          <span>Total products</span>
          <strong>{data.lines.length}</strong>
        </div>
        <div className={styles.row}>
          <span>Total units</span>
          <strong>{totalUnits.toLocaleString("en-IN")}</strong>
        </div>
        <div className={styles.row}>
          <span>Customization</span>
          <strong>
            {data.requirements.customization === "yes" ? "Yes" : "No"}
          </strong>
        </div>
        <div className={styles.row}>
          <span>Delivery location</span>
          <strong>{location || "—"}</strong>
        </div>
      </div>

      <p className={styles.note}>
        This captures your requirement only. No bulk pricing or quotation is
        generated here.
      </p>

      <button
        type="button"
        className={`btn btn--dark ${styles.cta}`}
        onClick={step === "review" ? onSubmit : onContinue}
        disabled={processing}
      >
        {ctaLabel}
      </button>
    </aside>
  );
}
