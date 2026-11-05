import type { Metadata } from "next";
import { AccountShell } from "@/components/account/AccountShell";
import { AccountWishlistClient } from "@/components/account/AccountWishlistClient";

export const metadata: Metadata = {
  title: "Wishlist",
  description: "Your saved HSP Mart products.",
};

export default function AccountWishlistPage() {
  return (
    <AccountShell
      title="Wishlist"
      description="Products saved on this device — shared with the storefront wishlist."
    >
      <AccountWishlistClient />
    </AccountShell>
  );
}
