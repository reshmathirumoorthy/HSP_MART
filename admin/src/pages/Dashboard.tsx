import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { api, when } from "../api";
import { Card, ErrorText, Loading, PageTitle, Table } from "../ui";

type Row = { n: number } & Record<string, string | number>;
type D = { divisions: Row[]; roles: Row[]; orders: Row[]; enquiries: number; events: { id: string; createdAt: string; action: string; actorRole: string | null; entity: string }[] };

export default function Dashboard() {
  const q = useQuery({ queryKey: ["dashboard"], queryFn: () => api<D>("/admin/dashboard") });
  if (q.error) return <ErrorText error={q.error} />;
  if (!q.data) return <Loading />;
  const d = q.data;
  return (
    <div className="space-y-6">
      <PageTitle>Overview</PageTitle>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
        <Stat label="Products" value={d.divisions.reduce((a, x) => a + x.n, 0)} />
        {d.divisions.map((x) => <Stat key={x.division} label={String(x.division)} value={x.n} />)}
      </div>
      {d.enquiries > 0 && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-warn">
          {d.enquiries} new storefront {d.enquiries === 1 ? "enquiry" : "enquiries"} waiting. <Link className="underline" to="/enquiries">Open enquiries</Link>
        </p>
      )}
      <div className="grid gap-6 md:grid-cols-[1fr_2fr]">
        <div className="space-y-6">
          <Card title="Orders by status"><Counts rows={d.orders} k="status" /></Card>
          <Card title="Users by role"><Counts rows={d.roles} k="role" /></Card>
        </div>
        <Card title="Recent audit events">
          <Table head={["When", "Action", "Actor", "Entity"]} empty={!d.events.length}>
            {d.events.map((e) => (
              <tr key={e.id}><td className="whitespace-nowrap px-3 py-1.5">{when(e.createdAt)}</td><td className="px-3">{e.action}</td><td className="px-3">{e.actorRole ?? "system"}</td><td className="px-3">{e.entity}</td></tr>
            ))}
          </Table>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div className="rounded-lg border border-line bg-white p-3"><p className="text-xs text-muted">{label}</p><p className="text-xl font-semibold tabular-nums">{value}</p></div>;
}

function Counts({ rows, k }: { rows: Row[]; k: string }) {
  if (!rows.length) return <p className="text-sm text-muted">None yet.</p>;
  return <ul className="divide-y divide-line text-sm">{rows.map((r) => <li key={String(r[k])} className="flex justify-between py-1.5"><span>{String(r[k]).replaceAll("_", " ")}</span><span className="tabular-nums">{r.n}</span></li>)}</ul>;
}
