import { notFound } from "next/navigation";
import { api, getOrNull } from "@/lib/api";
import { PortalShell } from "@/components/portal/PortalShell";
import { ADMIN_NAV, Badge, btnCls, Card, Flash, inputCls, Row } from "@/components/portal/ui";
import { requireRole } from "@/lib/auth/dal";
import { STAFF_ROLES } from "@/lib/auth/token";
import { formatINR } from "@/lib/commerce/pricing";
import { approveExceptionAction, sendQuoteAction } from "../../actions";
import { loadSiteData } from "@/lib/siteData.server";

export default async function AdminQuotePage({
  params,
  searchParams,
}: {
  params: Promise<{ number: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  await loadSiteData();
  const { number } = await params;
  const user = await requireRole(STAFF_ROLES, `/admin/quotes/${number}`);
  const flash = await searchParams;

  const data = await getOrNull<{
    quote: { id: string; number: string; status: string; channel: string; subtotalPaise: number; gstPaise: number; freightPaise: number; totalPaise: number;
      commissionPaise: number; contributionBps: number; belowMinimum: boolean; exceptionReason: string | null; validUntil: Date; createdBy: string;
      customer: string; customerEmail: string; customerGstin: string | null; orderNumber: string | null };
    lines: { id: string; sku: string; name: string; quantity: number; unitPricePaise: number; unitCostPaise: number | null; gstRateBps: number; branding: { notes?: string } | null }[];
  }>(`/admin/quotes/${encodeURIComponent(number)}`);
  if (!data) notFound();
  const q = data.quote;
  const c = { name: q.customer, email: q.customerEmail, gstin: q.customerGstin };
  const lines = data.lines.map((l) => ({ l, name: l.name, sku: l.sku }));

  return (
    <PortalShell title={`Quote ${q.number}`} user={user} nav={ADMIN_NAV}>
      <Flash {...flash} />
      <div className="mb-4 flex items-center gap-3">
        <Badge testId="quote-status" tone={q.status === "pending_approval" ? "warn" : "neutral"}>
          {q.status}
        </Badge>
        {q.belowMinimum && <Badge tone="warn" testId="below-minimum">below 12% minimum</Badge>}
      </div>
      <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
        <Card title={`${c.name} · ${c.email}`}>
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-[var(--color-text-muted)]">
              <tr>
                <th className="py-1">Product</th>
                <th className="py-1 text-right">Qty</th>
                <th className="py-1 text-right">Unit</th>
                <th className="py-1 text-right">Unit cost</th>
              </tr>
            </thead>
            <tbody>
              {lines.map(({ l, name, sku }) => (
                <tr key={l.id} className="border-t border-[var(--color-border)]">
                  <td className="py-1.5">
                    {name} <span className="text-xs text-[var(--color-text-muted)]">{sku}</span>
                    {l.branding != null && <Badge>branded</Badge>}
                  </td>
                  <td className="py-1.5 text-right tabular-nums">{l.quantity}</td>
                  <td className="py-1.5 text-right tabular-nums">{formatINR(l.unitPricePaise)}</td>
                  <td className="py-1.5 text-right tabular-nums">{formatINR(l.unitCostPaise ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <div className="space-y-6">
          <Card title="Pricing">
            <dl>
              <Row label="Subtotal" value={formatINR(q.subtotalPaise)} testId="quote-subtotal" />
              <Row label="Freight" value={formatINR(q.freightPaise)} />
              <Row label="GST" value={formatINR(q.gstPaise)} testId="quote-gst" />
              <Row label="Total" value={formatINR(q.totalPaise)} testId="quote-total" />
              <Row label="Partner commission" value={formatINR(q.commissionPaise)} />
              <Row label="Contribution" value={`${(q.contributionBps / 100).toFixed(1)}%`} testId="quote-contribution" />
              <Row label="Valid until" value={q.validUntil.toLocaleDateString("en-IN")} />
            </dl>
            {q.exceptionReason && <p className="mt-2 text-xs">Exception: {q.exceptionReason}</p>}
          </Card>

          {q.status === "pending_approval" && (
            <Card title="Approve margin exception">
              <form action={approveExceptionAction.bind(null, q.number)} className="space-y-3">
                <textarea name="reason" rows={3} placeholder="Why is this below-minimum quote acceptable?" className={inputCls} />
                <button className={btnCls}>Approve exception</button>
              </form>
            </Card>
          )}
          {q.status === "approved" && (
            <form action={sendQuoteAction.bind(null, q.number)}>
              <button className={btnCls}>Send to customer</button>
            </form>
          )}
        </div>
      </div>
    </PortalShell>
  );
}
