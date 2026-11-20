import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { api } from "../api";
import { Badge, btn, btnGhost, Card, ErrorText, input, Loading, PageTitle } from "../ui";

type Year = Record<string, number>;
type A = { procurementPct: number; fulfilmentPct: number; associateRatePct: number; franchiseRatePct: number; years: Year[] };
type Y = { year: number; associateSales: number; franchiseSales: number; directSales: number; revenue: number; procurement: number;
  fulfilment: number; commissions: number; contribution: number; contributionPct: number; fixedCosts: number; ebitda: number;
  ebitdaPct: number; breakEvenRevenue: number | null; techInvestment: number; workingCapital: number; cash: number; associateMonthlyCommission: number };
type D = {
  assumptions: A; isDefault: boolean; updatedAt: string | null;
  plan: { years: Y[]; channels: { channel: string; partnerPct: number; contributionPct: number }[]; fundingNeedLakh: number };
  actuals: { platform: { channel: string; orders: number; revenue: number; contribution: number }[]; productiveAssociates: number;
    history: { channel: string; orders: number; revenue: number; grossMarginPct: number | null; months: number }[] };
};
type R = { ready: boolean; passed: number; total: number;
  checks: { key: string; label: string; value: number | null; target: number; unit: string; detail: string; status: string }[] };

const DRIVERS: [string, string][] = [
  ["associates", "Average productive associates"], ["associateOrdersPerMonth", "Orders per associate per month"],
  ["associateOrderValue", "Average associate order (₹)"], ["franchises", "Average active city franchises"],
  ["franchiseOrdersPerMonth", "Orders per franchise per month"], ["franchiseOrderValue", "Average franchise order (₹)"],
  ["directOrdersPerMonth", "Direct HSP corporate orders per month"], ["directOrderValue", "Average direct corporate order (₹)"],
  ["fixedCostsLakh", "Fixed operating expenses (₹ lakh)"], ["techInvestmentLakh", "Technology investment (₹ lakh)"],
  ["workingCapitalLakh", "Additional working capital (₹ lakh)"],
];
const RATES: [keyof Omit<A, "years">, string][] = [
  ["procurementPct", "Procurement & branding % of revenue"], ["fulfilmentPct", "Freight, payment & claims %"],
  ["associateRatePct", "Associate commission %"], ["franchiseRatePct", "Franchise remuneration % (incl. service fee)"],
];
const ROWS: [keyof Y, string][] = [
  ["associateSales", "Associate sales"], ["franchiseSales", "Franchise sales"], ["directSales", "Direct corporate sales"],
  ["revenue", "Total revenue"], ["procurement", "Procurement and branding"], ["fulfilment", "Freight, payments and claims"],
  ["commissions", "Partner commissions and fees"], ["contribution", "Contribution"], ["fixedCosts", "Fixed operating expenses"],
  ["ebitda", "EBITDA"], ["techInvestment", "Technology investment"], ["workingCapital", "Additional working capital"], ["cash", "Indicative cash"],
];
const fmt = (n: number | null) => n == null ? "—" : n < 0 ? `(${Math.abs(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })})` : n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function Plan({ role }: { role: string }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["plan"], queryFn: () => api<D>("/admin/plan") });
  const ready = useQuery({ queryKey: ["readiness"], queryFn: () => api<R>("/admin/readiness") });
  const [a, setA] = useState<A | null>(null);
  useEffect(() => { if (q.data) setA(structuredClone(q.data.assumptions)); }, [q.data]);
  const save = useMutation({ mutationFn: (body: unknown) => api<D>("/admin/plan", body), onSuccess: (d) => qc.setQueryData(["plan"], d) });
  const reset = useMutation({ mutationFn: () => api<D>("/admin/plan/reset", {}), onSuccess: (d) => qc.setQueryData(["plan"], d) });
  if (q.error) return <ErrorText error={q.error} />;
  if (!q.data || !a) return <Loading />;
  const d = q.data;
  const canEdit = ["hsp_admin", "hsp_finance"].includes(role);
  const setYear = (i: number, k: string, v: string) => setA({ ...a, years: a.years.map((y, j) => j === i ? { ...y, [k]: Number(v) } : y) });
  return (
    <div className="space-y-6">
      <PageTitle>Financial plan & scale readiness</PageTitle>
      <p className="text-sm text-muted">
        Driver-based three-year plan (Blueprint §4). {d.isDefault ? "Showing the blueprint's base case." : `Edited ${new Date(d.updatedAt!).toLocaleDateString("en-IN")}.`}{" "}
        Figures in ₹ lakh. Replace the assumptions with HSP's real data as it arrives (Data imports).
      </p>

      <Card title={`Ready to scale? ${ready.data ? `${ready.data.passed}/${ready.data.total} conditions met` : ""}`} testId="readiness">
        <p className="mb-3 text-xs text-muted">Blueprint §10: national expansion only when every condition holds on real pilot data.</p>
        {!ready.data ? <Loading /> : (
          <ul className="divide-y divide-line text-sm">
            {ready.data.checks.map((c) => (
              <li key={c.key} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span><Badge>{c.status}</Badge> {c.label}</span>
                <span className="text-xs tabular-nums text-muted">{c.value ?? "—"}{c.value != null && c.unit === "%" ? "%" : c.unit === "%" ? "" : ` ${c.unit}`} · target {c.unit === "%" ? `${c.key === "supplier_quality" ? "≤" : "≥"} ${c.target}%` : c.target} · {c.detail}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Projected performance (₹ lakh)" testId="plan-results">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted"><tr><th className="text-left">Measure</th>{d.plan.years.map((y) => <th key={y.year} className="text-right">Year {y.year}</th>)}</tr></thead>
            <tbody>
              {ROWS.map(([k, label]) => (
                <tr key={k} className={`border-t border-line ${["revenue", "contribution", "ebitda", "cash"].includes(k) ? "font-medium" : ""}`}>
                  <td className="py-1.5">{label}</td>
                  {d.plan.years.map((y) => <td key={y.year} data-testid={`plan-${k}-${y.year}`} className="text-right tabular-nums">{fmt(y[k] as number)}</td>)}
                </tr>
              ))}
              <tr className="border-t border-line"><td className="py-1.5">EBITDA margin</td>{d.plan.years.map((y) => <td key={y.year} className="text-right tabular-nums">{y.ebitdaPct.toFixed(1)}%</td>)}</tr>
              <tr className="border-t border-line"><td className="py-1.5">Break-even revenue</td>{d.plan.years.map((y) => <td key={y.year} className="text-right tabular-nums">{fmt(y.breakEvenRevenue)}</td>)}</tr>
              <tr className="border-t border-line"><td className="py-1.5">Average associate commission / month (₹)</td>{d.plan.years.map((y) => <td key={y.year} className="text-right tabular-nums">{y.associateMonthlyCommission.toLocaleString("en-IN")}</td>)}</tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm">Funding need (lowest cumulative cash): <strong data-testid="funding-need">₹{fmt(d.plan.fundingNeedLakh)} lakh</strong> before contingency.
          Channel contribution at these costs: {d.plan.channels.map((c) => `${c.channel} ${c.contributionPct}%`).join(" · ")}.</p>
      </Card>

      <Card title="Actuals to compare against Year 1">
        <div className="grid gap-4 md:grid-cols-2 text-sm">
          <div>
            <p className="mb-1 font-medium">On the platform (last 12 months)</p>
            <ul className="space-y-1">{d.actuals.platform.map((r) => <li key={r.channel}>{r.channel}: {r.orders} orders · ₹{fmt(r.revenue)} lakh · contribution ₹{fmt(r.contribution)} lakh</li>)}</ul>
            {!d.actuals.platform.length && <p className="text-muted">No orders yet.</p>}
            <p className="mt-1 text-muted">Productive associates: {d.actuals.productiveAssociates}</p>
          </div>
          <div>
            <p className="mb-1 font-medium">HSP history (imported)</p>
            <ul className="space-y-1">{d.actuals.history.map((r) => <li key={r.channel}>{r.channel}: {r.orders} orders over {r.months} months · ₹{fmt(r.revenue)} lakh{r.grossMarginPct != null ? ` · gross margin ${r.grossMarginPct}%` : ""}</li>)}</ul>
            {!d.actuals.history.length && <p className="text-muted">Import the last 12 months of sales (Data imports → sales history).</p>}
          </div>
        </div>
      </Card>

      <Card title="Assumptions" action={canEdit ? (
        <span className="flex gap-2">
          <button className={btnGhost} disabled={reset.isPending} onClick={() => reset.mutate()}>Reset to blueprint</button>
          <button className={btn} disabled={save.isPending} onClick={() => save.mutate({ assumptions: a })}>Save & recalculate</button>
        </span>
      ) : undefined}>
        <ErrorText error={save.error ?? reset.error} />
        <div className="mb-4 grid gap-2 sm:grid-cols-2 md:grid-cols-4">
          {RATES.map(([k, label]) => (
            <label key={k} className="text-xs text-muted">{label}
              <input className={input} type="number" step="0.1" disabled={!canEdit} value={a[k]} onChange={(e) => setA({ ...a, [k]: Number(e.target.value) })} />
            </label>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted"><tr><th className="text-left">Driver</th>{a.years.map((_, i) => <th key={i} className="text-right">Year {i + 1}</th>)}</tr></thead>
            <tbody>
              {DRIVERS.map(([k, label]) => (
                <tr key={k} className="border-t border-line">
                  <td className="py-1">{label}</td>
                  {a.years.map((y, i) => (
                    <td key={i} className="py-1 pl-2"><input aria-label={`${label} year ${i + 1}`} className={`${input} text-right`} type="number" step="any" disabled={!canEdit} value={y[k]} onChange={(e) => setYear(i, k, e.target.value)} /></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-muted">Averages of active participants through each year, not year-end registrations. Working capital is entered directly; the blueprint gives figures but not its method.</p>
      </Card>
    </div>
  );
}
