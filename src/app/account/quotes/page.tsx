import type { Metadata } from "next";
import Link from "next/link";
import { getQuotes } from "@/data/account";
import { AccountShell } from "@/components/account/AccountShell";
import { QuoteCard } from "@/components/account/QuoteCard";
import { EmptyState } from "@/components/EmptyState";
import styles from "@/components/account/account.module.css";

export const metadata: Metadata = {
  title: "Bulk Requests",
  description: "View your HSP Mart bulk quote request history.",
};

export default function AccountQuotesPage() {
  const quotes = getQuotes();

  return (
    <AccountShell
      title="Bulk requests"
      description="Mock bulk quote requests for this demo account."
    >
      {quotes.length ? (
        <div className={styles.cardList}>
          {quotes.map((quote) => (
            <QuoteCard key={quote.id} quote={quote} />
          ))}
        </div>
      ) : (
        <EmptyState
          label="Bulk requests"
          title="No bulk requests yet"
          copy="Planning a larger order? A request stays with this demo account and does not create a live quote."
          compact
        >
          <Link href="/bulk-quote" className="btn btn--dark">
            Request a bulk quote
          </Link>
        </EmptyState>
      )}
    </AccountShell>
  );
}
