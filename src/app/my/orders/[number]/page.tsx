import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getOrNull } from "@/lib/api";
import { Badge, btnCls, btnGhostCls, Card, Flash, inputCls, Row } from "@/components/portal/ui";
import { requireUser } from "@/lib/auth/dal";
import { formatINR } from "@/lib/commerce/pricing";
import { payAction, raiseGrievanceAction, uploadArtworkAction } from "../../actions";
import { RazorpayCheckout } from "./RazorpayCheckout";
import { loadSiteData } from "@/lib/siteData.server";

export const metadata: Metadata = { title: "Your order", robots: { index: false } };

export default async function CustomerOrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ number: string }>;
  searchParams: Promise<{ error?: string; ok?: string; pay?: string }>;
}) {
  await loadSiteData();
  const { number } = await params;
  const user = await requireUser(`/my/orders/${number}`);
  const { error, ok, pay } = await searchParams;

  const d = await getOrNull<{
    order: { number: string; status: string; source: string; requiresArtwork: boolean; totalPaise: number; creditedPaise: number;
      paidPaise: number; refundedPaise: number; freightPaise: number; advanceDuePaise: number; shippingAddress: Record<string, string> | null };
    pending: { providerOrderId: string; amountPaise: number } | null;
    razorpayLive: boolean;
    lines: { id: string; name: string; quantity: number; creditedQuantity: number; unitPricePaise: number }[];
    creditNotes: { id?: string; number: string; reason: string; totalPaise: number; refundPaise: number; refundStatus: string; createdAt: Date }[];
    files: { id: string; kind: string; filename: string; reviewStatus: string | null; reviewNote: string | null; createdAt: Date }[];
    grievances: { number: string; category: string; description: string; status: string; resolution: string | null; dueAt: string }[];
    grievanceCategories: string[];
  }>(`/my/orders/${encodeURIComponent(number)}`);
  if (!d) notFound();
  const o = d.order;
  const pending = d.pending;
  const razorpayLive = () => d.razorpayLive;
  const net = o.paidPaise - o.refundedPaise;
  const due = o.totalPaise - o.creditedPaise;
  const advanceOutstanding = o.source === "online" ? 0 : Math.max(0, o.advanceDuePaise - net);
  const balance = due - net;
  const lines = d.lines.map((l) => ({ l, name: l.name }));
  const credits = d.creditNotes;
  const docs = d.files;
  const artwork = docs.filter((d) => d.kind === "artwork");
  const canUploadArtwork = o.requiresArtwork && ["confirmed", "awaiting_artwork"].includes(o.status);

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <h1 className="mb-1 font-serif text-3xl">Order {o.number}</h1>
      <p className="mb-6">
        <Badge testId="customer-order-status">{o.status}</Badge>
      </p>
      <Flash error={error} ok={ok} />
      <Card title="Payment">
        <dl>
          <Row label="Order total (incl. GST)" value={formatINR(o.totalPaise)} testId="customer-total" />
          {o.creditedPaise > 0 && <Row label="Credit notes" value={`− ${formatINR(o.creditedPaise)}`} testId="customer-credited" />}
          <Row label="Paid" value={formatINR(net)} testId="customer-paid" />
          <Row label="Balance" value={formatINR(balance)} testId="customer-balance" />
        </dl>
        {o.status !== "cancelled" && balance > 0 && (
          <div className="mt-4 flex flex-wrap gap-3">
            {advanceOutstanding > 0 && advanceOutstanding < balance && (
              <form action={payAction.bind(null, o.number, "advance")}>
                <button className={btnCls}>Pay advance {formatINR(advanceOutstanding)}</button>
              </form>
            )}
            <form action={payAction.bind(null, o.number, "balance")}>
              <button className={advanceOutstanding > 0 && advanceOutstanding < balance ? btnGhostCls : btnCls}>
                Pay {formatINR(balance)}
              </button>
            </form>
          </div>
        )}
        {pay && pending && (
          <div className="mt-4 rounded-md bg-[var(--color-accent-soft)] p-3 text-sm">
            {razorpayLive() ? (
              <RazorpayCheckout
                keyId={process.env.RAZORPAY_KEY_ID!}
                providerOrderId={pending.providerOrderId!}
                amountPaise={pending.amountPaise}
                orderNumber={o.number}
                email={user.email}
              />
            ) : (
              <p>
                Simulated payment created: <code data-testid="provider-order-id">{pending.providerOrderId}</code> for{" "}
                <span data-testid="pending-amount">{pending.amountPaise}</span> paise. Confirmation arrives by webhook.
              </p>
            )}
          </div>
        )}
        <p className="mt-4 text-xs text-[var(--color-text-muted)]">
          Payments are confirmed only when Razorpay notifies HSP.{" "}
          {o.source === "online"
            ? "Online orders are paid in full when placed."
            : "Custom orders need a 50% advance before production and full payment before dispatch."}
        </p>
      </Card>

      <Card title="Items">
        <ul className="space-y-1 text-sm" data-testid="customer-lines">
          {lines.map(({ l, name }) => (
            <li key={l.id}>
              {name} × {l.quantity} · {formatINR(l.unitPricePaise)} each
              {l.creditedQuantity > 0 && <span className="text-[var(--color-text-muted)]"> · {l.creditedQuantity} credited</span>}
            </li>
          ))}
        </ul>
        {o.freightPaise > 0 && <p className="mt-2 text-xs">Delivery: {formatINR(o.freightPaise)} + GST</p>}
      </Card>

      {credits.length > 0 && (
        <Card title="Credit notes">
          <ul className="space-y-1 text-sm">
            {credits.map((c) => (
              <li key={c.number} data-testid="customer-credit-note">
                {c.number} · {formatINR(c.totalPaise)} · {c.reason}
                {c.refundPaise > 0 && ` · refund ${formatINR(c.refundPaise)} (${c.refundStatus})`}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {o.requiresArtwork && (
        <Card title="Artwork">
          <ul className="mb-3 space-y-1 text-sm">
            {artwork.map((f) => (
              <li key={f.id} data-testid="artwork-row">
                <a className="underline" href={`/api/files/${f.id}`}>{f.filename}</a> · {f.reviewStatus}
                {f.reviewNote ? ` — ${f.reviewNote}` : ""}
              </li>
            ))}
            {artwork.length === 0 && <li>Upload your logo or approved artwork (PDF, PNG, JPEG or WebP, up to 10 MB).</li>}
          </ul>
          {canUploadArtwork && (
            <form action={uploadArtworkAction.bind(null, o.number)} className="flex flex-wrap items-center gap-3">
              <input type="file" name="file" accept=".pdf,.png,.jpg,.jpeg,.webp" aria-label="Artwork file" className="text-sm" />
              <button className={btnGhostCls}>Upload artwork</button>
            </form>
          )}
        </Card>
      )}
      {o.status !== "cancelled" && (
        <Card title="Report a problem">
          {d.grievances.length > 0 && (
            <ul className="mb-4 space-y-2 text-sm" data-testid="customer-grievances">
              {d.grievances.map((g) => (
                <li key={g.number}>
                  {g.number} · {g.category.replaceAll("_", " ")} <Badge tone={["resolved", "closed"].includes(g.status) ? "good" : "warn"}>{g.status.replaceAll("_", " ")}</Badge>
                  <span className="block text-xs text-[var(--color-text-muted)]">
                    {g.resolution ? `Resolution: ${g.resolution}` : `We aim to resolve this by ${new Date(g.dueAt).toLocaleDateString("en-IN")}.`}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <form action={raiseGrievanceAction.bind(null, o.number)} className="space-y-3">
            <select name="category" aria-label="Problem type" className={inputCls} defaultValue="">
              <option value="" disabled>What went wrong?</option>
              {d.grievanceCategories.map((c) => <option key={c} value={c}>{c.replaceAll("_", " ")}</option>)}
            </select>
            <textarea name="description" aria-label="Describe the problem" rows={3} placeholder="Tell us what happened (items, quantities, photos sent on WhatsApp…)" className={inputCls} />
            <button className={btnGhostCls}>Submit complaint</button>
          </form>
        </Card>
      )}
    </main>
  );
}
