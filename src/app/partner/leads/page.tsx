import { api, getOrNull } from "@/lib/api";
import { PortalShell } from "@/components/portal/PortalShell";
import { Badge, btnCls, Card, Flash, inputCls } from "@/components/portal/ui";
import { requireRole } from "@/lib/auth/dal";
import { PARTNER_ROLES } from "@/lib/auth/token";
import { registerLeadAction } from "../actions";
import { partnerNav } from "../nav";
import { getT } from "@/lib/i18n/server";
import { loadSiteData } from "@/lib/siteData.server";

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ error?: string; ok?: string }> }) {
  await loadSiteData();
  const user = await requireRole(PARTNER_ROLES, "/partner/leads");
  const { t } = await getT();
  const flash = await searchParams;
  // Isolation: the backend returns only this partner's own leads.
  const data = await api.get<{ partner: { code: string; status: string } | null; leads: { id: string; status: string; protectionExpiresAt: Date; name: string; email: string }[] }>("/partner/leads");
  const leads = data.leads.map((l) => ({ l, c: { name: l.name, email: l.email } }));
  const now = new Date();

  return (
    <PortalShell title="Leads" user={user} nav={partnerNav(t)}>
      <Flash {...flash} />
      <div className="grid gap-6 md:grid-cols-[1fr_2fr]">
        <Card title="Register a lead">
          <form action={registerLeadAction} className="space-y-3">
            <input name="name" aria-label="Customer name" placeholder="Company or person" className={inputCls} />
            <input name="email" aria-label="Customer email" placeholder="buyer@company.com" className={inputCls} />
            <select name="kind" aria-label="Customer type" className={inputCls}>
              <option value="organisation">Organisation</option>
              <option value="individual">Individual</option>
            </select>
            <input name="source" aria-label="Source" placeholder="Referral, event, WhatsApp…" className={inputCls} />
            <button className={btnCls}>Register lead</button>
          </form>
        </Card>
        <Card title="Your protected customers">
          <ul data-testid="lead-list" className="divide-y divide-[var(--color-border)] text-sm">
            {leads.map(({ l, c }) => {
              const expired = l.protectionExpiresAt < now;
              const days = Math.ceil((l.protectionExpiresAt.getTime() - now.getTime()) / 86_400_000);
              return (
                <li key={l.id} className="flex justify-between gap-3 py-2">
                  <span>
                    {c.name} <span className="text-[var(--color-text-muted)]">{c.email}</span>
                  </span>
                  <span>
                    <Badge tone={expired ? "warn" : "good"}>{expired ? "expired" : `${l.status} · ${days}d left`}</Badge>
                  </span>
                </li>
              );
            })}
            {leads.length === 0 && <li className="py-3 text-[var(--color-text-muted)]">No leads yet.</li>}
          </ul>
        </Card>
      </div>
    </PortalShell>
  );
}
