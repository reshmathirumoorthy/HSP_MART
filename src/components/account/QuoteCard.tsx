import Link from "next/link";
import {
  formatAccountDate,
  quoteStatusLabel,
  type QuoteRequest,
} from "@/data/account";
import { StatusBadge } from "@/components/account/StatusBadge";
import styles from "./account.module.css";

type Props = {
  quote: QuoteRequest;
};

function statusTone(status: QuoteRequest["status"]) {
  if (status === "closed") return "muted" as const;
  if (status === "under-review" || status === "submitted") return "warm" as const;
  return "default" as const;
}

export function QuoteCard({ quote }: Props) {
  const productSummary = quote.items
    .map((item) => item.productName)
    .slice(0, 2)
    .join(", ");

  return (
    <article className={styles.orderCard}>
      <div className={styles.orderInfo}>
        <h3 className={styles.orderRef}>{quote.reference}</h3>
        <p className={styles.orderMeta}>
          <span>{formatAccountDate(quote.submittedAt)}</span>
          <span className={styles.metaDot} aria-hidden="true" />
          <span>
            {quote.totalUnits.toLocaleString("en-IN")} units
          </span>
        </p>
        {productSummary ? (
          <p className={styles.orderSub}>{productSummary}</p>
        ) : null}
      </div>
      <div className={styles.orderFigure}>
        <StatusBadge
          label={quoteStatusLabel(quote.status)}
          tone={statusTone(quote.status)}
        />
      </div>
      <Link href={`/account/quotes/${quote.id}`} className={styles.cardAction}>
        View details
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 12h14" />
          <path d="m13 6 6 6-6 6" />
        </svg>
      </Link>
    </article>
  );
}
