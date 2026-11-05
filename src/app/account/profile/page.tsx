import type { Metadata } from "next";
import { AccountShell } from "@/components/account/AccountShell";
import { ProfileEditor } from "@/components/account/ProfileEditor";

export const metadata: Metadata = {
  title: "Profile",
  description: "Manage your HSP Mart demo customer profile.",
};

export default function AccountProfilePage() {
  return (
    <AccountShell
      title="Profile"
      description="Demo customer details stored on this device only."
    >
      <ProfileEditor />
    </AccountShell>
  );
}
