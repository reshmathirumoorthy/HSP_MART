import { useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { api, inr, rupeesToPaise, when } from "../api";
import { Badge, btn, btnGhost, Card, ErrorText, Field, input, Loading, PageTitle, useAction } from "../ui";

type Ledger = Record<"pending" | "earned" | "approved" | "paid" | "reversed", number>;
type P = { id: string; code: string; type: string; status: string; city: string | null; pan: string; bankIfsc: string; bankAccountLast4: string;
  agreementVersion: string; commissionBps: number; securityDepositPaise: number; email: string | null; phone: string | null; ledger: Ledger };
type D = {
  partners: P[];
  contracts: { id: string; status: string; endsAt: string; renewalCommissionBps: number; endedReason: string | null; customer: string; email: string; partner: string }[];
  customers: { id: string; name: string; email: string; isNationalKeyAccount: boolean }[];
  depositLiability: number;
};
const KEY = [["partners"]];

export default function Partners({ role }: { role: string }) {
  const q = useQuery({ queryKey: ["partners"], queryFn: () => api<D>("/admin/partners") });
  if (q.error) return <ErrorText error={q.error} />;
  if (!q.data) return <Loading />;
  const d = q.data;
  const finance = ["hsp_admin", "hsp_finance"].includes(role);
  return (
    <div className="space-y-6">
      <PageTitle>Partner network</PageTitle>
      <p className="text-sm">Refundable franchise deposits held (liability): <strong data-testid="deposit-liability">{inr(d.depositLiability)}</strong></p>
      <div className="space-y-3">
        {d.partners.map((p) => <PartnerRow key={p.id} p={p} role={role} />)}
        {!d.partners.length && <p className="text-sm text-muted">No partner applications yet.</p>}
      </div>
      <Contracts d={d} canEdit={finance} />
      <Card title="National key accounts">
        <ul className="divide-y divide-line text-sm">{d.customers.map((c) => <KeyAccountRow key={c.id} c={c} canEdit={role === "hsp_admin"} />)}</ul>
      </Card>
    </div>
  );
}

function PartnerRow({ p, role }: { p: P; role: string }) {
  const verify = useAction(`/admin/partners/${p.id}/verify`, KEY);
  const status = useAction(`/admin/partners/${p.id}/status`, KEY);
  const approve = useAction(`/admin/partners/${p.id}/approve-commissions`, KEY);
  const deposit = useAction(`/admin/partners/${p.id}/deposit`, KEY);
  const [amount, setAmount] = useState("");
  const finance = ["hsp_admin", "hsp_finance"].includes(role);
  return (
    <section data-testid={`partner-${p.email ?? p.phone}`} className="rounded-lg border border-line bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium">{p.code} · {p.email ?? p.phone} <Badge>{p.status}</Badge></p>
          <p className="text-xs text-muted">{p.type} · {p.city} · PAN {p.pan} · IFSC {p.bankIfsc} ··{p.bankAccountLast4} · agreement {p.agreementVersion} · {(p.commissionBps / 100).toFixed(0)}%</p>
          <p className="mt-1 text-xs tabular-nums">Pending {inr(p.ledger.pending)} · Earned {inr(p.ledger.earned)} · Approved {inr(p.ledger.approved)} · Paid {inr(p.ledger.paid)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {p.status === "kyc_pending" && finance && <button className={btnGhost} onClick={() => verify.run({}, "KYC verified — partner activated")}>Verify KYC</button>}
          {p.status === "active" && finance && <button className={btnGhost} onClick={() => approve.run({}, "Eligible commissions approved")}>Approve earned commission</button>}
          {p.status === "active" && role === "hsp_admin" && <button className={btnGhost} onClick={() => status.run({ status: "suspended" }, "Partner suspended")}>Suspend</button>}
          {p.status === "suspended" && role === "hsp_admin" && <button className={btnGhost} onClick={() => status.run({ status: "active" }, "Partner reinstated")}>Reinstate</button>}
          {p.type === "franchise" && finance && (
            <form className="flex gap-2" onSubmit={(e: FormEvent) => { e.preventDefault(); deposit.run({ depositPaise: rupeesToPaise(amount) }, "Deposit recorded as liability"); }}>
              <input aria-label="Deposit received" placeholder={`Deposit ₹ (now ${inr(p.securityDepositPaise)})`} className={`${input} w-48`} value={amount} onChange={(e) => setAmount(e.target.value)} />
              <button className={btnGhost}>Record deposit</button>
            </form>
          )}
        </div>
      </div>
      {verify.feedback}{status.feedback}{approve.feedback}{deposit.feedback}
    </section>
  );
}

function Contracts({ d, canEdit }: { d: D; canEdit: boolean }) {
  const create = useAction("/admin/contracts", KEY);
  const [f, setF] = useState({ customerEmail: "", partnerCode: "", months: "12", renewalPct: "5", reference: "" });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  return (
    <Card title="Contracted accounts (renewal commission)">
      <p className="mb-3 text-xs text-muted">After a partner's lead converts, a contract keeps their renewal commission on that account for the term, as long as they keep servicing it. A protected lead always takes precedence.</p>
      <ul className="mb-4 divide-y divide-line text-sm">
        {d.contracts.map((c) => <ContractRow key={c.id} c={c} canEdit={canEdit} />)}
        {!d.contracts.length && <li className="py-2 text-muted">No contracts yet.</li>}
      </ul>
      {canEdit && (
        <form className="grid gap-2 text-sm sm:grid-cols-3" onSubmit={(e: FormEvent) => {
          e.preventDefault();
          const p = Number(f.renewalPct);
          create.run({ customerEmail: f.customerEmail, partnerCode: f.partnerCode, months: Number(f.months) || 12, renewalCommissionBps: Number.isFinite(p) ? Math.round(p * 100) : -1, reference: f.reference }, "Contract recorded — renewal commission applies");
        }}>
          <Field label="Customer email"><input className={input} value={f.customerEmail} onChange={set("customerEmail")} /></Field>
          <Field label="Partner code"><input className={input} placeholder="HSP-A-…" value={f.partnerCode} onChange={set("partnerCode")} /></Field>
          <Field label="Term (months)"><input className={input} value={f.months} onChange={set("months")} /></Field>
          <Field label="Renewal commission %"><input className={input} value={f.renewalPct} onChange={set("renewalPct")} /></Field>
          <Field label="Contract / PO reference"><input className={input} value={f.reference} onChange={set("reference")} /></Field>
          <div className="flex items-end"><button className={btn}>Record contract</button></div>
          <div className="sm:col-span-3">{create.feedback}</div>
        </form>
      )}
    </Card>
  );
}

function ContractRow({ c, canEdit }: { c: D["contracts"][number]; canEdit: boolean }) {
  const end = useAction(`/admin/contracts/${c.id}/end`, KEY);
  const [reason, setReason] = useState("");
  return (
    <li className="py-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span>{c.customer} → {c.partner} · {(c.renewalCommissionBps / 100).toFixed(2)}% until {when(c.endsAt)} <Badge>{c.status}</Badge>{c.endedReason && <span className="text-xs"> — {c.endedReason}</span>}</span>
        {canEdit && c.status === "active" && (
          <span className="flex gap-2">
            <input aria-label="End reason" placeholder="Reason" className={`${input} w-48`} value={reason} onChange={(e) => setReason(e.target.value)} />
            <button className={btnGhost} onClick={() => end.run({ reason }, "Contract ended")}>End</button>
          </span>
        )}
      </div>
      {end.feedback}
    </li>
  );
}

function KeyAccountRow({ c, canEdit }: { c: D["customers"][number]; canEdit: boolean }) {
  const flag = useAction(`/admin/customers/${c.id}/key-account`, KEY);
  return (
    <li className="py-2">
      <div className="flex items-center justify-between gap-3">
        <span>{c.name} <span className="text-muted">{c.email}</span> {c.isNationalKeyAccount && <Badge>key account</Badge>}</span>
        {canEdit && <button className={btnGhost} onClick={() => flag.run({ on: !c.isNationalKeyAccount }, c.isNationalKeyAccount ? "Key account flag removed" : "Marked as national key account")}>{c.isNationalKeyAccount ? "Unflag" : "Flag key account"}</button>}
      </div>
      {flag.feedback}
    </li>
  );
}
