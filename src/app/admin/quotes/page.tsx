import Link from "next/link";
import { api, getOrNull } from "@/lib/api";
import { PortalShell } from "@/components/portal/PortalShell";
import { ADMIN_NAV, Badge, btnCls } from "@/components/portal/ui";
import { requireRole } from "@/lib/auth/dal";
import { STAFF_ROLES } from "@/lib/auth/token";
import { formatINR } from "@/lib/commerce/pricing";
import { loadSiteData } from "@/lib/siteData.server";

export default async function QuotesPage() {
  await loadSiteData();
  const user = await requireRole(STAFF_ROLES, "/admin/quotes");
  const data = await api.get<{ number: string; status: string; channel: string; totalPaise: number; contributionBps: number; belowMinimum: boolean; validUntil: Date; createdAt: Date; customer: string }[]>("/admin/quotes");
  const rows = data.slice(0, 100).map((q) => ({ q: { ...q, id: q.number }, customer: q.customer }));

  return (
    <PortalShell title="Quotations" user={user} nav={ADMIN_NAV}>
      <div className="mb-4 flex justify-end">
        <Link href="/admin/quotes/new" className={btnCls}>
          New quote
        </Link>
      </div>
      <div className="overflow-x-auto rounded-lg border border-[var(--color-border)] bg-white">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase text-[var(--color-text-muted)]">
            <tr>
              <th className="px-4 py-2">Number</th>
              <th className="px-4 py-2">Customer</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2 text-right">Total</th>
              <th className="px-4 py-2 text-right">Contribution</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {rows.map(({ q, customer }) => (
              <tr key={q.id}>
                <td className="px-4 py-2">
                  <Link className="underline" href={`/admin/quotes/${q.number}`}>
                    {q.number}
                  </Link>
                </td>
                <td className="px-4 py-2">{customer}</td>
                <td className="px-4 py-2">
                  <Badge tone={q.status === "pending_approval" ? "warn" : "neutral"}>{q.status}</Badge>
                </td>
                <td className="px-4 py-2 text-right tabular-nums">{formatINR(q.totalPaise)}</td>
                <td className="px-4 py-2 text-right tabular-nums">{(q.contributionBps / 100).toFixed(1)}%</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-[var(--color-text-muted)]">
                  No quotes yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </PortalShell>
  );
}
