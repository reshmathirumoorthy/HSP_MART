import type { Metadata } from "next";
import { api, getOrNull } from "@/lib/api";
import { PortalShell, Stat } from "@/components/portal/PortalShell";
import { Badge, Card } from "@/components/portal/ui";
import { requireRole } from "@/lib/auth/dal";
import { PARTNER_ROLES } from "@/lib/auth/token";
import { formatINR } from "@/lib/commerce/pricing";
import { partnerNav } from "./nav";
import { getT } from "@/lib/i18n/server";
import { loadSiteData } from "@/lib/siteData.server";

export const metadata: Metadata = { title: "Partner portal", robots: { index: false } };

type Partner = { id: string; code: string; type: string; status: string; city: string | null; commissionBps: number; serviceFeeBps: number };

export default async function PartnerHome() {
  await loadSiteData();
  const user = await requireRole(PARTNER_ROLES, "/partner");
  const { t } = await getT();
  type Row = { id: string; orderId: string; orderNumber: string | null; eligibleBasePaise: number; rateBps: number; amountPaise: number; deductionsPaise: number; status: string };
  const dash = await api.get<{ partner: (Partner) | null; totals: Record<"pending" | "earned" | "approved" | "paid", number>; rows: Row[] }>("/partner/dashboard");
  const partner = dash.partner;
  if (!partner) {
    return (
      <PortalShell title="Partner portal" user={user} nav={[]}>
        <p>No partner profile is linked to this account. Contact HSP.</p>
      </PortalShell>
    );
  }
  const { totals, rows } = dash;

  return (
    <PortalShell title={`${t("partner.portal")} · ${partner.code}`} user={user} nav={partnerNav(t)}>
      <p className="mb-4 text-sm text-[var(--color-text-secondary)]">
        {partner.type} · {partner.city} · <Badge testId="partner-status">{partner.status}</Badge> · commission{" "}
        {(partner.commissionBps / 100).toFixed(0)}%{partner.serviceFeeBps ? ` + ${(partner.serviceFeeBps / 100).toFixed(0)}% service fee` : ""}
      </p>
      <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label={t("ledger.pending")} value={formatINR(totals.pending)} testId="ledger-pending" />
        <Stat label={t("ledger.earned")} value={formatINR(totals.earned)} testId="ledger-earned" />
        <Stat label={t("ledger.approved")} value={formatINR(totals.approved)} testId="ledger-approved" />
        <Stat label={t("ledger.paid")} value={formatINR(totals.paid)} testId="ledger-paid" />
      </section>
      <Card title={t("ledger.title")}>
        <table data-testid="ledger-table" className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-[var(--color-text-muted)]">
            <tr>
              <th className="py-1">Order</th>
              <th className="py-1 text-right">Eligible base</th>
              <th className="py-1 text-right">Rate</th>
              <th className="py-1 text-right">Commission</th>
              <th className="py-1">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-[var(--color-border)]">
                <td className="py-1.5">{r.orderNumber}</td>
                <td className="py-1.5 text-right tabular-nums">{formatINR(r.eligibleBasePaise)}</td>
                <td className="py-1.5 text-right tabular-nums">{(r.rateBps / 100).toFixed(1)}%</td>
                <td className="py-1.5 text-right tabular-nums">{formatINR(r.amountPaise - r.deductionsPaise)}</td>
                <td className="py-1.5">
                  <Badge>{r.status}</Badge>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="py-4 text-center text-[var(--color-text-muted)]">
                  No commissions yet. Register a lead to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <p className="mt-3 text-xs text-[var(--color-text-muted)]">
          Commission is on net realised value excluding GST and freight. It becomes Earned after payment, delivery and
          reconciliation, Approved after the returns window, and Paid after payout (TDS deducted).
        </p>
      </Card>
    </PortalShell>
  );
}
