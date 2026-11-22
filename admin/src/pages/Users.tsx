import { useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { api, when } from "../api";
import { Badge, btn, btnGhost, Card, ErrorText, Field, input, Loading, PageTitle, Table, useAction } from "../ui";

type U = { id: string; email: string | null; phone: string | null; name: string | null; role: string; active: boolean;
  createdAt: string; lastSignIn: string | null };
type D = { users: U[]; total: number; page: number; pageSize: number };
const STAFF = [["hsp_admin", "Admin"], ["hsp_finance", "Finance"], ["hsp_procurement", "Procurement"]] as const;
const KEY = [["users"]];

export default function Users({ userId }: { userId: string }) {
  const [q, setQ] = useState("");
  const [role, setRole] = useState("staff");
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ["users", q, role, page],
    queryFn: () => api<D>(`/admin/users?${new URLSearchParams({ q, role, page: String(page) })}`),
  });
  const d = query.data;
  const pages = d ? Math.max(1, Math.ceil(d.total / d.pageSize)) : 1;
  return (
    <div className="space-y-6">
      <PageTitle>Staff & roles</PageTitle>
      <p className="text-sm text-muted">Add HSP staff and set what they can do. Partner and supplier access is granted from the Partners and Suppliers pages. Changing someone's role or deactivating them signs them out immediately.</p>
      <AddStaff />
      <div className="flex flex-wrap gap-2">
        <input aria-label="Search users" placeholder="Search name, email or phone" className={`${input} max-w-xs`} value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        <select aria-label="Role filter" className={`${input} w-auto`} value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }}>
          <option value="staff">All staff</option>
          {STAFF.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          <option value="customer">Customers</option><option value="associate">Associates</option>
          <option value="franchise">Franchises</option><option value="supplier">Suppliers</option><option value="">Everyone</option>
        </select>
      </div>
      <ErrorText error={query.error} />
      {!d ? <Loading /> : (
        <>
          <Table head={["Person", "Role", "Status", "Last sign-in", ""]} empty={!d.users.length} testId="users-table">
            {d.users.map((u) => <Row key={u.id} u={u} self={u.id === userId} />)}
          </Table>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted" data-testid="users-count">{d.total} {d.total === 1 ? "person" : "people"}</span>
            <span className="flex items-center gap-2">
              <button className={btnGhost} disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
              <span>Page {page} of {pages}</span>
              <button className={btnGhost} disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button>
            </span>
          </div>
        </>
      )}
    </div>
  );
}

function Row({ u, self }: { u: U; self: boolean }) {
  const update = useAction(`/admin/users/${u.id}`, KEY);
  const staff = STAFF.some(([v]) => v === u.role);
  const change = (body: { role?: string; active?: boolean }, question: string, ok: string) => {
    if (window.confirm(question)) update.run(body, ok);
  };
  return (
    <tr data-testid={`user-${u.email ?? u.phone}`}>
      <td className="px-3 py-2">{u.name || "—"}<div className="text-xs text-muted">{u.email ?? u.phone}</div>{update.feedback}</td>
      <td className="px-3">
        {staff && !self ? (
          <select aria-label={`Role for ${u.email ?? u.phone}`} className={`${input} w-auto`} value={u.role}
            onChange={(e) => change({ role: e.target.value }, `Change ${u.email ?? u.phone} to ${e.target.value.replace("hsp_", "")}? They will be signed out.`, "Role changed")}>
            {STAFF.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        ) : <Badge>{u.role}</Badge>}
      </td>
      <td className="px-3"><Badge>{u.active ? "active" : "suspended"}</Badge></td>
      <td className="px-3 text-xs text-muted">{when(u.lastSignIn)}</td>
      <td className="px-3 text-right">
        {staff && !self && (u.active
          ? <button className={btnGhost} onClick={() => change({ active: false }, `Deactivate ${u.email ?? u.phone}? They will be signed out and unable to sign in.`, "Deactivated")}>Deactivate</button>
          : <button className={btnGhost} onClick={() => change({ active: true }, `Reactivate ${u.email ?? u.phone}?`, "Reactivated")}>Reactivate</button>)}
        {self && <span className="text-xs text-muted">You</span>}
      </td>
    </tr>
  );
}

function AddStaff() {
  const create = useAction("/admin/users", KEY);
  const [f, setF] = useState({ email: "", name: "", role: "hsp_finance" });
  return (
    <Card title="Add a staff member">
      <form className="grid gap-2 sm:grid-cols-4" onSubmit={(e: FormEvent) => {
        e.preventDefault();
        create.run(f, `Added ${f.email}. They sign in with a one-time code sent to that email.`);
        setF({ ...f, email: "", name: "" });
      }}>
        <Field label="Name"><input className={input} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="Work email"><input className={input} type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        <Field label="Role">
          <select aria-label="New staff role" className={input} value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>
            {STAFF.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </Field>
        <div className="flex items-end"><button className={btn} disabled={create.pending}>Add staff</button></div>
        <div className="sm:col-span-4">{create.feedback}</div>
      </form>
    </Card>
  );
}
