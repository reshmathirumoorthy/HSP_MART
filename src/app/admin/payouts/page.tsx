import { api } from "@/lib/api";
import { PortalShell } from "@/components/portal/PortalShell";
import { ADMIN_NAV, Badge, btnGhostCls, Card, Flash } from "@/components/portal/ui";
import { requireRole } from "@/lib/auth/dal";
import { STAFF_ROLES } from "@/lib/auth/token";
import { formatINR } from "@/lib/commerce/pricing";
import { approvePayoutAction, requestPayoutAction } from "../actions";
import { loadSiteData } from "@/lib/siteData.server";

export default async function PayoutsPage({ searchParams }: { searchParams: Promise<{ error?: string; ok?: string }> }) {
  await loadSiteData();
  const user = await requireRole(STAFF_ROLES, "/admin/payouts");
  const flash = await searchParams;
  const data = await api.get<{
    tdsBps: number;
    due: { partnerId: string; code: string; amountPaise: number }[];
    payouts: { id: string; code: string; grossPaise: number; tdsPaise: number; netPaise: number; bankDestination: string; transferReference: string | null; status: string }[];
  }>("/admin/payouts");
  const tdsBps = () => data.tdsBps;
  const partners = data.due.map((d) => ({ id: d.partnerId, code: d.code }));
  const dueBy = new Map(data.due.map((d) => [d.partnerId, d.amountPaise]));
  const payouts = data.payouts.map((po) => ({ po, code: po.code }));

  return (
    <PortalShell title="Partner payouts" user={user} nav={ADMIN_NAV}>
      <Flash {...flash} />
      <p className="mb-4 text-sm text-[var(--color-text-secondary)]">
        TDS withheld at {(tdsBps() / 100).toFixed(2)}% (confirm against the Income-tax Act, 2025 s.393). Payouts need a
        second finance/admin approver.{" "}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- file download, not a page */}
        <a className="underline" href="/api/admin/exports/payouts" download>
          Export payouts CSV
        </a>{" "}
        ·{" "}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- file download, not a page */}
        <a className="underline" href="/api/admin/exports/commissions" download>
          Export commission ledger CSV
        </a>{" "}
        ·{" "}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- file download, not a page */}
        <a className="underline" href="/api/admin/exports/sales" download>
          Export sales register CSV
        </a>{" "}
        ·{" "}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- file download, not a page */}
        <a className="underline" href="/api/admin/exports/credit_notes" download>
          Export credit notes CSV
        </a>{" "}
        ·{" "}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- file download, not a page */}
        <a className="underline" href="/api/admin/exports/tally" download>
          Tally vouchers (XML)
        </a>
      </p>
      <div className="grid gap-6 md:grid-cols-2">
        <Card title="Approved commission due">
          <ul className="divide-y divide-[var(--color-border)] text-sm">
            {partners
              .filter((p) => (dueBy.get(p.id) ?? 0) > 0)
              .map((p) => (
                <li key={p.id} data-testid={`due-${p.code}`} className="flex items-center justify-between gap-2 py-2">
                  <span>
                    {p.code} · {formatINR(dueBy.get(p.id)!)}
                  </span>
                  <form action={requestPayoutAction.bind(null, p.id)}>
                    <button className={btnGhostCls}>Raise payout</button>
                  </form>
                </li>
              ))}
            {dueBy.size === 0 && <li className="py-3 text-[var(--color-text-muted)]">Nothing due.</li>}
          </ul>
        </Card>
        <Card title="Payouts">
          <ul data-testid="payout-list" className="divide-y divide-[var(--color-border)] text-sm">
            {payouts.map(({ po, code }) => (
              <li key={po.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="tabular-nums">
                  {code} · gross {formatINR(po.grossPaise)} · TDS {formatINR(po.tdsPaise)} · net {formatINR(po.netPaise)} ·{" "}
                  {po.bankDestination} {po.transferReference && <code className="text-xs">{po.transferReference}</code>}
                </span>
                <span className="flex items-center gap-2">
                  <Badge tone={po.status === "processed" ? "good" : "warn"}>{po.status}</Badge>
                  {po.status === "requested" && (
                    <form action={approvePayoutAction.bind(null, po.id)}>
                      <button className={btnGhostCls}>Approve & transfer</button>
                    </form>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </PortalShell>
  );
}
