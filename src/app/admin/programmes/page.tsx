import { api, getOrNull } from "@/lib/api";
import { PortalShell } from "@/components/portal/PortalShell";
import { ADMIN_NAV, Badge, btnCls, btnGhostCls, Card, Flash, inputCls } from "@/components/portal/ui";
import { requireRole } from "@/lib/auth/dal";
import { STAFF_ROLES } from "@/lib/auth/token";
import { createProgrammeAction, runProgrammesAction } from "../actions";
import { loadSiteData } from "@/lib/siteData.server";

export default async function ProgrammesPage({ searchParams }: { searchParams: Promise<{ error?: string; ok?: string }> }) {
  await loadSiteData();
  const user = await requireRole(STAFF_ROLES, "/admin/programmes");
  const flash = await searchParams;
  const data = await api.get<{ id: string; name: string; occasion: string; nextDate: Date; leadDays: number; lines: { sku: string; quantity: number }[]; active: boolean; customer: string; quote: string | null }[]>("/admin/programmes");
  const rows = data.map((p) => ({ p, customer: p.customer, quote: p.quote }));

  return (
    <PortalShell title="Corporate gifting programmes" user={user} nav={ADMIN_NAV}>
      <Flash {...flash} />
      <div className="grid gap-6 md:grid-cols-[1fr_2fr]">
        <Card title="Schedule an annual programme">
          <form action={createProgrammeAction} className="space-y-2">
            <input name="customerName" aria-label="Customer name" placeholder="Customer organisation" className={inputCls} />
            <input name="customerEmail" aria-label="Customer email" placeholder="buyer@company.com" className={inputCls} />
            <input name="name" aria-label="Programme name" placeholder="Diwali employee gifts" className={inputCls} />
            <input name="occasion" aria-label="Occasion" placeholder="Diwali" className={inputCls} />
            <label className="block text-sm">
              Occasion date
              <input type="date" name="nextDate" aria-label="Occasion date" className={inputCls} />
            </label>
            <input name="leadDays" aria-label="Lead days" placeholder="Raise quote N days before (30)" className={inputCls} />
            <textarea name="lines" aria-label="Programme lines" rows={3} placeholder="SKU, quantity[, , branding]" className={`${inputCls} font-mono`} />
            <button className={btnCls}>Schedule</button>
          </form>
        </Card>
        <Card title="Programmes">
          <form action={runProgrammesAction} className="mb-3">
            <button className={btnGhostCls}>Run due programmes now</button>
          </form>
          <ul data-testid="programme-list" className="divide-y divide-[var(--color-border)] text-sm">
            {rows.map(({ p, customer, quote }) => (
              <li key={p.id} className="py-2">
                {p.name} · {customer} · next {p.nextDate.toLocaleDateString("en-IN")} · {p.leadDays}d lead{" "}
                {quote && <Badge>last quote {quote}</Badge>}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-[var(--color-text-muted)]">A daily cron (/api/cron/programmes) raises draft quotes automatically.</p>
        </Card>
      </div>
    </PortalShell>
  );
}
