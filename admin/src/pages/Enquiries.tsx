import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { api, when } from "../api";
import { Badge, btn, btnGhost, ErrorText, input, Loading, PageTitle, useAction } from "../ui";

type E = {
  id: string; number: string; kind: "bulk_quote" | "contact"; status: string; name: string; email: string; phone: string | null;
  organization: string | null; subject: string | null; message: string | null; createdAt: string; quoteNumber: string | null;
  lines: { sku: string; name: string; quantity: number; notes: string }[] | null;
  details: { orderType?: string; expectedDelivery?: string; branding?: string; brandName?: string; customizationNotes?: string; address?: Record<string, string> } | null;
};

export default function Enquiries({ role }: { role: string }) {
  const [status, setStatus] = useState("new");
  const q = useQuery({ queryKey: ["enquiries", status], queryFn: () => api<E[]>(`/admin/enquiries${status ? `?status=${status}` : ""}`) });
  return (
    <div className="space-y-4">
      <PageTitle action={
        <select aria-label="Status" className={`${input} w-auto`} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="new">New</option><option value="in_review">In review</option><option value="quoted">Quoted</option><option value="closed">Closed</option><option value="">All</option>
        </select>
      }>Storefront enquiries</PageTitle>
      <p className="text-sm text-muted">Bulk quote requests and contact messages from hspmart.com. Turn a bulk request into a priced quote, then review and send it.</p>
      <ErrorText error={q.error} />
      {!q.data ? <Loading /> : q.data.length === 0 ? <p className="text-sm text-muted">Nothing here.</p> : (
        <div className="space-y-3">{q.data.map((e) => <EnquiryCard key={e.id} e={e} role={role} />)}</div>
      )}
    </div>
  );
}

function EnquiryCard({ e, role }: { e: E; role: string }) {
  const nav = useNavigate();
  const qc = useQueryClient();
  const status = useAction(`/admin/enquiries/${e.id}/status`, [["enquiries"], ["dashboard"]]);
  const quote = useMutation({
    mutationFn: () => api<{ quote: string }>(`/admin/enquiries/${e.id}/quote`, {}),
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: ["enquiries"] }); nav(`/quotes/${r.quote}`); },
  });
  const d = e.details ?? {};
  return (
    <section data-testid={`enquiry-${e.number}`} className="rounded-lg border border-line bg-white p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium">{e.number} · {e.kind === "bulk_quote" ? "Bulk quote" : "Contact"} <Badge>{e.status}</Badge></p>
        <span className="text-xs text-muted">{when(e.createdAt)}</span>
      </div>
      <p className="mt-1">{e.name}{e.organization ? ` · ${e.organization}` : ""} · <a className="underline" href={`mailto:${e.email}`}>{e.email}</a>{e.phone ? ` · ${e.phone}` : ""}</p>
      {e.subject && <p className="mt-1 text-muted">{e.subject}</p>}
      {e.lines && (
        <ul className="mt-2 list-disc pl-5">
          {e.lines.map((l, i) => <li key={i}>{l.sku} {l.name} × {l.quantity}{l.notes ? ` — ${l.notes}` : ""}</li>)}
        </ul>
      )}
      {(d.orderType || d.expectedDelivery || d.branding === "yes") && (
        <p className="mt-2 text-xs text-muted">
          {[d.orderType, d.expectedDelivery && `deliver by ${d.expectedDelivery}`, d.branding === "yes" && `branding: ${d.brandName || "yes"}`, d.customizationNotes].filter(Boolean).join(" · ")}
        </p>
      )}
      {e.message && <p className="mt-2 whitespace-pre-line">{e.message}</p>}
      {status.feedback}<ErrorText error={quote.error} />
      <div className="mt-3 flex flex-wrap gap-2">
        {e.quoteNumber && <Link className={btnGhost} to={`/quotes/${e.quoteNumber}`}>Quote {e.quoteNumber}</Link>}
        {e.kind === "bulk_quote" && !e.quoteNumber && role === "hsp_admin" && <button className={btn} disabled={quote.isPending} onClick={() => quote.mutate()}>Create priced quote</button>}
        {e.status === "new" && <button className={btnGhost} onClick={() => status.run({ status: "in_review" }, "Marked in review")}>Mark in review</button>}
        {e.status !== "closed" && <button className={btnGhost} onClick={() => status.run({ status: "closed" }, "Enquiry closed")}>Close</button>}
      </div>
    </section>
  );
}
