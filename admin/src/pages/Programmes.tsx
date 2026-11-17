import { useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { api, when } from "../api";
import { Badge, btn, btnGhost, Card, ErrorText, Field, input, Loading, PageTitle, useAction } from "../ui";

type P = { id: string; name: string; occasion: string; nextDate: string; leadDays: number; lines: { sku: string; quantity: number }[]; active: boolean; customer: string; quote: string | null };

export default function Programmes({ role }: { role: string }) {
  const q = useQuery({ queryKey: ["programmes"], queryFn: () => api<P[]>("/admin/programmes") });
  const create = useAction("/admin/programmes", [["programmes"]]);
  const runDue = useAction("/admin/programmes/run", [["programmes"], ["quotes"]]);
  const [f, setF] = useState({ customerName: "", customerEmail: "", name: "", occasion: "", nextDate: "", leadDays: "30", lines: "" });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  return (
    <div className="space-y-6">
      <PageTitle action={role === "hsp_admin" && <button className={btnGhost} onClick={() => runDue.run({}, "Due programmes processed")}>Run due programmes now</button>}>Gifting programmes</PageTitle>
      {runDue.feedback}
      {role === "hsp_admin" && (
        <Card title="Schedule a recurring programme">
          <form className="grid gap-3 md:grid-cols-3" onSubmit={(e: FormEvent) => { e.preventDefault(); create.run({ ...f, leadDays: Number(f.leadDays) || 30 }, "Programme scheduled"); }}>
            <Field label="Customer name"><input className={input} value={f.customerName} onChange={set("customerName")} /></Field>
            <Field label="Customer email"><input className={input} value={f.customerEmail} onChange={set("customerEmail")} /></Field>
            <Field label="Programme name"><input className={input} value={f.name} onChange={set("name")} /></Field>
            <Field label="Occasion"><input className={input} value={f.occasion} onChange={set("occasion")} /></Field>
            <Field label="Next occasion date"><input type="date" className={input} value={f.nextDate} onChange={set("nextDate")} /></Field>
            <Field label="Raise quote this many days before"><input className={input} value={f.leadDays} onChange={set("leadDays")} /></Field>
            <div className="md:col-span-3"><Field label="Lines (SKU, quantity[, , branding])"><textarea rows={3} className={`${input} font-mono text-xs`} value={f.lines} onChange={set("lines")} /></Field></div>
            <div><button className={btn} disabled={create.pending}>Schedule</button></div>
            <div className="md:col-span-3">{create.feedback}</div>
          </form>
        </Card>
      )}
      <ErrorText error={q.error} />
      {!q.data ? <Loading /> : (
        <Card title="Scheduled">
          <ul className="divide-y divide-line text-sm">
            {q.data.map((p) => (
              <li key={p.id} className="py-2">
                {p.name} · {p.customer} · next {when(p.nextDate)} · {p.leadDays}d lead <Badge>{p.active ? "active" : "ended"}</Badge>
                {p.quote && <> · last quote <Link className="underline" to={`/quotes/${p.quote}`}>{p.quote}</Link></>}
                <span className="block text-xs text-muted">{p.lines.map((l) => `${l.sku} × ${l.quantity}`).join(", ")}</span>
              </li>
            ))}
            {!q.data.length && <li className="py-2 text-muted">No programmes yet.</li>}
          </ul>
        </Card>
      )}
    </div>
  );
}
