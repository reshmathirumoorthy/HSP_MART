import { useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { api, inr, pct } from "../api";
import { btn, Card, ErrorText, input, Loading, PageTitle } from "../ui";

type Draft = {
  understood: { quantity: number | null; budgetRupees: number | null; deadlineDays: number | null; branding: boolean };
  suggestions: { id: string; sku: string; name: string; pricePaise: number; reason: string }[];
  preview: { subtotalPaise: number; gstPaise: number; totalPaise: number; contributionBps: number } | null;
  linesText: string;
};

export default function Assistant() {
  const [text, setText] = useState("");
  const [asked, setAsked] = useState("");
  const q = useQuery({ queryKey: ["assistant", asked], queryFn: () => api<Draft>(`/admin/assistant?q=${encodeURIComponent(asked)}`), enabled: !!asked });
  return (
    <div className="space-y-6">
      <PageTitle>Quotation assistant</PageTitle>
      <form onSubmit={(e: FormEvent) => { e.preventDefault(); setAsked(text.trim()); }} className="flex flex-wrap gap-2">
        <input aria-label="Customer request" className={`${input} flex-1`} placeholder="e.g. 200 Diwali hampers under ₹1500 with logo in 20 days" value={text} onChange={(e) => setText(e.target.value)} />
        <button className={btn}>Draft</button>
      </form>
      <ErrorText error={q.error} />
      {q.isFetching && <Loading />}
      {q.data && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card title="Understood" testId="understood">
            <ul className="space-y-1 text-sm">
              <li>Quantity: {q.data.understood.quantity ?? "—"}</li>
              <li>Budget per unit: {q.data.understood.budgetRupees ? `₹${q.data.understood.budgetRupees}` : "—"}</li>
              <li>Deadline: {q.data.understood.deadlineDays ? `${q.data.understood.deadlineDays} days` : "—"}</li>
              <li>Branding: {q.data.understood.branding ? "Yes — artwork approval required" : "No"}</li>
            </ul>
            <h3 className="mt-4 text-sm font-medium">Suggestions (approved catalogue only)</h3>
            <ul className="mt-1 space-y-2 text-sm">
              {q.data.suggestions.map((s) => <li key={s.id}><strong>{s.sku}</strong> {s.name} · {inr(s.pricePaise)}<span className="block text-xs text-muted">{s.reason}</span></li>)}
              {!q.data.suggestions.length && <li>No approved product fits — widen the budget or deadline.</li>}
            </ul>
          </Card>
          {q.data.preview && (
            <Card title="Draft (not saved)">
              <dl className="grid grid-cols-2 gap-1 text-sm tabular-nums">
                <dt className="text-muted">Subtotal</dt><dd className="text-right">{inr(q.data.preview.subtotalPaise)}</dd>
                <dt className="text-muted">GST</dt><dd className="text-right">{inr(q.data.preview.gstPaise)}</dd>
                <dt className="font-medium">Total</dt><dd className="text-right font-medium">{inr(q.data.preview.totalPaise)}</dd>
                <dt className="text-muted">Contribution</dt><dd className="text-right">{pct(q.data.preview.contributionBps)}</dd>
              </dl>
              <pre className="mt-3 rounded bg-stone-100 p-2 text-xs">{q.data.linesText}</pre>
              <Link className={`${btn} mt-3`} to={`/quotes?lines=${encodeURIComponent(q.data.linesText)}`}>Open as a new quote</Link>
              <p className="mt-2 text-xs text-muted">The assistant only drafts. The pricing engine recomputes prices, GST and margin when a person creates the quote.</p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
