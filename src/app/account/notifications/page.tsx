import type { Metadata } from "next";
import { AccountShell } from "@/components/account/AccountShell";
import { AccountNotificationsClient } from "@/components/account/AccountNotificationsClient";

export const metadata: Metadata = {
  title: "Notifications",
  description: "Account and order notifications for your HSP Mart demo account.",
};

export default function AccountNotificationsPage() {
  return (
    <AccountShell
      title="Notifications"
      description="Updates from this device’s notification store."
    >
      <AccountNotificationsClient />
    </AccountShell>
  );
}
