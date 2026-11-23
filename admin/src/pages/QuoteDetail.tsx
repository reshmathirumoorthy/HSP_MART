import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useParams } from "react-router";
import { api, inr, pct, when } from "../api";
import { Badge, btn, Card, ErrorText, input, Loading, useAction } from "../ui";

type D = {
  quote: { number: string; status: string; channel: string; subtotalPaise: number; gstPaise: number; freightPaise: number; totalPaise: number;
    commissionPaise: number; contributionBps: number; belowMinimum: boolean; exceptionReason: string | null; validUntil: string; createdBy: string;
    customer: string; customerEmail: string; partner: string | null; orderNumber: string | null };
  lines: { id: string; sku: string; name: string; quantity: number; unitPricePaise: number; unitCostPaise: number | null; gstRateBps: number; branding: { notes?: string } | null }[];
};

export default function QuoteDetail({ role, userId }: { role: string; userId: string }) {
  const { number = "" } = useParams();
  const key = ["quote", number];
  const q = useQuery({ queryKey: key, queryFn: () => api<D>(`/admin/quotes/${number}`) });
  const approve = useAction(`/admin/quotes/${number}/approve-exception`, [key, ["quotes"]]);
  const send = useAction(`/admin/quotes/${number}/send`, [key, ["quotes"]]);
  const [reason, setReason] = useState("");
  if (q.error) return <ErrorText error={q.error} />;
  if (!q.data) return <Loading />;
  const { quote: x, lines } = q.data;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/quotes" className="text-sm text-muted underline">Quotes</Link>
        <h1 className="text-xl font-semibold">{x.number}</h1>
        <span data-testid="quote-status"><Badge>{x.status}</Badge></span>
        {x.belowMinimum && <span data-testid="below-minimum"><Badge>below 12% minimum</Badge></span>}
        {x.orderNumber && <Link className="text-sm underline" to={`/orders/${x.orderNumber}`}>Order {x.orderNumber}</Link>}
      </div>
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card title={`${x.customer} · ${x.customerEmail}`}>
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted"><tr><th className="text-left">Item</th><th className="text-right">Qty</th><th className="text-right">Price</th><th className="text-right">Cost</th></tr></thead>
            <tbody className="divide-y divide-line">
              {lines.map((l) => (
                <tr key={l.id}>
                  <td className="py-1.5">{l.name} <span className="text-xs text-muted">{l.sku}</span>{l.branding?.notes && <span className="block text-xs text-muted">Branding: {l.branding.notes}</span>}</td>
                  <td className="text-right">{l.quantity}</td>
                  <td className="text-right tabular-nums">{inr(l.unitPricePaise)}</td>
                  <td className="text-right tabular-nums">{inr(l.unitCostPaise ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <dl className="mt-3 grid grid-cols-2 gap-1 text-sm tabular-nums">
            <dt className="text-muted">Subtotal</dt><dd className="text-right">{inr(x.subtotalPaise)}</dd>
            <dt className="text-muted">Freight</dt><dd className="text-right">{inr(x.freightPaise)}</dd>
            <dt className="text-muted">GST</dt><dd className="text-right">{inr(x.gstPaise)}</dd>
            <dt className="font-medium">Total</dt><dd className="text-right font-medium">{inr(x.totalPaise)}</dd>
            <dt className="text-muted">Partner commission</dt><dd className="text-right">{inr(x.commissionPaise)}</dd>
            <dt className="text-muted">Contribution</dt><dd className={`text-right ${x.belowMinimum ? "text-bad" : ""}`}>{pct(x.contributionBps)}</dd>
            <dt className="text-muted">Valid until</dt><dd className="text-right">{when(x.validUntil)}</dd>
          </dl>
          {x.exceptionReason && <p className="mt-2 text-xs">Exception: {x.exceptionReason}</p>}
        </Card>
        <div className="space-y-6">
          {x.status === "pending_approval" && ["hsp_admin", "hsp_finance"].includes(role) && (
            <Card title="Approve margin exception">
              <div className="space-y-2">
                {approve.feedback}
                {x.createdBy === userId && <p className="text-xs text-muted">You created this quote; a different admin or finance user must approve it.</p>}
                <textarea rows={3} aria-label="Exception reason" placeholder="Why HSP accepts this margin" className={input} value={reason} onChange={(e) => setReason(e.target.value)} />
                <button className={btn} disabled={approve.pending} onClick={() => approve.run({ reason }, "Exception approved")}>Approve exception</button>
              </div>
            </Card>
          )}
          {x.status === "approved" && role === "hsp_admin" && (
            <Card title="Send to customer">
              {send.feedback}
              <button className={btn} disabled={send.pending} onClick={() => send.run({}, "Quote sent to customer")}>Send to customer</button>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
