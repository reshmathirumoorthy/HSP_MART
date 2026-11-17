import { api } from "@/lib/api";
import { PortalShell, Stat } from "@/components/portal/PortalShell";
import { ADMIN_NAV, Badge, btnCls, Card, Flash, inputCls } from "@/components/portal/ui";
import { requireRole } from "@/lib/auth/dal";
import { STAFF_ROLES } from "@/lib/auth/token";
import { formatINR } from "@/lib/commerce/pricing";
import { campaignAction } from "../actions";
import { loadSiteData } from "@/lib/siteData.server";

export default async function InsightsPage({ searchParams }: { searchParams: Promise<{ error?: string; ok?: string }> }) {
  await loadSiteData();
  const user = await requireRole(STAFF_ROLES, "/admin/insights");
  const flash = await searchParams;
  const { channels, overdue, income, inactive, margin, deposits, alerts, outbox } = await api.get<{
    channels: { channel: string; orders: number; revenuePaise: number; contributionPaise: number }[];
    overdue: { number: string; status: string; balancePaise: number; ageDays: number }[];
    income: { associates: number; median: number; buckets: { label: string; count: number }[] };
    inactive: { code: string; type: string; city: string | null }[];
    margin: { pending: number; approved: number };
    deposits: number;
    alerts: { kind: string; severity: "high" | "medium"; message: string }[];
    outbox: { id: string; channel: string; recipient: string; template: string; category: string; status: string; reason: string | null; createdAt: Date }[];
  }>("/admin/insights");
  const maxBucket = Math.max(1, ...income.buckets.map((b) => b.count));

  return (
    <PortalShell title="Management insights" user={user} nav={ADMIN_NAV}>
      <Flash {...flash} />
      <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Overdue balances" value={overdue.length} testId="kpi-overdue" />
        <Stat label="Quotes awaiting margin approval" value={margin.pending} testId="kpi-margin-pending" />
        <Stat label="Inactive partners (30d)" value={inactive.length} testId="kpi-inactive" />
        <Stat label="Deposits held (liability)" value={formatINR(deposits)} />
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <Card title="1 · HSP economics by channel">
          <table data-testid="channel-table" className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-[var(--color-text-muted)]">
              <tr>
                <th className="py-1">Channel</th>
                <th className="py-1 text-right">Orders</th>
                <th className="py-1 text-right">Net sales</th>
                <th className="py-1 text-right">Contribution</th>
              </tr>
            </thead>
            <tbody>
              {channels.map((c) => (
                <tr key={c.channel} className="border-t border-[var(--color-border)]">
                  <td className="py-1.5">{c.channel}</td>
                  <td className="py-1.5 text-right tabular-nums">{c.orders}</td>
                  <td className="py-1.5 text-right tabular-nums">{formatINR(Number(c.revenuePaise))}</td>
                  <td className="py-1.5 text-right tabular-nums">
                    {formatINR(Number(c.contributionPaise))} (
                    {((Number(c.contributionPaise) / Math.max(1, Number(c.revenuePaise))) * 100).toFixed(1)}%)
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card title="2 · Associate monthly income (last 30 days)">
          <p className="mb-2 text-sm">
            {income.associates} active associates · median{" "}
            <strong data-testid="income-median">{formatINR(income.median)}</strong>
          </p>
          <ul data-testid="income-buckets" className="space-y-1.5 text-sm">
            {income.buckets.map((b) => (
              <li key={b.label} className="grid grid-cols-[5rem_1fr_2rem] items-center gap-2">
                <span>{b.label}</span>
                <span className="h-3 rounded bg-[var(--color-ivory-deep)]">
                  <span className="block h-3 rounded bg-[var(--color-brand)]" style={{ width: `${(b.count / maxBucket) * 100}%` }} />
                </span>
                <span className="text-right tabular-nums">{b.count}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-[var(--color-text-muted)]">₹15,000/month needs ≈ ₹1.5 lakh of eligible monthly sales.</p>
        </Card>

        <Card title="AI management intelligence">
          <ul data-testid="ai-alerts" className="space-y-2 text-sm">
            {alerts.map((a, i) => (
              <li key={i}>
                <Badge tone={a.severity === "high" ? "warn" : "neutral"}>{a.kind}</Badge> {a.message}
              </li>
            ))}
            {alerts.length === 0 && <li className="text-[var(--color-text-muted)]">No exceptions detected.</li>}
          </ul>
        </Card>

        <Card title="Communications outbox">
          <form action={campaignAction} className="mb-3 flex gap-2">
            <input name="template" defaultValue="festive.diwali" aria-label="Campaign template" className={inputCls} />
            <button className={btnCls}>Send marketing campaign</button>
          </form>
          <ul data-testid="outbox" className="space-y-1 text-xs">
            {outbox.map((n) => (
              <li key={n.id}>
                {n.channel} · {n.template} · {n.recipient} · <Badge tone={n.status === "blocked" ? "warn" : "neutral"}>{n.status}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </PortalShell>
  );
}
