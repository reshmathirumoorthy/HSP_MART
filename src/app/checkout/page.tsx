import type { Metadata } from "next";
import { CheckoutClient } from "@/components/checkout/CheckoutClient";
import { loadSiteData } from "@/lib/siteData.server";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Complete your HSP Mart order demonstration.",
};

export default async function CheckoutPage() {
  await loadSiteData();
  return <CheckoutClient />;
}
