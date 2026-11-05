import type { Metadata } from "next";
import Link from "next/link";
import { getQuoteById } from "@/data/account";
import { AccountShell } from "@/components/account/AccountShell";
import { QuoteDetailView } from "@/components/account/QuoteDetailView";
import styles from "@/components/account/account.module.css";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const quote = getQuoteById(id);
  return {
    title: quote
      ? `Request ${quote.reference} — HSP Mart`
      : "Request not found — HSP Mart",
  };
}

export default async function AccountQuoteDetailPage({ params }: Props) {
  const { id } = await params;
  const quote = getQuoteById(id);

  if (!quote) {
    return (
      <AccountShell title="Request not found">
        <div className={styles.notFound}>
          <p className={styles.copy}>This request could not be found.</p>
          <Link href="/account/quotes" className="btn btn--dark">
            Back to bulk requests
          </Link>
        </div>
      </AccountShell>
    );
  }

  return (
    <AccountShell
      title={`Request ${quote.reference}`}
      description="Demo bulk request — no live quotation has been issued."
    >
      <QuoteDetailView quote={quote} />
    </AccountShell>
  );
}
