import type { Metadata } from "next";
import { AccountShell } from "@/components/account/AccountShell";
import { AddressBookClient } from "@/components/account/AddressBookClient";

export const metadata: Metadata = {
  title: "Addresses",
  description: "Manage local delivery addresses for your HSP Mart demo account.",
};

export default function AccountAddressesPage() {
  return (
    <AccountShell
      title="Addresses"
      description="Save delivery addresses on this device for later use."
    >
      <AddressBookClient />
    </AccountShell>
  );
}
