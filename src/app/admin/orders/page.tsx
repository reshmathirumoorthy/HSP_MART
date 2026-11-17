import Link from "next/link";
import { api, getOrNull } from "@/lib/api";
import { PortalShell } from "@/components/portal/PortalShell";
import { ADMIN_NAV, Badge } from "@/components/portal/ui";
import { requireRole } from "@/lib/auth/dal";
import { STAFF_ROLES } from "@/lib/auth/token";
import { formatINR } from "@/lib/commerce/pricing";
import { loadSiteData } from "@/lib/siteData.server";

export default async function OrdersPage() {
  await loadSiteData();
  const user = await requireRole(STAFF_ROLES, "/admin/orders");
  const data = await api.get<{ number: string; status: string; totalPaise: number; paidPaise: number; refundedPaise: number; createdAt: Date; customer: string }[]>("/admin/orders");
  const rows = data.slice(0, 100).map((o) => ({ o: { ...o, id: o.number }, customer: o.customer }));

  return (
    <PortalShell title="Orders" user={user} nav={ADMIN_NAV}>
      <div className="overflow-x-auto rounded-lg border border-[var(--color-border)] bg-white">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase text-[var(--color-text-muted)]">
            <tr>
              <th className="px-4 py-2">Number</th>
              <th className="px-4 py-2">Customer</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2 text-right">Total</th>
              <th className="px-4 py-2 text-right">Paid</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {rows.map(({ o, customer }) => (
              <tr key={o.id}>
                <td className="px-4 py-2">
                  <Link className="underline" href={`/admin/orders/${o.number}`}>
                    {o.number}
                  </Link>
                </td>
                <td className="px-4 py-2">{customer}</td>
                <td className="px-4 py-2">
                  <Badge>{o.status}</Badge>
                </td>
                <td className="px-4 py-2 text-right tabular-nums">{formatINR(o.totalPaise)}</td>
                <td className="px-4 py-2 text-right tabular-nums">{formatINR(o.paidPaise - o.refundedPaise)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-[var(--color-text-muted)]">
                  No orders yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </PortalShell>
  );
}
