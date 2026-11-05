import type { Metadata } from "next";
import { WishlistPageClient } from "@/components/discovery/WishlistPageClient";

export const metadata: Metadata = {
  title: "Wishlist",
  description:
    "Your saved HSP Mart products — revisit favourites with live prices and stock.",
};

export default function WishlistPage() {
  return <WishlistPageClient />;
}
