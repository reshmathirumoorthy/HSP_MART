import Link from "next/link";
import { ProductVisual } from "@/components/ProductVisual";
import { getProductById } from "@/lib/cart";
import {
  orderTypeLabel,
  packagingLabel,
} from "@/lib/bulkQuote";
import {
  QUOTE_TIMELINE,
  formatAccountDate,
  quoteStatusLabel,
  type QuoteRequest,
} from "@/data/account";
import { StatusBadge } from "@/components/account/StatusBadge";
import { StatusTimeline } from "@/components/account/StatusTimeline";
import styles from "./account.module.css";

type Props = {
  quote: QuoteRequest;
};

export function QuoteDetailView({ quote }: Props) {
  const similarHref = `/bulk-quote?${quote.items
    .map((item) => `product=${encodeURIComponent(item.productSlug)}`)
    .join("&")}`;

  return (
    <div className={styles.content}>
      <div className={styles.cardTop}>
        <div>
          <p className={styles.label}>Bulk request</p>
          <h2 className={styles.cardRef}>{quote.reference}</h2>
          <p className={styles.meta}>
            Submitted {formatAccountDate(quote.submittedAt)}
          </p>
        </div>
        <StatusBadge label={quoteStatusLabel(quote.status)} />
      </div>

      <div className={styles.detailGrid}>
        <section className={styles.panel} aria-labelledby="quote-items-heading">
          <h3 id="quote-items-heading" className={styles.panelTitle}>
            Products
          </h3>
          <div>
            {quote.items.map((item) => {
              const product = getProductById(item.productId);
              return (
                <div key={item.productId} className={styles.itemRow}>
                  <div className={styles.visual}>
                    {product ? (
                      <ProductVisual
                        product={product}
                        variant="compact"
                        sizes="72px"
                      />
                    ) : null}
                  </div>
                  <div className={styles.itemMeta}>
                    <Link
                      href={`/products/${item.productSlug}`}
                      className={styles.itemName}
                    >
                      {item.productName}
                    </Link>
                    <p className={styles.itemSub}>
                      Qty {item.quantity.toLocaleString("en-IN")}
                      {item.notes ? ` · ${item.notes}` : ""}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className={styles.totals}>
            <div className={styles.totalRow}>
              <span>Total units</span>
              <strong>{quote.totalUnits.toLocaleString("en-IN")}</strong>
            </div>
            <div className={styles.totalRow}>
              <span>Price</span>
              <strong>Awaiting quotation</strong>
            </div>
          </div>
        </section>

        <div className={styles.content}>
          <section className={styles.panel} aria-labelledby="quote-timeline-heading">
            <h3 id="quote-timeline-heading" className={styles.panelTitle}>
              Request progress
            </h3>
            <StatusTimeline
              steps={QUOTE_TIMELINE}
              currentId={quote.timelineStep}
              labelledBy="quote-timeline-heading"
            />
            <p className={styles.note}>
              Demo timeline only — no live quotation has been generated.
            </p>
          </section>

          <section className={styles.panel} aria-labelledby="quote-req-heading">
            <h3 id="quote-req-heading" className={styles.panelTitle}>
              Requirements
            </h3>
            <div className={styles.cardMeta}>
              <span>{orderTypeLabel(quote.orderType)}</span>
              <span>
                Customization:{" "}
                {quote.customization === "yes" ? "Required" : "Not required"}
              </span>
              {quote.customizationNotes ? (
                <span>{quote.customizationNotes}</span>
              ) : null}
              <span>Packaging: {packagingLabel(quote.packaging)}</span>
              <span>
                Branding:{" "}
                {quote.branding === "yes"
                  ? quote.brandName || "Yes"
                  : "No"}
              </span>
              {quote.designFileName ? (
                <span>Reference file: {quote.designFileName}</span>
              ) : null}
              {quote.expectedDelivery ? (
                <span>
                  Preferred delivery: {formatAccountDate(quote.expectedDelivery)}
                </span>
              ) : null}
              {quote.additionalNotes ? (
                <span>{quote.additionalNotes}</span>
              ) : null}
            </div>
          </section>

          <section className={styles.panel} aria-labelledby="quote-customer-heading">
            <h3 id="quote-customer-heading" className={styles.panelTitle}>
              Customer
            </h3>
            <div className={styles.cardMeta}>
              <strong>{quote.customerName}</strong>
              {quote.organizationName ? (
                <span>{quote.organizationName}</span>
              ) : null}
              <span>{quote.email}</span>
              <span>{quote.phone}</span>
            </div>
          </section>

          <section className={styles.panel} aria-labelledby="quote-delivery-heading">
            <h3 id="quote-delivery-heading" className={styles.panelTitle}>
              Delivery location
            </h3>
            <div className={styles.cardMeta}>
              <span>{quote.deliveryAddress.line1}</span>
              {quote.deliveryAddress.line2 ? (
                <span>{quote.deliveryAddress.line2}</span>
              ) : null}
              <span>
                {quote.deliveryAddress.city}, {quote.deliveryAddress.state}
              </span>
              <span>
                {quote.deliveryAddress.pincode}, {quote.deliveryAddress.country}
              </span>
            </div>
          </section>
        </div>
      </div>

      <div className={styles.actions}>
        <Link href={similarHref} className="btn btn--dark">
          Request similar quote
        </Link>
        <Link href="/account/quotes" className={styles.ghost}>
          Back to bulk requests
        </Link>
      </div>
    </div>
  );
}
