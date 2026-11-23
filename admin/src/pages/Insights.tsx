import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api, inr, when } from "../api";
import { Badge, btn, Card, ErrorText, input, Loading, PageTitle, useAction } from "../ui";

type D = {
  channels: { channel: string; orders: number; revenuePaise: number; contributionPaise: number }[];
  overdue: { number: string; status: string; balancePaise: number; ageDays: number }[];
  income: { associates: number; median: number; buckets: { label: string; count: number }[] };
  inactive: { code: string; type: string; city: string | null }[];
  margin: { pending: number; approved: number };
  deposits: number;
  advances: { orders: number; advancesPaise: number };
  grievances: { open: number; overdue: number; onTime: number; resolved: number };
  forecast: { division: string; history: { month: string; units: number }[]; forecast: { month: string; units: number; season: string | null }[] }[];
  franchises: { code: string; city: string | null; status: string; leads: number; quotes: number; orders: number; revenuePaise: number;
    contributionPaise: number; avgOrderPaise: number; complaints: number; securityDepositPaise: number }[];
  suppliers: { id: string; name: string; city: string | null; status: string; purchaseOrders: number; delivered: number; avgDaysToDeliver: number | null; complaints: number }[];
  alerts: { kind: string; severity: string; message: string }[];
  outbox: { id: string; channel: string; recipient: string; template: string; status: string; reason: string | null; createdAt: string }[];
};

export default function Insights({ role }: { role: string }) {
  const q = useQuery({ queryKey: ["insights"], queryFn: () => api<D>("/admin/insights") });
  const campaign = useAction("/admin/campaigns", [["insights"]]);
  const [template, setTemplate] = useState("festive.diwali");
  if (q.error) return <ErrorText error={q.error} />;
  if (!q.data) return <Loading />;
  const d = q.data;
  const max = Math.max(1, ...d.income.buckets.map((b) => b.count));
  return (
    <div className="space-y-6">
      <PageTitle>Management insights</PageTitle>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Overdue balances" value={String(d.overdue.length)} testId="kpi-overdue" />
        <Stat label="Quotes awaiting margin approval" value={String(d.margin.pending)} />
        <Stat label="Inactive partners (30d)" value={String(d.inactive.length)} />
        <Stat label="Deposits held (liability)" value={inr(d.deposits)} />
        <Stat label={`Customer advances held (${d.advances.orders} undelivered orders)`} value={inr(d.advances.advancesPaise)} testId="advances" />
        <Stat label="Open complaints" value={String(d.grievances.open)} />
        <Stat label="Complaints past 3-day SLA" value={String(d.grievances.overdue)} />
        <Stat label="Resolved on time" value={d.grievances.resolved ? `${Math.round((d.grievances.onTime / d.grievances.resolved) * 100)}%` : "—"} />
      </div>
      <p className="text-xs text-muted">Customer advances are money received on orders not yet delivered. They are a liability (unearned revenue) until delivery, not sales.</p>
      <div className="grid gap-6 md:grid-cols-2">
        <Card title="Channel economics">
          <table data-testid="channel-table" className="w-full text-sm">
            <thead className="text-xs uppercase text-muted"><tr><th className="text-left">Channel</th><th className="text-right">Orders</th><th className="text-right">Revenue</th><th className="text-right">Contribution</th></tr></thead>
            <tbody>
              {d.channels.map((c) => (
                <tr key={c.channel} className="border-t border-line">
                  <td className="py-1.5">{c.channel}</td><td className="text-right">{c.orders}</td>
                  <td className="text-right tabular-nums">{inr(c.revenuePaise)}</td>
                  <td className="text-right tabular-nums">{inr(c.contributionPaise)} ({((c.contributionPaise / Math.max(1, c.revenuePaise)) * 100).toFixed(1)}%)</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card title="Associate income (last 30 days)">
          <p className="mb-2 text-sm">{d.income.associates} active associates · median <strong>{inr(d.income.median)}</strong></p>
          <ul data-testid="income-buckets" className="space-y-1 text-sm">
            {d.income.buckets.map((b) => (
              <li key={b.label} className="flex items-center gap-2">
                <span className="w-20 text-xs">{b.label}</span>
                <span className="h-3 rounded bg-brand" style={{ width: `${(b.count / max) * 70}%`, minWidth: b.count ? 4 : 0 }} />
                <span data-testid="bucket-count" className="text-xs tabular-nums">{b.count}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="AI exception alerts">
          <ul data-testid="ai-alerts" className="space-y-2 text-sm">
            {d.alerts.map((a, i) => <li key={i}><Badge>{a.severity}</Badge> {a.message} <span className="text-xs text-muted">({a.kind})</span></li>)}
            {!d.alerts.length && <li className="text-muted">No exceptions detected.</li>}
          </ul>
        </Card>
        <Card title="Communications outbox">
          {role === "hsp_admin" && (
            <div className="mb-3 space-y-2">
              <div className="flex gap-2">
                <input aria-label="Campaign template" className={input} value={template} onChange={(e) => setTemplate(e.target.value)} />
                <button className={btn} disabled={campaign.pending} onClick={() => campaign.run({ template }, "Campaign processed — see outbox")}>Send marketing campaign</button>
              </div>
              {campaign.feedback}
              <p className="text-xs text-muted">Customers without recorded marketing consent are blocked automatically.</p>
            </div>
          )}
          <ul className="space-y-1 text-xs">
            {d.outbox.map((n) => <li key={n.id}>{when(n.createdAt)} · {n.channel} · {n.template} · {n.recipient} · <Badge>{n.status}</Badge>{n.reason ? ` — ${n.reason}` : ""}</li>)}
          </ul>
        </Card>
        <Card title="Overdue balances">
          <ul className="space-y-1 text-sm">
            {d.overdue.map((o) => <li key={o.number}>{o.number} · {o.status.replaceAll("_", " ")} · {inr(o.balancePaise)} · {o.ageDays}d</li>)}
            {!d.overdue.length && <li className="text-muted">Nothing overdue.</li>}
          </ul>
        </Card>
        <Card title="Demand forecast (units, next 3 months)" testId="forecast">
          <p className="mb-2 text-xs text-muted">Trailing 3-month average; festive months use last year's volume if higher. Indicative until a full year of orders exists.</p>
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted"><tr><th className="text-left">Division</th><th className="text-right">Last 12m</th>{d.forecast[0]?.forecast.map((f) => <th key={f.month} className="text-right">{f.month}{f.season ? ` · ${f.season}` : ""}</th>)}</tr></thead>
            <tbody>
              {d.forecast.map((r) => (
                <tr key={r.division} className="border-t border-line">
                  <td className="py-1.5">{r.division.replaceAll("_", " ")}</td>
                  <td className="text-right tabular-nums">{r.history.reduce((t, h) => t + h.units, 0)}</td>
                  {r.forecast.map((f) => <td key={f.month} className="text-right tabular-nums">{f.units}</td>)}
                </tr>
              ))}
              {!d.forecast.length && <tr><td className="py-2 text-muted" colSpan={5}>No orders in the last 12 months.</td></tr>}
            </tbody>
          </table>
        </Card>
        <Card title="Supplier scorecard">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted"><tr><th className="text-left">Supplier</th><th className="text-right">POs</th><th className="text-right">Delivered</th><th className="text-right">Avg days</th><th className="text-right">Complaints</th></tr></thead>
            <tbody>
              {d.suppliers.map((s) => (
                <tr key={s.id} className="border-t border-line">
                  <td className="py-1.5">{s.name} <Badge>{s.status}</Badge></td><td className="text-right">{s.purchaseOrders}</td>
                  <td className="text-right">{s.delivered}</td><td className="text-right">{s.avgDaysToDeliver ?? "—"}</td><td className="text-right">{s.complaints}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <div className="md:col-span-2">
          <Card title="Franchise analytics" testId="franchise-analytics">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-muted"><tr><th className="text-left">Franchise</th><th className="text-right">Leads</th><th className="text-right">Quotes</th><th className="text-right">Orders</th><th className="text-right">Revenue</th><th className="text-right">Contribution</th><th className="text-right">Avg order</th><th className="text-right">Complaints</th><th className="text-right">Deposit</th></tr></thead>
                <tbody>
                  {d.franchises.map((f) => (
                    <tr key={f.code} className="border-t border-line">
                      <td className="py-1.5">{f.code} · {f.city} <Badge>{f.status}</Badge></td><td className="text-right">{f.leads}</td><td className="text-right">{f.quotes}</td>
                      <td className="text-right">{f.orders}</td><td className="text-right tabular-nums">{inr(f.revenuePaise)}</td>
                      <td className="text-right tabular-nums">{inr(f.contributionPaise)}</td><td className="text-right tabular-nums">{inr(f.avgOrderPaise)}</td>
                      <td className="text-right">{f.complaints}</td><td className="text-right tabular-nums">{inr(f.securityDepositPaise)}</td>
                    </tr>
                  ))}
                  {!d.franchises.length && <tr><td className="py-2 text-muted" colSpan={9}>No franchises yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
        <Card title="Inactive partners (30 days)">
          <ul className="space-y-1 text-sm">
            {d.inactive.map((p) => <li key={p.code}>{p.code} · {p.type} · {p.city}</li>)}
            {!d.inactive.length && <li className="text-muted">Everyone is active.</li>}
          </ul>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value, testId }: { label: string; value: string; testId?: string }) {
  return <div data-testid={testId} className="rounded-lg border border-line bg-white p-3"><p className="text-xs text-muted">{label}</p><p className="text-xl font-semibold tabular-nums">{value}</p></div>;
}
