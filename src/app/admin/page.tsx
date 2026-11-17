import type { Metadata } from "next";
import { api, getOrNull } from "@/lib/api";
import { PortalShell, Stat } from "@/components/portal/PortalShell";
import { ADMIN_NAV } from "@/components/portal/ui";
import { requireRole } from "@/lib/auth/dal";
import { STAFF_ROLES } from "@/lib/auth/token";
import { loadSiteData } from "@/lib/siteData.server";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };

export default async function AdminHome() {
  await loadSiteData();
  const user = await requireRole(STAFF_ROLES, "/admin");

  const data = await api.get<{
    divisions: { division: string; n: number }[];
    roles: { role: string; n: number }[];
    events: { id: string; createdAt: Date; action: string; actorRole: string | null; entity: string }[];
    enquiries: number;
  }>("/admin/dashboard");
  const { divisions, roles, events } = data;
  const productTotal = divisions.reduce((a, d) => a + d.n, 0);

  return (
    <PortalShell title="HSP administration" user={user} nav={ADMIN_NAV}>
      <section className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-6">
        <Stat label="Products" value={productTotal} testId="stat-products" />
        {divisions.map((d) => (
          <Stat key={d.division} label={d.division} value={d.n} testId={`stat-division-${d.division}`} />
        ))}
      </section>

      <div className="grid gap-6 md:grid-cols-[1fr_2fr]">
        <section>
          <h2 className="mb-3 font-medium">Users by role</h2>
          <ul className="divide-y divide-[var(--color-border)] rounded-lg border border-[var(--color-border)] bg-white text-sm">
            {roles.map((r) => (
              <li key={r.role} className="flex justify-between px-4 py-2">
                <span>{r.role}</span>
                <span className="tabular-nums">{r.n}</span>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h2 className="mb-3 font-medium">Recent audit events</h2>
          <div className="overflow-x-auto rounded-lg border border-[var(--color-border)] bg-white">
            <table data-testid="audit-table" className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-[var(--color-text-muted)]">
                <tr>
                  <th className="px-4 py-2">When</th>
                  <th className="px-4 py-2">Action</th>
                  <th className="px-4 py-2">Actor role</th>
                  <th className="px-4 py-2">Entity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {events.map((e) => (
                  <tr key={e.id}>
                    <td className="whitespace-nowrap px-4 py-2 tabular-nums">
                      {e.createdAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                    </td>
                    <td className="px-4 py-2">{e.action}</td>
                    <td className="px-4 py-2">{e.actorRole ?? "system"}</td>
                    <td className="px-4 py-2">{e.entity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </PortalShell>
  );
}
