import type { Metadata } from "next";
import Link from "next/link";
import { api, getOrNull } from "@/lib/api";
import { requireUser } from "@/lib/auth/dal";
import type { Order, QuoteRequest } from "@/data/account";
import { AccountShell } from "@/components/account/AccountShell";
import { QuoteCard } from "@/components/account/QuoteCard";
import { EmptyState } from "@/components/EmptyState";
import styles from "@/components/account/account.module.css";
import { loadSiteData } from "@/lib/siteData.server";

export const metadata: Metadata = {
  title: "Bulk Requests",
  description: "View your HSP Mart bulk quote request history.",
};

export default async function AccountQuotesPage() {
  await loadSiteData();
  await requireUser("/account/quotes");
  const quotes = await api.get<QuoteRequest[]>("/account/quotes", { dates: false });

  return (
    <AccountShell
      title="Bulk requests"
      description="Bulk quote requests you sent to HSP and their progress."
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
          copy="Planning a larger order? Send a request and HSP replies with a formal quotation."
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
