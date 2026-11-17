import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/dal";
import { AccountShell } from "@/components/account/AccountShell";
import { AccountNotificationsClient } from "@/components/account/AccountNotificationsClient";
import { loadSiteData } from "@/lib/siteData.server";

export const metadata: Metadata = {
  title: "Notifications",
  description: "Account and order notifications for your HSP Mart account.",
};

export default async function AccountNotificationsPage() {
  await loadSiteData();
  await requireUser("/account/notifications");
  return (
    <AccountShell
      title="Notifications"
      description="Messages HSP sent you about orders, payments and quotes."
    >
      <AccountNotificationsClient />
    </AccountShell>
  );
}
