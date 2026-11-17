import { api, getOrNull } from "@/lib/api";
import { PortalShell } from "@/components/portal/PortalShell";
import { Badge, btnCls, btnGhostCls, Card, Flash, inputCls } from "@/components/portal/ui";
import { requireRole } from "@/lib/auth/dal";
import { PARTNER_ROLES } from "@/lib/auth/token";
import { formatINR } from "@/lib/commerce/pricing";
import { partnerQuoteAction, partnerSendQuoteAction } from "../actions";
import { partnerNav } from "../nav";
import { getT } from "@/lib/i18n/server";
import { loadSiteData } from "@/lib/siteData.server";

export default async function PartnerQuotesPage({ searchParams }: { searchParams: Promise<{ error?: string; ok?: string }> }) {
  await loadSiteData();
  const user = await requireRole(PARTNER_ROLES, "/partner/quotes");
  const { t } = await getT();
  const flash = await searchParams;
  const data = await api.get<{
    partner: { code: string; status: string } | null;
    leads: { id: string; name: string }[];
    quotes: { number: string; status: string; totalPaise: number; commissionPaise: number; createdAt: Date; customer: string }[];
  }>("/partner/quotes");
  if (!data.partner) return null;
  const leads = data.leads;
  const quotes = data.quotes.map((q) => ({ q: { ...q, id: q.number }, customer: q.customer }));

  return (
    <PortalShell title="Quotes" user={user} nav={partnerNav(t)}>
      <Flash {...flash} />
      <div className="grid gap-6 md:grid-cols-[1fr_2fr]">
        <Card title="New quote for a lead">
          <form action={partnerQuoteAction} className="space-y-3">
            <select name="customerId" aria-label="Lead" className={inputCls}>
              {leads.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
            <label className="block text-sm">
              <code>SKU, quantity[, , branding notes]</code> — approved prices are applied automatically
              <textarea name="lines" aria-label="Quote lines" rows={5} className={`${inputCls} font-mono`} />
            </label>
            <button className={btnCls} disabled={leads.length === 0}>
              Price quote
            </button>
          </form>
        </Card>
        <Card title="Your quotes">
          <ul data-testid="partner-quotes" className="divide-y divide-[var(--color-border)] text-sm">
            {quotes.map(({ q, customer }) => (
              <li key={q.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>
                  {q.number} · {customer} · {formatINR(q.totalPaise)}
                </span>
                <span className="flex items-center gap-2">
                  <Badge tone={q.status === "pending_approval" ? "warn" : "neutral"}>{q.status}</Badge>
                  {q.status === "approved" && (
                    <form action={partnerSendQuoteAction.bind(null, q.number)}>
                      <button className={btnGhostCls}>Send</button>
                    </form>
                  )}
                </span>
              </li>
            ))}
            {quotes.length === 0 && <li className="py-3 text-[var(--color-text-muted)]">No quotes yet.</li>}
          </ul>
          <p className="mt-3 text-xs text-[var(--color-text-muted)]">
            Quotes below HSP&apos;s minimum margin wait for HSP approval before they can be sent.
          </p>
        </Card>
      </div>
    </PortalShell>
  );
}
