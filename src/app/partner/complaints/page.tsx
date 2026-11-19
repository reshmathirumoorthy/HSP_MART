import type { Metadata } from "next";
import { api } from "@/lib/api";
import { PortalShell } from "@/components/portal/PortalShell";
import { Badge, btnCls, Card, Flash, inputCls } from "@/components/portal/ui";
import { requireRole } from "@/lib/auth/dal";
import { PARTNER_ROLES } from "@/lib/auth/token";
import { partnerGrievanceAction } from "../actions";
import { partnerNav } from "../nav";
import { getT } from "@/lib/i18n/server";
import { loadSiteData } from "@/lib/siteData.server";

export const metadata: Metadata = { title: "Complaints", robots: { index: false } };

const CATEGORIES = ["damaged", "missing", "wrong_item", "quality", "delay", "billing", "other"];

export default async function PartnerComplaints({ searchParams }: { searchParams: Promise<{ error?: string; ok?: string }> }) {
  await loadSiteData();
  const user = await requireRole(PARTNER_ROLES, "/partner/complaints");
  const { t } = await getT();
  const flash = await searchParams;
  // The backend returns only complaints on orders attributed to this partner.
  const rows = await api.get<{ number: string; orderNumber: string; category: string; description: string; status: string; resolution: string | null; dueAt: string; overdue: boolean }[]>("/partner/grievances");

  return (
    <PortalShell title={t("partner.nav.complaints")} user={user} nav={partnerNav(t)}>
      <Flash {...flash} />
      <div className="grid gap-6 md:grid-cols-[1fr_2fr]">
        <Card title="Log a complaint for your customer">
          <form action={partnerGrievanceAction} className="space-y-3">
            <input name="order" aria-label="Order number" placeholder="Order number (O-…)" className={inputCls} />
            <select name="category" aria-label="Problem type" className={inputCls} defaultValue="">
              <option value="" disabled>What went wrong?</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c.replaceAll("_", " ")}</option>)}
            </select>
            <textarea name="description" aria-label="Describe the problem" rows={3} className={inputCls} />
            <button className={btnCls}>Log complaint</button>
          </form>
          <p className="mt-3 text-xs text-[var(--color-text-muted)]">HSP owns the resolution. You assist your customer; suppliers fix supply defects.</p>
        </Card>
        <Card title="Your customers' complaints">
          <ul data-testid="partner-grievances" className="divide-y divide-[var(--color-border)] text-sm">
            {rows.map((g) => (
              <li key={g.number} className="py-2">
                {g.number} · order {g.orderNumber} · {g.category.replaceAll("_", " ")}{" "}
                <Badge tone={["resolved", "closed"].includes(g.status) ? "good" : "warn"}>{g.status.replaceAll("_", " ")}</Badge>
                {g.overdue && <Badge tone="warn">overdue</Badge>}
                <span className="block text-xs text-[var(--color-text-muted)]">{g.resolution ?? g.description}</span>
              </li>
            ))}
            {rows.length === 0 && <li className="py-3 text-[var(--color-text-muted)]">No complaints on your orders.</li>}
          </ul>
        </Card>
      </div>
    </PortalShell>
  );
}
