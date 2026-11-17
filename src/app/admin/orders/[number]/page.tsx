import { notFound } from "next/navigation";
import { PortalShell } from "@/components/portal/PortalShell";
import { ADMIN_NAV, Badge, btnCls, btnGhostCls, Card, Flash, inputCls, Row } from "@/components/portal/ui";
import { getOrNull } from "@/lib/api";
import { requireRole } from "@/lib/auth/dal";
import { STAFF_ROLES } from "@/lib/auth/token";
import { formatINR } from "@/lib/commerce/pricing";
import { creditNoteStepAction, createCreditNoteAction, orderStepAction, reviewArtworkAction, uploadRecipientsAction } from "../../actions";
import { loadSiteData } from "@/lib/siteData.server";

type Detail = {
  order: {
    id: string; number: string; status: string; source: string; requiresArtwork: boolean; totalPaise: number; creditedPaise: number;
    paidPaise: number; refundedPaise: number; advanceDuePaise: number; shippingAddress: Record<string, string> | null;
  };
  payments: { id: string; providerOrderId: string; amountPaise: number; status: string }[];
  purchaseOrders: { id: string; number: string; status: string; totalCostPaise: number; supplier: string }[];
  shipments: { id: string; courier: string; trackingNumber: string; city: string | null; deliveredAt: Date | null; deliveryProofUrl: string | null }[];
  suppliers: { id: string; name: string }[];
  recipients: { city: string; recipients: number; units: number }[];
  lines: { id: string; sku: string; name: string; quantity: number; creditedQuantity: number }[];
  creditNotes: { id: string; number: string; totalPaise: number; gstPaise: number; status: string; refundPaise: number; refundStatus: string; reason: string }[];
  files: { id: string; kind: string; filename: string; reviewStatus: string | null; reviewNote: string | null }[];
  ranking: { supplierId: string; name: string; cost: number; leadDays: number; stockOk: boolean; score: number }[];
};

export default async function AdminOrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ number: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  await loadSiteData();
  const { number } = await params;
  const user = await requireRole(STAFF_ROLES, `/admin/orders/${number}`);
  const flash = await searchParams;

  const d = await getOrNull<Detail>(`/admin/orders/${encodeURIComponent(number)}`);
  if (!d) notFound();
  const { order: o, payments, shipments, suppliers, lines, ranking } = d;
  const pos = d.purchaseOrders.map((po) => ({ po, supplier: po.supplier }));
  const credits = d.creditNotes;
  const docs = d.files;
  const recipientCount = d.recipients.reduce((a, r) => a + r.recipients, 0);
  const cityCounts = d.recipients.map((r) => [r.city, r.units] as const);
  const isFinance = ["hsp_admin", "hsp_finance"].includes(user.role);
  const canReviewArtwork = ["hsp_admin", "hsp_procurement"].includes(user.role);
  const address = o.shippingAddress as null | Record<string, string>;
  const step = orderStepAction.bind(null, o.number);
  const net = o.paidPaise - o.refundedPaise;
  const due = o.totalPaise - o.creditedPaise;

  return (
    <PortalShell title={`Order ${o.number}`} user={user} nav={ADMIN_NAV}>
      <Flash {...flash} />
      <p className="mb-4">
        <Badge testId="order-status">{o.status}</Badge> {o.requiresArtwork && <Badge tone="warn">branded — artwork sign-off</Badge>}
      </p>
      <div className="grid gap-6 md:grid-cols-2">
        <Card title="Money">
          <dl>
            <Row label="Source" value={o.source === "online" ? "Online store (paid in full)" : "Quotation"} testId="order-source" />
            <Row label="Total" value={formatINR(o.totalPaise)} />
            {o.creditedPaise > 0 && <Row label="Credit notes" value={`− ${formatINR(o.creditedPaise)}`} testId="order-credited" />}
            {o.source !== "online" && <Row label="Advance due (50%)" value={formatINR(o.advanceDuePaise)} />}
            <Row label="Paid (net of refunds)" value={formatINR(net)} testId="order-paid" />
            <Row label="Balance" value={formatINR(due - net)} testId="order-balance" />
          </dl>
          <ul className="mt-3 space-y-1 text-xs">
            {payments.map((p) => (
              <li key={p.id}>
                {p.providerOrderId} · {formatINR(p.amountPaise)} · {p.status}
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Next step">
          {(o.status === "confirmed" || o.status === "awaiting_artwork") && (
            <form action={step}>
              <input type="hidden" name="step" value="production" />
              <button className={btnCls}>{o.requiresArtwork ? "Artwork approved — start production" : "Approve production"}</button>
            </form>
          )}
          {o.status === "production_approved" && (
            <form action={step} className="space-y-3">
              <input type="hidden" name="step" value="po" />
              {ranking.length > 0 && (
                <ol data-testid="supplier-ranking" className="list-decimal space-y-1 pl-5 text-xs">
                  {ranking.map((r) => (
                    <li key={r.supplierId}>
                      {r.name} · cost {formatINR(r.cost)} · {r.leadDays}d · {r.stockOk ? "stock ok" : "low stock"} · score {r.score}
                    </li>
                  ))}
                </ol>
              )}
              <select name="supplierId" className={inputCls} aria-label="Supplier" defaultValue={ranking[0]?.supplierId}>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <button className={btnCls}>Issue purchase order</button>
            </form>
          )}
          {o.status === "po_issued" && (
            <form action={step} className="space-y-3">
              <input type="hidden" name="step" value="dispatch" />
              <input name="courier" placeholder="Courier" aria-label="Courier" className={inputCls} />
              <input name="tracking" placeholder="Tracking number" aria-label="Tracking number" className={inputCls} />
              <button className={btnCls}>Mark dispatched</button>
            </form>
          )}
          {o.status === "dispatched" && (
            <form action={step} className="space-y-3">
              <input type="hidden" name="step" value="deliver" />
              <input name="proof" placeholder="POD reference" aria-label="Delivery proof" className={inputCls} />
              <input type="file" name="proofFile" accept=".pdf,.png,.jpg,.jpeg,.webp" aria-label="POD scan" className="text-sm" />
              <button className={btnCls}>Mark delivered</button>
            </form>
          )}
          {o.status === "delivered" && (
            <form action={step}>
              <input type="hidden" name="step" value="close" />
              <button className={btnCls}>Reconcile & close</button>
            </form>
          )}
          {!["dispatched", "delivered", "closed", "cancelled"].includes(o.status) && (
            <form action={step} className="mt-4">
              <input type="hidden" name="step" value="cancel" />
              <button className={btnGhostCls}>Cancel order</button>
            </form>
          )}
        </Card>

        {o.requiresArtwork && (
          <Card title="Artwork sign-off">
            <ul className="space-y-3 text-sm">
              {docs.filter((d) => d.kind === "artwork").map((f) => (
                <li key={f.id} data-testid="admin-artwork-row">
                  <a className="underline" href={`/api/files/${f.id}`}>{f.filename}</a> · <Badge>{f.reviewStatus}</Badge>
                  {f.reviewNote ? ` — ${f.reviewNote}` : ""}
                  {f.reviewStatus === "submitted" && canReviewArtwork && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <form action={reviewArtworkAction.bind(null, o.number, f.id, "approved")}>
                        <button className={btnCls}>Approve artwork & spec</button>
                      </form>
                      <form action={reviewArtworkAction.bind(null, o.number, f.id, "rejected")} className="flex gap-2">
                        <input name="note" placeholder="What needs to change" aria-label="Rejection note" className={inputCls} />
                        <button className={btnGhostCls}>Reject</button>
                      </form>
                    </div>
                  )}
                </li>
              ))}
              {!docs.some((d) => d.kind === "artwork") && <li>Waiting for the customer to upload artwork.</li>}
            </ul>
          </Card>
        )}

        {address && (
          <Card title="Deliver to">
            <p className="text-sm" data-testid="ship-to">
              {address.name} · {address.phone}<br />
              {address.line1} {address.line2}<br />
              {address.city}, {address.state} {address.pincode}
            </p>
          </Card>
        )}

        <Card title="Credit notes & refunds">
          {credits.length > 0 && (
            <ul className="mb-4 space-y-2 text-sm">
              {credits.map((c) => (
                <li key={c.id} data-testid="credit-note-row">
                  {c.number} · {formatINR(c.totalPaise)} (GST {formatINR(c.gstPaise)}) · <Badge>{c.status}</Badge>
                  {c.refundPaise > 0 && <> · refund {formatINR(c.refundPaise)} <Badge testId="refund-status">{c.refundStatus}</Badge></>}
                  <div className="text-xs text-[var(--color-text-muted)]">{c.reason}</div>
                  {isFinance && c.status === "draft" && (
                    <div className="mt-1 flex gap-2">
                      <form action={creditNoteStepAction.bind(null, o.number, c.number, "approve")}>
                        <button className={btnCls}>Approve credit note</button>
                      </form>
                      <form action={creditNoteStepAction.bind(null, o.number, c.number, "void")}>
                        <button className={btnGhostCls}>Void</button>
                      </form>
                    </div>
                  )}
                  {isFinance && c.refundStatus === "failed" && (
                    <form action={creditNoteStepAction.bind(null, o.number, c.number, "retry")} className="mt-1">
                      <button className={btnGhostCls}>Retry refund</button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          )}
          {isFinance && o.status !== "cancelled" && (
            <form action={createCreditNoteAction.bind(null, o.number)} className="space-y-2 text-sm">
              <p className="text-xs">Returned or short-supplied quantities:</p>
              {lines.map((l) =>
                l.quantity - l.creditedQuantity > 0 ? (
                  <label key={l.id} className="flex items-center gap-2">
                    <input type="number" min={0} name={`qty:${l.id}`} defaultValue={0}
                      aria-label={`Credit quantity ${l.sku}`} className={`${inputCls} w-20`} />
                    <span>{l.name} ({l.sku}) — up to {l.quantity - l.creditedQuantity}</span>
                  </label>
                ) : null,
              )}
              <input name="value" placeholder="…or a value adjustment, ₹ excl. GST" aria-label="Credit value" className={inputCls} />
              <input name="reason" placeholder="Reason (returns, damage claim, short supply…)" aria-label="Credit reason" className={inputCls} />
              <input name="refund" placeholder="Refund to customer, ₹ (optional)" aria-label="Refund amount" className={inputCls} />
              <button className={btnGhostCls}>Raise credit note</button>
            </form>
          )}
        </Card>

        <Card title="Recipients (multi-location delivery)">
          {recipientCount > 0 && (
            <p data-testid="recipient-summary" className="mb-2 text-sm">
              {recipientCount} recipients across {cityCounts.length} cities: {cityCounts.map(([c, n]) => `${c} (${n})`).join(", ")}
            </p>
          )}
          {!["dispatched", "delivered", "closed", "cancelled"].includes(o.status) && (
            <form action={uploadRecipientsAction.bind(null, o.number)} className="space-y-2">
              <input type="file" name="file" accept=".csv,text/csv" aria-label="Recipients CSV file" className="text-sm" />
              <textarea
                name="csv"
                rows={3}
                aria-label="Recipients CSV"
                placeholder="name, phone, address, city, pincode, quantity"
                className={`${inputCls} font-mono text-xs`}
              />
              <button className={btnGhostCls}>Upload recipients</button>
            </form>
          )}
        </Card>

        {(pos.length > 0 || shipments.length > 0) && (
          <Card title="Fulfilment">
            <ul className="space-y-1 text-sm">
              {pos.map(({ po, supplier }) => (
                <li key={po.id} data-testid="po-row">
                  {po.number} → {supplier} · cost {formatINR(po.totalCostPaise)} · {po.status}
                </li>
              ))}
              {shipments.map((s) => (
                <li key={s.id} data-testid="shipment-row">
                  {s.city ? `${s.city}: ` : ""}{s.courier} {s.trackingNumber} {s.deliveredAt ? (
                    s.deliveryProofUrl?.startsWith("file:") ? (
                      <> · delivered (<a className="underline" href={`/api/files/${s.deliveryProofUrl.slice(5)}`}>proof</a>)</>
                    ) : `· delivered (${s.deliveryProofUrl})`
                  ) : ""}
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </PortalShell>
  );
}
