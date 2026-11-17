import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getOrNull } from "@/lib/api";
import { Badge, btnCls, Card, Flash, Row } from "@/components/portal/ui";
import { requireUser } from "@/lib/auth/dal";
import { formatINR } from "@/lib/commerce/pricing";
import { acceptQuoteAction } from "../../actions";
import { loadSiteData } from "@/lib/siteData.server";

export const metadata: Metadata = { title: "Your quotation", robots: { index: false } };

export default async function CustomerQuotePage({
  params,
  searchParams,
}: {
  params: Promise<{ number: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await loadSiteData();
  const { number } = await params;
  const user = await requireUser(`/my/quotes/${number}`);
  const { error } = await searchParams;

  // Drafts and unapproved quotes are internal; other customers' quotes are invisible (backend returns 404).
  const d = await getOrNull<{
    quote: { number: string; status: string; validUntil: Date; subtotalPaise: number; freightPaise: number; gstPaise: number; totalPaise: number; advanceDuePaise: number };
    lines: { id: string; name: string; quantity: number; unitPricePaise: number; gstRateBps: number; branding: { notes?: string } | null }[];
  }>(`/my/quotes/${encodeURIComponent(number)}`);
  if (!d) notFound();
  const q = d.quote;
  const lines = d.lines.map((l) => ({ l, name: l.name }));

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-1 font-serif text-3xl">Quotation {q.number}</h1>
      <p className="mb-6 text-sm text-[var(--color-text-secondary)]">
        Valid until {q.validUntil.toLocaleDateString("en-IN")} · <Badge testId="customer-quote-status">{q.status}</Badge>
      </p>
      <Flash error={error} />
      <Card>
        <table className="mb-4 w-full text-sm">
          <tbody>
            {lines.map(({ l, name }) => (
              <tr key={l.id} className="border-b border-[var(--color-border)]">
                <td className="py-2">{name}</td>
                <td className="py-2 text-right tabular-nums">
                  {l.quantity} × {formatINR(l.unitPricePaise)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <dl>
          <Row label="Subtotal" value={formatINR(q.subtotalPaise)} />
          {q.freightPaise > 0 && <Row label="Freight" value={formatINR(q.freightPaise)} />}
          <Row label="GST" value={formatINR(q.gstPaise)} />
          <Row label="Total payable" value={formatINR(q.totalPaise)} testId="customer-quote-total" />
          <Row label="Advance to confirm production (50%)" value={formatINR(q.advanceDuePaise)} />
        </dl>
      </Card>
      {q.status === "sent" && (
        <form action={acceptQuoteAction.bind(null, q.number)} className="mt-6">
          <button className={btnCls}>Accept quotation</button>
        </form>
      )}
    </main>
  );
}
