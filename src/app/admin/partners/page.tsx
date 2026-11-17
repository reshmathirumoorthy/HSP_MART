import { api } from "@/lib/api";
import { PortalShell } from "@/components/portal/PortalShell";
import { ADMIN_NAV, Badge, btnCls, btnGhostCls, Card, Flash, inputCls } from "@/components/portal/ui";
import { requireRole } from "@/lib/auth/dal";
import { STAFF_ROLES } from "@/lib/auth/token";
import { formatINR } from "@/lib/commerce/pricing";
import {
  approveCommissionsAction,
  depositAction,
  createContractAction,
  endContractAction,
  keyAccountAction,
  partnerStatusAction,
  verifyPartnerAction,
} from "../actions";
import { loadSiteData } from "@/lib/siteData.server";

export default async function PartnersAdminPage({ searchParams }: { searchParams: Promise<{ error?: string; ok?: string }> }) {
  await loadSiteData();
  const user = await requireRole(STAFF_ROLES, "/admin/partners");
  const flash = await searchParams;
  type Totals = Record<"pending" | "earned" | "approved" | "paid" | "reversed", number>;
  const data = await api.get<{
    partners: ({ id: string; code: string; type: string; status: string; city: string | null; pan: string; bankIfsc: string;
      bankAccountLast4: string; agreementVersion: string; securityDepositPaise: number; email: string | null; phone: string | null; ledger: Totals })[];
    contracts: { id: string; status: string; endsAt: Date; renewalCommissionBps: number; endedReason: string | null; customer: string; email: string; partner: string }[];
    customers: { id: string; name: string; email: string; isNationalKeyAccount: boolean }[];
    depositLiability: number;
  }>("/admin/partners");
  const partners = data.partners.map((p) => ({ p, email: p.email, phone: p.phone }));
  const totals = data.partners.map((p) => p.ledger);
  const customers = data.customers;
  const contracts = data.contracts.map((c) => ({ c, customer: c.customer, email: c.email, partner: c.partner }));
  const canContract = ["hsp_admin", "hsp_finance"].includes(user.role);
  const depositLiability = data.depositLiability;

  return (
    <PortalShell title="Partner network" user={user} nav={ADMIN_NAV}>
      <Flash {...flash} />
      <p className="mb-4 text-sm">
        Refundable franchise deposits held (liability): <strong data-testid="deposit-liability">{formatINR(depositLiability)}</strong>
      </p>
      <div className="space-y-4">
        {partners.map(({ p, email, phone }, i) => (
          <Card key={p.id}>
            <div data-testid={`partner-${email ?? phone}`} className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium">
                  {p.code} · {email ?? phone} <Badge tone={p.status === "active" ? "good" : "warn"}>{p.status}</Badge>
                </p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {p.type} · {p.city} · PAN {p.pan} · IFSC {p.bankIfsc} ··{p.bankAccountLast4} · agreement {p.agreementVersion}
                </p>
                <p className="mt-1 text-xs tabular-nums">
                  Pending {formatINR(totals[i].pending)} · Earned {formatINR(totals[i].earned)} · Approved{" "}
                  {formatINR(totals[i].approved)} · Paid {formatINR(totals[i].paid)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {p.status === "kyc_pending" && (
                  <form action={verifyPartnerAction.bind(null, p.id)}>
                    <button className={btnGhostCls}>Verify KYC</button>
                  </form>
                )}
                {p.status === "active" && (
                  <>
                    <form action={approveCommissionsAction.bind(null, p.id)}>
                      <button className={btnGhostCls}>Approve earned commission</button>
                    </form>
                    <form action={partnerStatusAction.bind(null, p.id, "suspended")}>
                      <button className={btnGhostCls}>Suspend</button>
                    </form>
                  </>
                )}
                {p.status === "suspended" && (
                  <form action={partnerStatusAction.bind(null, p.id, "active")}>
                    <button className={btnGhostCls}>Reinstate</button>
                  </form>
                )}
                {p.type === "franchise" && (
                  <form action={depositAction.bind(null, p.id)} className="flex gap-2">
                    <input name="deposit" aria-label="Deposit received" placeholder="Deposit ₹" className={`${inputCls} max-w-32`} />
                    <button className={btnGhostCls}>Record deposit</button>
                  </form>
                )}
              </div>
            </div>
          </Card>
        ))}
        {partners.length === 0 && <p className="text-[var(--color-text-muted)]">No partner applications yet.</p>}
      </div>

      <h2 className="mb-3 mt-8 font-medium">Contracted accounts (renewal commission)</h2>
      <Card>
        <p className="mb-3 text-xs text-[var(--color-text-muted)]">
          After a partner&apos;s lead converts, a contract keeps their renewal commission on that account for the term — as long
          as they keep servicing it. A protected lead always takes precedence.
        </p>
        <ul className="mb-4 divide-y divide-[var(--color-border)] text-sm">
          {contracts.map(({ c, customer, email, partner }) => (
            <li key={c.id} data-testid={`contract-${email}`} className="flex flex-wrap items-center justify-between gap-3 py-2">
              <span>
                {customer} → {partner} · {(c.renewalCommissionBps / 100).toFixed(2)}% until {c.endsAt.toLocaleDateString("en-IN")}{" "}
                <Badge tone={c.status === "active" ? "good" : "neutral"}>{c.status}</Badge>
                {c.endedReason ? <span className="text-xs"> — {c.endedReason}</span> : null}
              </span>
              {canContract && c.status === "active" && (
                <form action={endContractAction.bind(null, c.id)} className="flex gap-2">
                  <input name="reason" placeholder="Reason" aria-label="End reason" className={inputCls} />
                  <button className={btnGhostCls}>End</button>
                </form>
              )}
            </li>
          ))}
          {contracts.length === 0 && <li className="py-2 text-[var(--color-text-muted)]">No contracts yet.</li>}
        </ul>
        {canContract && (
          <form action={createContractAction} className="grid gap-2 text-sm sm:grid-cols-2">
            <input name="customerEmail" placeholder="Customer email" aria-label="Contract customer email" className={inputCls} />
            <input name="partnerCode" placeholder="Partner code (HSP-A-…)" aria-label="Contract partner code" className={inputCls} />
            <input name="months" placeholder="Term in months" defaultValue={12} aria-label="Contract months" className={inputCls} />
            <input name="renewalPct" placeholder="Renewal commission %" defaultValue={5} aria-label="Renewal commission percent" className={inputCls} />
            <input name="reference" placeholder="Contract / PO reference" aria-label="Contract reference" className={inputCls} />
            <button className={btnCls}>Record contract</button>
          </form>
        )}
      </Card>

      <h2 className="mb-3 mt-8 font-medium">National key accounts</h2>
      <Card>
        <ul className="divide-y divide-[var(--color-border)] text-sm">
          {customers.map((c) => (
            <li key={c.id} data-testid={`customer-${c.email}`} className="flex items-center justify-between gap-3 py-2">
              <span>
                {c.name} <span className="text-[var(--color-text-muted)]">{c.email}</span>{" "}
                {c.isNationalKeyAccount && <Badge tone="warn">key account</Badge>}
              </span>
              <form action={keyAccountAction.bind(null, c.id, !c.isNationalKeyAccount)}>
                <button className={btnGhostCls}>{c.isNationalKeyAccount ? "Unflag" : "Flag key account"}</button>
              </form>
            </li>
          ))}
        </ul>
      </Card>
    </PortalShell>
  );
}
