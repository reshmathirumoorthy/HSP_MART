import type { MessageKey } from "@/lib/i18n/dict";

const ITEMS: { href: string; key: MessageKey }[] = [
  { href: "/partner", key: "partner.nav.earnings" },
  { href: "/partner/leads", key: "partner.nav.leads" },
  { href: "/partner/quotes", key: "partner.nav.quotes" },
  { href: "/partner/coach", key: "partner.nav.coach" },
  { href: "/partner/complaints", key: "partner.nav.complaints" },
];

export const partnerNav = (t: (k: MessageKey) => string) => ITEMS.map((i) => ({ href: i.href, label: t(i.key) }));
