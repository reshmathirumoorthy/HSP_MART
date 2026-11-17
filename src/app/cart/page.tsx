import type { Metadata } from "next";
import { CartPageClient } from "@/components/cart/CartPageClient";
import { loadSiteData } from "@/lib/siteData.server";

export const metadata: Metadata = {
  title: "Your Cart",
  description: "Review your HSP Mart cart before checkout.",
};

export default async function CartPage() {
  await loadSiteData();
  return <CartPageClient />;
}
