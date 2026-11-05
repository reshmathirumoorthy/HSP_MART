import type { Metadata } from "next";
import { CheckoutClient } from "@/components/checkout/CheckoutClient";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Complete your HSP Mart order demonstration.",
};

export default function CheckoutPage() {
  return <CheckoutClient />;
}
