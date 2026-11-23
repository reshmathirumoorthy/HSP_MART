import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api, inr, when } from "../api";
import { Badge, btnGhost, Card, ErrorText, ExportLink, Loading, PageTitle, useAction } from "../ui";

type D = {
  tdsBps: number;
  due: { partnerId: string; code: string; amountPaise: number }[];
  payouts: { id: string; code: string; grossPaise: number; tdsPaise: number; netPaise: number; bankDestination: string; transferReference: string | null; status: string; requestedBy: string; createdAt: string }[];
};
const KEY = [["payouts"], ["partners"]];

export default function Payouts({ role, userId }: { role: string; userId: string }) {
  const [notice, setNotice] = useState<string | null>(null);
  const q = useQuery({ queryKey: ["payouts"], queryFn: () => api<D>("/admin/payouts") });
  if (q.error) return <ErrorText error={q.error} />;
  if (!q.data) return <Loading />;
  const d = q.data;
  const finance = ["hsp_admin", "hsp_finance"].includes(role);
  return (
    <div className="space-y-6">
      <PageTitle>Partner payouts</PageTitle>
      {notice && <p role="status" className="rounded-md bg-green-50 px-3 py-2 text-sm text-good">{notice}</p>}
      <p className="text-sm text-muted">TDS withheld at {(d.tdsBps / 100).toFixed(2)}% (confirm against the Income-tax Act, 2025 s.393). Payouts need a second finance/admin approver.</p>
      <div className="flex flex-wrap gap-2">
        <ExportLink kind="payouts">Payouts CSV</ExportLink>
        <ExportLink kind="commissions">Commission ledger CSV</ExportLink>
        <ExportLink kind="sales">Sales register CSV</ExportLink>
        <ExportLink kind="credit_notes">Credit notes CSV</ExportLink>
        {finance && <ExportLink kind="tally">Tally vouchers (XML)</ExportLink>}
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Card title="Approved commission due">
          <ul className="divide-y divide-line text-sm">
            {d.due.map((x) => <DueRow key={x.partnerId} x={x} canRaise={finance} onRaised={setNotice} />)}
            {!d.due.length && <li className="py-2 text-muted">Nothing due.</li>}
          </ul>
        </Card>
        <Card title="Payouts">
          <ul data-testid="payout-list" className="divide-y divide-line text-sm">
            {d.payouts.map((p) => <PayoutRow key={p.id} p={p} canApprove={finance && p.requestedBy !== userId} />)}
            {!d.payouts.length && <li className="py-2 text-muted">No payouts yet.</li>}
          </ul>
        </Card>
      </div>
    </div>
  );
}

function DueRow({ x, canRaise, onRaised }: { x: D["due"][number]; canRaise: boolean; onRaised: (m: string) => void }) {
  const qc = useQueryClient();
  // Raising moves the partner out of "due", so the confirmation is shown at page level.
  const raise = useMutation({
    mutationFn: () => api(`/admin/partners/${x.partnerId}/payouts`, {}),
    onSuccess: () => { onRaised(`Payout raised for ${x.code} — awaiting second approval`); KEY.forEach((queryKey) => qc.invalidateQueries({ queryKey })); },
  });
  return (
    <li data-testid={`due-${x.code}`} className="py-2">
      <div className="flex items-center justify-between gap-2">
        <span>{x.code} · {inr(x.amountPaise)}</span>
        {canRaise && <button className={btnGhost} disabled={raise.isPending} onClick={() => raise.mutate()}>Raise payout</button>}
      </div>
      <ErrorText error={raise.error} />
    </li>
  );
}

function PayoutRow({ p, canApprove }: { p: D["payouts"][number]; canApprove: boolean }) {
  const approve = useAction(`/admin/payouts/${p.id}/approve`, KEY);
  return (
    <li className="py-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="tabular-nums">{p.code} · gross {inr(p.grossPaise)} · TDS {inr(p.tdsPaise)} · net {inr(p.netPaise)} · {p.bankDestination} {p.transferReference && <code className="text-xs">{p.transferReference}</code>}<span className="block text-xs text-muted">{when(p.createdAt)}</span></span>
        <span className="flex items-center gap-2">
          <Badge>{p.status}</Badge>
          {p.status === "requested" && canApprove && <button className={btnGhost} onClick={() => approve.run({}, "Payout approved and transferred")}>Approve & transfer</button>}
          {p.status === "requested" && !canApprove && <span className="text-xs text-muted">needs another approver</span>}
        </span>
      </div>
      {approve.feedback}
    </li>
  );
}
