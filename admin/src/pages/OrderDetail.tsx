import { useQuery } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, useParams } from "react-router";
import { api, inr, rupeesToPaise, when } from "../api";
import { Badge, btn, btnGhost, Card, ErrorText, input, Loading, useAction } from "../ui";

type Detail = {
  order: {
    number: string; status: string; source: string; requiresArtwork: boolean; subtotalPaise: number; gstPaise: number; freightPaise: number;
    totalPaise: number; paidPaise: number; refundedPaise: number; creditedPaise: number; balancePaise: number; advanceDuePaise: number;
    shippingAddress: Record<string, string> | null; customer: string; customerEmail: string; partner: string | null;
  };
  lines: { id: string; sku: string; name: string; quantity: number; creditedQuantity: number; unitPricePaise: number }[];
  payments: { id: string; providerOrderId: string; amountPaise: number; refundedPaise: number; status: string; createdAt: string }[];
  purchaseOrders: { id: string; number: string; status: string; totalCostPaise: number; supplier: string }[];
  shipments: { id: string; courier: string; trackingNumber: string; city: string | null; dispatchedAt: string; deliveredAt: string | null; deliveryProofUrl: string | null; provider: string | null; trackingStatus: string | null }[];
  files: { id: string; kind: string; filename: string; reviewStatus: string | null; reviewNote: string | null }[];
  creditNotes: { id: string; number: string; reason: string; totalPaise: number; gstPaise: number; refundPaise: number; status: string; refundStatus: string }[];
  recipients: { city: string; recipients: number; units: number }[];
  commission: { status: string; amountPaise: number; deductionsPaise: number }[];
  suppliers: { id: string; name: string; city: string | null }[];
  ranking: { supplierId: string; name: string; cost: number; leadDays: number; stockOk: boolean; score: number }[];
  audit: { createdAt: string; action: string; actorRole: string | null }[];
};

const OPS = ["hsp_admin", "hsp_procurement"];
const FIN = ["hsp_admin", "hsp_finance"];

export default function OrderDetail({ role }: { role: string }) {
  const { number = "" } = useParams();
  const key = ["order", number];
  const q = useQuery({ queryKey: key, queryFn: () => api<Detail>(`/admin/orders/${number}`) });
  if (q.error) return <ErrorText error={q.error} />;
  if (!q.data) return <Loading />;
  const d = q.data;
  const o = d.order;
  const closed = ["dispatched", "delivered", "closed", "cancelled"].includes(o.status);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/orders" className="text-sm text-muted underline">Orders</Link>
        <h1 className="text-xl font-semibold">{o.number}</h1>
        <span data-testid="order-status"><Badge>{o.status}</Badge></span>
        {o.requiresArtwork && <Badge>branded</Badge>}
        <span data-testid="order-source" className="text-sm text-muted">{o.source === "online" ? "Online store" : "Quotation"} · {o.customer}{o.partner ? ` · via ${o.partner}` : ""}</span>
      </div>
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <Card title="Items & money">
            <ul className="divide-y divide-line text-sm">
              {d.lines.map((l) => (
                <li key={l.id} className="flex justify-between gap-3 py-1.5">
                  <span>{l.name} <span className="text-xs text-muted">{l.sku}</span></span>
                  <span className="tabular-nums">×{l.quantity}{l.creditedQuantity > 0 && <span className="text-xs text-muted"> ({l.creditedQuantity} credited)</span>} · {inr(l.unitPricePaise * l.quantity)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm tabular-nums">
              <Dt>Subtotal</Dt><Dd>{inr(o.subtotalPaise)}</Dd>
              <Dt>Freight</Dt><Dd>{inr(o.freightPaise)}</Dd>
              <Dt>GST</Dt><Dd>{inr(o.gstPaise)}</Dd>
              <Dt bold>Total</Dt><Dd bold>{inr(o.totalPaise)}</Dd>
              {o.creditedPaise > 0 && <><Dt>Credit notes</Dt><Dd>− {inr(o.creditedPaise)}</Dd></>}
              {o.source !== "online" && <><Dt>Advance due (50%)</Dt><Dd>{inr(o.advanceDuePaise)}</Dd></>}
              <Dt>Paid (net)</Dt><Dd>{inr(o.paidPaise - o.refundedPaise)}</Dd>
              <Dt bold>Balance</Dt><Dd bold testId="balance">{inr(o.balancePaise)}</Dd>
            </dl>
            <List empty="No payments yet." items={d.payments.map((p) => <><span className="text-xs">{p.providerOrderId} · {inr(p.amountPaise)}{p.refundedPaise > 0 && ` (refunded ${inr(p.refundedPaise)})`} · {when(p.createdAt)}</span><Badge>{p.status}</Badge></>)} />
          </Card>

          {o.requiresArtwork && <ArtworkCard number={o.number} files={d.files.filter((f) => f.kind === "artwork")} canReview={OPS.includes(role)} />}
          <CreditNotesCard d={d} canAct={FIN.includes(role)} />
          {OPS.includes(role) && <RecipientsCard number={o.number} recipients={d.recipients} editable={!closed} />}

          <Card title="Fulfilment">
            <List empty="No purchase order yet." items={[
              ...d.purchaseOrders.map((p) => <><span data-testid="po-row">{p.number} → {p.supplier} · cost {inr(p.totalCostPaise)}</span><Badge>{p.status}</Badge></>),
              ...d.shipments.map((s) => (
                <>
                  <span data-testid="shipment-row">{s.city ? `${s.city}: ` : ""}{s.courier} {s.trackingNumber}{s.trackingStatus && !s.deliveredAt ? <> · <Badge>{s.trackingStatus}</Badge></> : null}</span>
                  <span className="text-xs text-muted">
                    {s.deliveredAt ? <>delivered {when(s.deliveredAt)}{s.deliveryProofUrl?.startsWith("file:") ? <> · <a className="underline" href={`/api/files/${s.deliveryProofUrl.slice(5)}`}>proof</a></> : s.deliveryProofUrl ? ` · ${s.deliveryProofUrl}` : ""}</> : `sent ${when(s.dispatchedAt)}`}
                  </span>
                </>
              )),
              ...d.files.filter((f) => f.kind === "delivery_proof").map((f) => <><a className="underline" href={`/api/files/${f.id}`}>POD: {f.filename}</a><span /></>),
            ]} />
          </Card>
        </div>

        <div className="space-y-6">
          {OPS.includes(role) && <StepsCard d={d} />}
          {o.shippingAddress && (
            <Card title="Ship to">
              <p className="text-sm" data-testid="ship-to">
                {o.shippingAddress.name} · {o.shippingAddress.phone}<br />
                {o.shippingAddress.line1} {o.shippingAddress.line2}<br />
                {o.shippingAddress.city}, {o.shippingAddress.state} {o.shippingAddress.pincode}
              </p>
            </Card>
          )}
          {d.commission[0] && (
            <Card title="Partner commission">
              <p className="text-sm tabular-nums">{inr(d.commission[0].amountPaise - d.commission[0].deductionsPaise)} <Badge>{d.commission[0].status}</Badge></p>
            </Card>
          )}
          <Card title="History">
            <ol className="space-y-1 text-sm">
              {d.audit.map((a, i) => <li key={i}><span className="text-muted">{when(a.createdAt)}</span> · {a.action} <span className="text-xs text-muted">({a.actorRole ?? "system"})</span></li>)}
            </ol>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StepsCard({ d }: { d: Detail }) {
  const o = d.order;
  const step = useAction(`/admin/orders/${o.number}/steps`, [["order", o.number], ["orders"]]);
  const [supplierId, setSupplierId] = useState(d.ranking[0]?.supplierId ?? "");
  // The ranking arrives once production is approved (often after this card mounted); pre-select the best supplier.
  const top = d.ranking[0]?.supplierId;
  useEffect(() => { if (top) setSupplierId((cur) => cur || top); }, [top]);
  const [courier, setCourier] = useState("");
  const [tracking, setTracking] = useState("");
  const [proof, setProof] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const run = (fields: Record<string, string>, ok: string, file?: File | null) => {
    const f = new FormData();
    for (const [k, v] of Object.entries(fields)) f.set(k, v);
    if (file) f.set("proofFile", file, file.name);
    step.run(f, ok);
  };
  const s = o.status;
  return (
    <Card title="Next step" testId="steps">
      <div className="space-y-3">
        {step.feedback}
        {["confirmed", "awaiting_artwork"].includes(s) && (
          <button className={btn} disabled={step.pending} onClick={() => run({ step: "production" }, "Production approved")}>
            {o.requiresArtwork ? "Artwork approved — start production" : "Approve production"}
          </button>
        )}
        {s === "production_approved" && (
          <div className="space-y-2">
            {d.ranking.length > 0 && (
              <ol data-testid="supplier-ranking" className="list-decimal space-y-1 pl-5 text-xs">
                {d.ranking.map((r) => <li key={r.supplierId}>{r.name} · cost {inr(r.cost)} · {r.leadDays}d · {r.stockOk ? "stock ok" : "low stock"} · score {r.score}</li>)}
              </ol>
            )}
            <select aria-label="Supplier" className={input} value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              <option value="">Choose supplier…</option>
              {d.suppliers.map((x) => <option key={x.id} value={x.id}>{x.name}{x.city ? ` (${x.city})` : ""}</option>)}
            </select>
            <button className={btn} disabled={step.pending} onClick={() => run({ step: "po", supplierId }, "Purchase order issued")}>Issue purchase order</button>
          </div>
        )}
        {s === "po_issued" && (
          <div className="space-y-2">
            <button className={btn} disabled={step.pending} onClick={() => run({ step: "book_courier" }, "Courier booked — tracking will update automatically")}>Book courier & dispatch</button>
            <p className="text-xs text-muted">Or record a manual dispatch:</p>
            <input aria-label="Courier" placeholder="Courier" className={input} value={courier} onChange={(e) => setCourier(e.target.value)} />
            <input aria-label="Tracking number" placeholder="Tracking number" className={input} value={tracking} onChange={(e) => setTracking(e.target.value)} />
            <button className={btnGhost} disabled={step.pending} onClick={() => run({ step: "dispatch", courier, tracking }, "Dispatched")}>Mark dispatched</button>
          </div>
        )}
        {s === "dispatched" && (
          <div className="space-y-2">
            <input aria-label="Delivery proof" placeholder="POD reference" className={input} value={proof} onChange={(e) => setProof(e.target.value)} />
            <input aria-label="POD scan" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" className="text-sm" onChange={(e) => setProofFile(e.target.files?.[0] ?? null)} />
            <button className={btn} disabled={step.pending} onClick={() => run({ step: "deliver", proof }, "Marked delivered", proofFile)}>Mark delivered</button>
          </div>
        )}
        {s === "delivered" && <button className={btn} disabled={step.pending} onClick={() => run({ step: "close" }, "Order closed")}>Reconcile & close</button>}
        {!["dispatched", "delivered", "closed", "cancelled"].includes(s) && (
          <button className={btnGhost} disabled={step.pending} onClick={() => confirm(`Cancel ${o.number}?`) && run({ step: "cancel" }, "Order cancelled")}>Cancel order</button>
        )}
        {["closed", "cancelled"].includes(s) && <p className="text-sm text-muted">No further steps.</p>}
      </div>
    </Card>
  );
}

function ArtworkCard({ number, files, canReview }: { number: string; files: Detail["files"]; canReview: boolean }) {
  return (
    <Card title="Artwork sign-off">
      {!files.length && <p className="text-sm text-muted">Waiting for the customer to upload artwork.</p>}
      <ul className="space-y-3 text-sm">{files.map((f) => <ArtworkRow key={f.id} number={number} f={f} canReview={canReview} />)}</ul>
    </Card>
  );
}

function ArtworkRow({ number, f, canReview }: { number: string; f: Detail["files"][number]; canReview: boolean }) {
  const review = useAction(`/admin/files/${f.id}/review`, [["order", number]]);
  const [note, setNote] = useState("");
  return (
    <li data-testid="admin-artwork-row">
      <a className="underline" href={`/api/files/${f.id}`}>{f.filename}</a> · <Badge>{f.reviewStatus ?? "submitted"}</Badge>{f.reviewNote ? ` — ${f.reviewNote}` : ""}
      {review.feedback}
      {f.reviewStatus === "submitted" && canReview && (
        <div className="mt-2 flex flex-wrap gap-2">
          <button className={btn} disabled={review.pending} onClick={() => review.run({ decision: "approved", note: "" }, "Artwork approved")}>Approve artwork & spec</button>
          <input aria-label="Rejection note" placeholder="What needs to change" className={`${input} w-56`} value={note} onChange={(e) => setNote(e.target.value)} />
          <button className={btnGhost} disabled={review.pending} onClick={() => review.run({ decision: "rejected", note }, "Artwork rejected")}>Reject</button>
        </div>
      )}
    </li>
  );
}

function CreditNotesCard({ d, canAct }: { d: Detail; canAct: boolean }) {
  const n = d.order.number;
  const create = useAction(`/admin/orders/${n}/credit-notes`, [["order", n]]);
  const [qty, setQty] = useState<Record<string, string>>({});
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("");
  const [refund, setRefund] = useState("");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const lines = Object.entries(qty).map(([orderLineId, v]) => ({ orderLineId, quantity: Number(v) || 0 })).filter((l) => l.quantity > 0);
    create.run({ reason, lines, valuePaise: lines.length ? null : rupeesToPaise(value) || null, refundPaise: rupeesToPaise(refund) }, "Credit note raised — awaiting second approval");
  };
  return (
    <Card title="Credit notes & refunds">
      <ul className="mb-3 space-y-2 text-sm">
        {d.creditNotes.map((c) => <CreditNoteRow key={c.id} order={n} c={c} canAct={canAct} />)}
      </ul>
      {canAct && d.order.status !== "cancelled" && (
        <form onSubmit={submit} className="space-y-2 text-sm">
          {create.feedback}
          <p className="text-xs text-muted">Returned or short-supplied quantities:</p>
          {d.lines.filter((l) => l.quantity - l.creditedQuantity > 0).map((l) => (
            <label key={l.id} className="flex items-center gap-2">
              <input type="number" min={0} aria-label={`Credit quantity ${l.sku}`} className={`${input} w-20`} value={qty[l.id] ?? "0"} onChange={(e) => setQty({ ...qty, [l.id]: e.target.value })} />
              <span>{l.name} ({l.sku}) — up to {l.quantity - l.creditedQuantity}</span>
            </label>
          ))}
          <input aria-label="Credit value" placeholder="…or a value adjustment, ₹ excl. GST" className={input} value={value} onChange={(e) => setValue(e.target.value)} />
          <input aria-label="Credit reason" placeholder="Reason (returns, damage claim, short supply…)" className={input} value={reason} onChange={(e) => setReason(e.target.value)} />
          <input aria-label="Refund amount" placeholder="Refund to customer, ₹ (optional)" className={input} value={refund} onChange={(e) => setRefund(e.target.value)} />
          <button className={btnGhost} disabled={create.pending}>Raise credit note</button>
        </form>
      )}
    </Card>
  );
}

function CreditNoteRow({ order, c, canAct }: { order: string; c: Detail["creditNotes"][number]; canAct: boolean }) {
  const approve = useAction(`/admin/credit-notes/${c.number}/approve`, [["order", order]]);
  const voidIt = useAction(`/admin/credit-notes/${c.number}/void`, [["order", order]]);
  const retry = useAction(`/admin/credit-notes/${c.number}/retry`, [["order", order]]);
  return (
    <li data-testid="credit-note-row">
      {c.number} · {inr(c.totalPaise)} (GST {inr(c.gstPaise)}) · <Badge>{c.status}</Badge>
      {c.refundPaise > 0 && <> · refund {inr(c.refundPaise)} <span data-testid="refund-status"><Badge>{c.refundStatus}</Badge></span></>}
      <div className="text-xs text-muted">{c.reason}</div>
      {approve.feedback}{voidIt.feedback}{retry.feedback}
      {canAct && c.status === "draft" && (
        <div className="mt-1 flex gap-2">
          <button className={btn} onClick={() => approve.run({}, "Credit note approved")}>Approve credit note</button>
          <button className={btnGhost} onClick={() => voidIt.run({}, "Credit note voided")}>Void</button>
        </div>
      )}
      {canAct && c.refundStatus === "failed" && <button className={`${btnGhost} mt-1`} onClick={() => retry.run({}, "Refund re-requested")}>Retry refund</button>}
    </li>
  );
}

function RecipientsCard({ number, recipients, editable }: { number: string; recipients: Detail["recipients"]; editable: boolean }) {
  const upload = useAction(`/admin/orders/${number}/recipients`, [["order", number]]);
  const [csv, setCsv] = useState("");
  const total = recipients.reduce((a, r) => a + r.recipients, 0);
  return (
    <Card title="Recipients (multi-location delivery)">
      {total > 0 && <p data-testid="recipient-summary" className="mb-2 text-sm">{total} recipients across {recipients.length} cities: {recipients.map((r) => `${r.city} (${r.units})`).join(", ")}</p>}
      {editable && (
        <div className="space-y-2">
          {upload.feedback}
          <input type="file" accept=".csv,text/csv" aria-label="Recipients CSV file" className="text-sm" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setCsv(await f.text()); }} />
          <textarea rows={3} aria-label="Recipients CSV" placeholder="name, phone, address, city, pincode, quantity" className={`${input} font-mono text-xs`} value={csv} onChange={(e) => setCsv(e.target.value)} />
          <button className={btnGhost} disabled={upload.pending || !csv.trim()} onClick={() => upload.run({ csv }, "Recipients uploaded")}>Upload recipients</button>
        </div>
      )}
    </Card>
  );
}

function Dt({ children, bold }: { children: ReactNode; bold?: boolean }) {
  return <dt className={bold ? "font-medium" : "text-muted"}>{children}</dt>;
}
function Dd({ children, bold, testId }: { children: ReactNode; bold?: boolean; testId?: string }) {
  return <dd data-testid={testId} className={`text-right ${bold ? "font-medium" : ""}`}>{children}</dd>;
}
function List({ items, empty }: { items: ReactNode[]; empty: string }) {
  if (!items.length) return <p className="mt-3 text-sm text-muted">{empty}</p>;
  return <ul className="mt-3 divide-y divide-line text-sm">{items.map((x, i) => <li key={i} className="flex flex-wrap items-center justify-between gap-2 py-1.5">{x}</li>)}</ul>;
}
