import { useMutation, useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { api, inr, pct, rupeesToPaise, when } from "../api";
import { Badge, btn, Card, ErrorText, Field, input, Loading, PageTitle, Table } from "../ui";

type Q = { number: string; status: string; channel: string; totalPaise: number; contributionBps: number; belowMinimum: boolean; validUntil: string; customer: string; partner: string | null };

export default function Quotes({ role }: { role: string }) {
  const q = useQuery({ queryKey: ["quotes"], queryFn: () => api<Q[]>("/admin/quotes") });
  return (
    <div className="space-y-6">
      <PageTitle action={<Link className="text-sm underline" to="/assistant">Draft from a request with the assistant</Link>}>Quotes</PageTitle>
      {role === "hsp_admin" && <NewQuote />}
      <ErrorText error={q.error} />
      {!q.data ? <Loading /> : (
        <Table head={["Quote", "Customer", "Channel", "Status", "Total", "Contribution", "Valid until"]} empty={!q.data.length}>
          {q.data.map((x) => (
            <tr key={x.number}>
              <td className="px-3 py-2"><Link className="underline" to={`/quotes/${x.number}`}>{x.number}</Link></td>
              <td className="px-3">{x.customer}{x.partner && <span className="text-xs text-muted"> · {x.partner}</span>}</td>
              <td className="px-3">{x.channel}</td><td className="px-3"><Badge>{x.status}</Badge></td>
              <td className="px-3 text-right tabular-nums">{inr(x.totalPaise)}</td>
              <td className={`px-3 text-right tabular-nums ${x.belowMinimum ? "text-bad" : ""}`}>{pct(x.contributionBps)}</td>
              <td className="whitespace-nowrap px-3">{when(x.validUntil)}</td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}

function NewQuote() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [f, setF] = useState({ customerName: "", customerEmail: "", kind: "organisation", gstin: "", lines: params.get("lines") ?? "", freight: "" });
  const m = useMutation({
    mutationFn: () => api<{ number: string }>("/admin/quotes", { ...f, freightPaise: rupeesToPaise(f.freight) }),
    onSuccess: (r) => nav(`/quotes/${r.number}`),
  });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  return (
    <Card title="New quote">
      <form onSubmit={(e: FormEvent) => { e.preventDefault(); m.mutate(); }} className="grid gap-3 md:grid-cols-2">
        <Field label="Customer name"><input className={input} value={f.customerName} onChange={set("customerName")} required /></Field>
        <Field label="Customer email"><input className={input} type="email" value={f.customerEmail} onChange={set("customerEmail")} required /></Field>
        <Field label="Customer type">
          <select className={input} value={f.kind} onChange={set("kind")}><option value="organisation">Organisation</option><option value="individual">Individual</option></select>
        </Field>
        <Field label="GSTIN (optional)"><input className={input} value={f.gstin} onChange={set("gstin")} /></Field>
        <div className="md:col-span-2">
          <Field label="Lines — one per line: SKU, quantity[, unit price ₹][, branding notes]">
            <textarea rows={4} className={`${input} font-mono text-xs`} value={f.lines} onChange={set("lines")} required />
          </Field>
        </div>
        <Field label="Freight ₹ (excl. GST)"><input className={input} value={f.freight} onChange={set("freight")} /></Field>
        <div className="flex items-end"><button className={btn} disabled={m.isPending}>Create quote</button></div>
        <div className="md:col-span-2"><ErrorText error={m.error} /></div>
      </form>
    </Card>
  );
}
