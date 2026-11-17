import Link from "next/link";
import { PortalShell } from "@/components/portal/PortalShell";
import { ADMIN_NAV, btnCls, Card, inputCls, Row } from "@/components/portal/ui";
import { api } from "@/lib/api";
import { requireRole } from "@/lib/auth/dal";
import { STAFF_ROLES } from "@/lib/auth/token";
import { formatINR } from "@/lib/commerce/pricing";
import { loadSiteData } from "@/lib/siteData.server";

type Draft = {
  understood: { quantity: number | null; budgetRupees: number | null; deadlineDays: number | null; branding: boolean };
  suggestions: { id: string; sku: string; name: string; pricePaise: number; reason: string }[];
  preview: { subtotalPaise: number; gstPaise: number; totalPaise: number; contributionBps: number } | null;
  linesText: string;
};

export default async function AssistantPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await loadSiteData();
  const user = await requireRole(STAFF_ROLES, "/admin/assistant");
  const { q } = await searchParams;
  const draft = q?.trim() ? await api.get<Draft>(`/admin/assistant?q=${encodeURIComponent(q)}`) : null;

  return (
    <PortalShell title="AI quotation assistant" user={user} nav={ADMIN_NAV}>
      <form className="mb-6 space-y-3">
        <textarea
          name="q"
          aria-label="Customer request"
          defaultValue={q}
          rows={3}
          placeholder="Paste the customer's email or WhatsApp message, e.g. “Need 50 Diwali hampers under 1500 each with our logo in 20 days”"
          className={inputCls}
        />
        <button className={btnCls}>Draft quote</button>
      </form>
      {draft && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card title="What I understood">
            <dl data-testid="understood">
              <Row label="Quantity" value={draft.understood.quantity ?? "—"} testId="u-qty" />
              <Row label="Budget per unit" value={draft.understood.budgetRupees ? `₹${draft.understood.budgetRupees}` : "—"} testId="u-budget" />
              <Row label="Deadline" value={draft.understood.deadlineDays ? `${draft.understood.deadlineDays} days` : "—"} />
              <Row label="Branding" value={draft.understood.branding ? "Yes — artwork approval required" : "No"} testId="u-branding" />
            </dl>
            <h3 className="mb-2 mt-4 text-sm font-medium">Suggested products</h3>
            <ul data-testid="suggestions" className="space-y-1 text-sm">
              {draft.suggestions.map((s) => (
                <li key={s.id}>
                  <strong>{s.sku}</strong> {s.name} · {formatINR(s.pricePaise)}
                  <br />
                  <span className="text-xs text-[var(--color-text-muted)]">{s.reason}</span>
                </li>
              ))}
              {draft.suggestions.length === 0 && <li>No approved product fits — widen the budget or deadline.</li>}
            </ul>
          </Card>
          {draft.preview && (
            <Card title="Pricing-engine preview (not saved)">
              <dl>
                <Row label="Subtotal" value={formatINR(draft.preview.subtotalPaise)} />
                <Row label="GST" value={formatINR(draft.preview.gstPaise)} />
                <Row label="Total" value={formatINR(draft.preview.totalPaise)} testId="draft-total" />
                <Row label="Contribution" value={`${(draft.preview.contributionBps / 100).toFixed(1)}%`} />
              </dl>
              <pre data-testid="draft-lines" className="mt-3 rounded bg-[var(--color-ivory)] p-2 text-xs">{draft.linesText}</pre>
              <Link className={`${btnCls} mt-3 inline-block`} href={`/admin/quotes/new?lines=${encodeURIComponent(draft.linesText)}`}>
                Review &amp; create quote
              </Link>
              <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                The assistant drafts only. Prices, GST and margin are always recomputed by the pricing engine when a person
                creates the quote.
              </p>
            </Card>
          )}
        </div>
      )}
    </PortalShell>
  );
}
