import { PortalShell } from "@/components/portal/PortalShell";
import { Badge, Card } from "@/components/portal/ui";
import { api } from "@/lib/api";
import { requireRole } from "@/lib/auth/dal";
import { PARTNER_ROLES } from "@/lib/auth/token";
import { partnerNav } from "../nav";
import { getT } from "@/lib/i18n/server";
import { loadSiteData } from "@/lib/siteData.server";

export default async function CoachPage() {
  await loadSiteData();
  const user = await requireRole(PARTNER_ROLES, "/partner/coach");
  const { t } = await getT();
  const partner = (await api.get<{ partner: { id: string } | null }>("/partner/me")).partner;
  if (!partner) return null;
  const coach = await api.get<{
    followUps: { kind: string; message: string }[];
    upcoming: { name: string; date: string }[];
    messages: { en: string; hi: string };
  }>("/partner/coach");

  return (
    <PortalShell title="AI sales coach" user={user} nav={partnerNav(t)}>
      <div className="grid gap-6 md:grid-cols-2">
        <Card title="Follow up today">
          <ul data-testid="follow-ups" className="space-y-2 text-sm">
            {coach.followUps.map((f, i) => (
              <li key={i}>
                <Badge>{f.kind}</Badge> {f.message}
              </li>
            ))}
            {coach.followUps.length === 0 && <li className="text-[var(--color-text-muted)]">You&apos;re all caught up.</li>}
          </ul>
        </Card>
        <Card title="Upcoming gifting occasions">
          <ul data-testid="occasions" className="space-y-1 text-sm">
            {coach.upcoming.map((o) => (
              <li key={o.name}>
                {o.name} · {new Date(o.date).toLocaleDateString("en-IN")}
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Message you can send (English)">
          <p data-testid="msg-en" className="text-sm">{coach.messages.en}</p>
        </Card>
        <Card title="संदेश (हिन्दी)">
          <p data-testid="msg-hi" lang="hi" className="text-sm">{coach.messages.hi}</p>
        </Card>
      </div>
    </PortalShell>
  );
}
