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
        <Stat label="Overdue balances" value={String(d.overdue.length)} />
        <Stat label="Quotes awaiting margin approval" value={String(d.margin.pending)} />
        <Stat label="Inactive partners (30d)" value={String(d.inactive.length)} />
        <Stat label="Deposits held (liability)" value={inr(d.deposits)} />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Card title="Channel economics">
          <table className="w-full text-sm">
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
          <ul className="space-y-1 text-sm">
            {d.income.buckets.map((b) => (
              <li key={b.label} className="flex items-center gap-2">
                <span className="w-20 text-xs">{b.label}</span>
                <span className="h-3 rounded bg-brand" style={{ width: `${(b.count / max) * 70}%`, minWidth: b.count ? 4 : 0 }} />
                <span className="text-xs tabular-nums">{b.count}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="AI exception alerts">
          <ul className="space-y-2 text-sm">
            {d.alerts.map((a, i) => <li key={i}><Badge>{a.severity}</Badge> {a.message}</li>)}
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

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-line bg-white p-3"><p className="text-xs text-muted">{label}</p><p className="text-xl font-semibold tabular-nums">{value}</p></div>;
}
