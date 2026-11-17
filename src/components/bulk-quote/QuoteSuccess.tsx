import Link from "next/link";
import type { DemoQuoteSnapshot } from "@/lib/bulkQuote";
import styles from "./QuoteSuccess.module.css";

type Props = {
  quote: DemoQuoteSnapshot;
};

export function QuoteSuccess({ quote }: Props) {
  return (
    <div className={styles.success} data-nav-surface="light">
      <div>
        <p className={styles.label}>Request received</p>
        <h1 className={styles.title}>Thank you.</h1>
      </div>

      <p className={styles.copy}>
        HSP has your bulk requirement. Our team will price it against approved suppliers and send a formal quotation,
        usually within one working day. A confirmation is on its way to {quote.customer.email}.
      </p>

      <div className={styles.panel}>
        <p className={styles.refLabel}>Reference</p>
        <p className={styles.ref} data-testid="bulk-quote-reference">{quote.reference}</p>
        <p className={styles.disclaimer}>
          This reference is not yet a price or an accepted offer. You can follow it under Account → Quotes when signed in with
          this email.
        </p>

        <div className={styles.summary}>
          {quote.lines.map((line) => (
            <div key={line.productId} className={styles.item}>
              <span>
                {line.name} × {line.quantity.toLocaleString("en-IN")}
                {line.hamperContents?.length
                  ? ` · Contents: ${line.hamperContents.length}`
                  : ""}
                {line.variantLabel ? ` · ${line.variantLabel}` : ""}
                {line.customizationType && line.customizationType !== "text"
                  ? ` · ${line.customizationType === "logo" ? "Logo" : "Image"}`
                  : ""}
                {line.customizationZoneLabel
                  ? ` · ${line.customizationZoneLabel}`
                  : ""}
                {line.customizationText
                  ? ` · “${line.customizationText}” · ${
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
            </div>
          ))}
          <div className={styles.item}>
            <span>Total units</span>
            <strong>{quote.totalUnits.toLocaleString("en-IN")}</strong>
          </div>
        </div>
      </div>

      <div className={styles.actions}>
        <Link href="/products" className="btn btn--dark">
          Continue shopping
        </Link>
        <Link href="/" className={styles.ghost}>
          Back to home
        </Link>
      </div>
    </div>
  );
}
