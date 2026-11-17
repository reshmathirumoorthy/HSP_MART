import type { Metadata } from "next";
import { WishlistPageClient } from "@/components/discovery/WishlistPageClient";
import { loadSiteData } from "@/lib/siteData.server";

export const metadata: Metadata = {
  title: "Wishlist",
  description:
    "Your saved HSP Mart products — revisit favourites with live prices and stock.",
};

export default async function WishlistPage() {
  await loadSiteData();
  return <WishlistPageClient />;
}
