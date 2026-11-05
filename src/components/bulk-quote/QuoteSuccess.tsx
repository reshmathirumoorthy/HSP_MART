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
        We&apos;ve captured your bulk requirement for this frontend
        demonstration.
      </p>

      <div className={styles.panel}>
        <p className={styles.refLabel}>Reference</p>
        <p className={styles.ref}>{quote.reference}</p>
        <p className={styles.disclaimer}>
          This is a frontend demonstration. This reference is not a confirmed
          price or an accepted offer. No email was sent and no order was
          created.
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
