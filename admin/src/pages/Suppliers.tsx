import { useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { api, inr, rupeesToPaise } from "../api";
import { Badge, btn, btnGhost, Card, ErrorText, input, Loading, useAction } from "../ui";

type S = { id: string; name: string; city: string | null; gstin: string | null; status: string; loginEmail: string | null; rates: { sku: string; name: string; costPaise: number; leadTimeDays: number; stockQuantity: number | null }[] };

export default function Suppliers() {
  const q = useQuery({ queryKey: ["suppliers"], queryFn: () => api<S[]>("/admin/suppliers") });
  const create = useAction("/admin/suppliers", [["suppliers"]]);
  const [form, setForm] = useState({ name: "", city: "", gstin: "", loginEmail: "" });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    create.run(form, "Supplier added");
    setForm({ name: "", city: "", gstin: "", loginEmail: "" });
  };
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Suppliers</h1>
      <Card title="Add supplier">
        <form onSubmit={submit} className="grid gap-2 md:grid-cols-5">
          {(["name", "city", "gstin", "loginEmail"] as const).map((k) => (
            <input key={k} aria-label={{ name: "Supplier name", city: "City", gstin: "GSTIN", loginEmail: "Supplier login email" }[k]} placeholder={{ name: "Name", city: "City", gstin: "GSTIN", loginEmail: "Login email (optional)" }[k]}
              className={input} value={form[k]} required={k === "name"} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
          ))}
          <button className={btn} disabled={create.pending}>Add (pending approval)</button>
        </form>
        <div className="mt-2">{create.feedback}</div>
      </Card>
      <ErrorText error={q.error} />
      {!q.data ? <Loading /> : q.data.map((s) => <SupplierCard key={s.id} s={s} />)}
    </div>
  );
}

function SupplierCard({ s }: { s: S }) {
  const status = useAction(`/admin/suppliers/${s.id}/status`, [["suppliers"]]);
  const rate = useAction(`/admin/suppliers/${s.id}/rates`, [["suppliers"]]);
  const [sku, setSku] = useState("");
  const [cost, setCost] = useState("");
  const [lead, setLead] = useState("7");
  return (
    <section data-testid={`supplier-${s.name}`} className="rounded-lg border border-line bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium">{s.name} <span className="text-sm text-muted">{[s.city, s.gstin, s.loginEmail].filter(Boolean).join(" · ")}</span></p>
        <span className="flex items-center gap-2">
          <Badge>{s.status}</Badge>
          {s.status !== "approved" && <button className={btnGhost} onClick={() => status.run({ status: "approved" }, "Supplier approved")}>Approve</button>}
          {s.status === "approved" && <button className={btnGhost} onClick={() => status.run({ status: "suspended" }, "Supplier suspended")}>Suspend</button>}
        </span>
      </div>
      {status.feedback}
      {s.rates.length > 0 && (
        <ul className="mt-2 text-sm text-muted">
          {s.rates.map((r) => <li key={r.sku}>{r.sku} {r.name} · {inr(r.costPaise)} · {r.leadTimeDays}d{r.stockQuantity != null && ` · stock ${r.stockQuantity}`}</li>)}
        </ul>
      )}
      <form className="mt-3 flex flex-wrap gap-2" onSubmit={(e) => {
        e.preventDefault();
        rate.run({ sku, costPaise: rupeesToPaise(cost), leadTimeDays: Number(lead) || 7 }, "Rate saved");
      }}>
        <input aria-label="Rate SKU" placeholder="SKU" className={`${input} w-36`} value={sku} onChange={(e) => setSku(e.target.value)} required />
        <input aria-label="Rate cost" placeholder="Cost ₹" type="number" step="0.01" min="0.01" className={`${input} w-28`} value={cost} onChange={(e) => setCost(e.target.value)} required />
        <input aria-label="Lead time" type="number" min="1" className={`${input} w-20`} value={lead} onChange={(e) => setLead(e.target.value)} />
        <button className={btnGhost} disabled={rate.pending}>Save rate</button>
      </form>
      <div className="mt-2">{rate.feedback}</div>
    </section>
  );
}
