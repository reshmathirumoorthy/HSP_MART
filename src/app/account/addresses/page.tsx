import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/dal";
import { AccountShell } from "@/components/account/AccountShell";
import { AddressBookClient } from "@/components/account/AddressBookClient";
import { loadSiteData } from "@/lib/siteData.server";

export const metadata: Metadata = {
  title: "Addresses",
  description: "Manage local delivery addresses for your HSP Mart account.",
};

export default async function AccountAddressesPage() {
  await loadSiteData();
  await requireUser("/account/addresses");
  return (
    <AccountShell
      title="Addresses"
      description="Delivery addresses saved to your account."
    >
      <AddressBookClient />
    </AccountShell>
  );
}
