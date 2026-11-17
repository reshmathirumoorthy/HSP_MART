import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router";
import { api, inr, when } from "../api";
import { Badge, ErrorText, input, Loading, PageTitle, Table } from "../ui";

type O = { number: string; status: string; source: string; totalPaise: number; paidPaise: number; refundedPaise: number; creditedPaise: number; createdAt: string; customer: string; partner: string | null };
const STATUSES = ["", "awaiting_artwork", "confirmed", "production_approved", "po_issued", "dispatched", "delivered", "closed", "cancelled"];

export default function Orders() {
  const [status, setStatus] = useState("");
  const q = useQuery({ queryKey: ["orders", status], queryFn: () => api<O[]>(`/admin/orders${status ? `?status=${status}` : ""}`) });
  return (
    <div className="space-y-4">
      <PageTitle action={
        <select aria-label="Status" className={`${input} w-auto`} value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUSES.map((s) => <option key={s} value={s}>{s ? s.replaceAll("_", " ") : "All statuses"}</option>)}
        </select>
      }>Orders</PageTitle>
      <ErrorText error={q.error} />
      {!q.data ? <Loading /> : (
        <Table testId="orders-table" head={["Order", "Customer", "Status", "Source", "Total", "Due", "Created"]} empty={!q.data.length}>
          {q.data.map((o) => (
            <tr key={o.number}>
              <td className="px-3 py-2"><Link className="underline" to={`/orders/${o.number}`}>{o.number}</Link></td>
              <td className="px-3">{o.customer}{o.partner && <span className="text-xs text-muted"> · {o.partner}</span>}</td>
              <td className="px-3"><Badge>{o.status}</Badge></td>
              <td className="px-3">{o.source}</td>
              <td className="px-3 text-right tabular-nums">{inr(o.totalPaise)}</td>
              <td className="px-3 text-right tabular-nums">{inr(o.totalPaise - o.creditedPaise - (o.paidPaise - o.refundedPaise))}</td>
              <td className="whitespace-nowrap px-3">{when(o.createdAt)}</td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
