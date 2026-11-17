import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/dal";
import { AccountShell } from "@/components/account/AccountShell";
import { AccountWishlistClient } from "@/components/account/AccountWishlistClient";
import { loadSiteData } from "@/lib/siteData.server";

export const metadata: Metadata = {
  title: "Wishlist",
  description: "Your saved HSP Mart products.",
};

export default async function AccountWishlistPage() {
  await loadSiteData();
  await requireUser("/account/wishlist");
  return (
    <AccountShell
      title="Wishlist"
      description="Products you saved, on every device you sign in to."
    >
      <AccountWishlistClient />
    </AccountShell>
  );
}
