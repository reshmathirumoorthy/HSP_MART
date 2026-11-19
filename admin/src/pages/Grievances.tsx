import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router";
import { api, when } from "../api";
import { Badge, btn, btnGhost, ErrorText, input, Loading, PageTitle, useAction } from "../ui";

type G = {
  id: string; number: string; category: string; description: string; status: string; raisedByRole: string; supplierNote: string | null;
  resolution: string | null; dueAt: string; overdue: boolean; createdAt: string; orderNumber: string; supplierName: string | null;
  creditNote: string | null; suppliers: { id: string; name: string }[];
};
const KEY = [["grievances"], ["insights"]];

export default function Grievances({ role }: { role: string }) {
  const [status, setStatus] = useState("active");
  const [notice, setNotice] = useState<string | null>(null);
  const q = useQuery({ queryKey: ["grievances", status], queryFn: () => api<G[]>(`/admin/grievances${status ? `?status=${status}` : ""}`) });
  return (
    <div className="space-y-4">
      <PageTitle action={
        <select aria-label="Status" className={`${input} w-auto`} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="active">Active</option><option value="open">Open</option><option value="with_supplier">With supplier</option><option value="resolved">Resolved</option><option value="closed">Closed</option><option value="">All</option>
        </select>
      }>Customer complaints</PageTitle>
      <p className="text-sm text-muted">HSP is accountable for every complaint. Route supply defects to the supplier on the order, then record the resolution (link a credit note if money was returned). Target: resolved within 3 days.</p>
      <ErrorText error={q.error} />
      {notice && <p role="status" data-testid="grievance-notice" className="rounded-md bg-green-50 px-3 py-2 text-sm text-good">{notice}</p>}
      {!q.data ? <Loading /> : q.data.length === 0 ? <p className="text-sm text-muted">Nothing here.</p> : (
        <div className="space-y-3">{q.data.map((g) => <Row key={g.id} g={g} role={role} onNotice={setNotice} />)}</div>
      )}
    </div>
  );
}

function Row({ g, role, onNotice }: { g: G; role: string; onNotice: (m: string) => void }) {
  const qc = useQueryClient();
  const assign = useAction(`/admin/grievances/${g.number}/assign`, KEY);
  // Resolving moves the complaint out of the active list, so confirm at page level.
  const resolve = useMutation({
    mutationFn: (body: unknown) => api(`/admin/grievances/${g.number}/resolve`, body),
    onSuccess: () => { onNotice(`${g.number} resolved — customer notified`); KEY.forEach((queryKey) => qc.invalidateQueries({ queryKey })); },
  });
  const close = useAction(`/admin/grievances/${g.number}/close`, KEY);
  const [supplierId, setSupplierId] = useState(g.suppliers[0]?.id ?? "");
  const [resolution, setResolution] = useState("");
  const [creditNote, setCreditNote] = useState("");
  const live = ["open", "with_supplier"].includes(g.status);
  return (
    <section data-testid={`grievance-${g.number}`} className="rounded-lg border border-line bg-white p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium">{g.number} · {g.category.replaceAll("_", " ")} · order <Link className="underline" to={`/orders/${g.orderNumber}`}>{g.orderNumber}</Link> <Badge>{g.status}</Badge> {g.overdue && <Badge>overdue</Badge>}</p>
        <span className="text-xs text-muted">raised by {g.raisedByRole} · {when(g.createdAt)} · due {when(g.dueAt)}</span>
      </div>
      <p className="mt-2 whitespace-pre-line">{g.description}</p>
      {g.supplierName && <p className="mt-1 text-xs text-muted">Supplier: {g.supplierName}{g.supplierNote ? ` — “${g.supplierNote}”` : " (awaiting response)"}</p>}
      {g.resolution && <p className="mt-1 text-xs">Resolution: {g.resolution}{g.creditNote ? ` · credit note ${g.creditNote}` : ""}</p>}
      {assign.feedback}<ErrorText error={resolve.error} />{close.feedback}
      {live && (
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {["hsp_admin", "hsp_procurement"].includes(role) && (
            <div className="flex gap-2">
              <select aria-label="Supplier" className={input} value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                {g.suppliers.length === 0 && <option value="">No supplier on this order</option>}
                {g.suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <button className={btnGhost} disabled={!supplierId} onClick={() => assign.run({ supplierId }, "Sent to supplier")}>Send to supplier</button>
            </div>
          )}
          <div className="flex gap-2 md:col-span-2">
            <input aria-label="Resolution" placeholder="Resolution (what HSP did)" className={input} value={resolution} onChange={(e) => setResolution(e.target.value)} />
            <input aria-label="Credit note" placeholder="Credit note no. (optional)" className={`${input} w-48`} value={creditNote} onChange={(e) => setCreditNote(e.target.value)} />
            <button className={btn} disabled={resolve.isPending} onClick={() => resolve.mutate({ resolution, creditNote })}>Resolve</button>
          </div>
        </div>
      )}
      {g.status === "resolved" && <button className={`${btnGhost} mt-3`} onClick={() => close.run({}, "Complaint closed")}>Close</button>}
    </section>
  );
}
