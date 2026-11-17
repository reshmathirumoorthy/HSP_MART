import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/dal";
import { AccountShell } from "@/components/account/AccountShell";
import { ProfileEditor } from "@/components/account/ProfileEditor";
import { loadSiteData } from "@/lib/siteData.server";

export const metadata: Metadata = {
  title: "Profile",
  description: "Manage your HSP Mart customer profile.",
};

export default async function AccountProfilePage() {
  await loadSiteData();
  await requireUser("/account/profile");
  return (
    <AccountShell
      title="Profile"
      description="Your name and business details for invoices and quotes."
    >
      <ProfileEditor />
    </AccountShell>
  );
}
