import type { Metadata } from "next";
import { CartPageClient } from "@/components/cart/CartPageClient";

export const metadata: Metadata = {
  title: "Your Cart",
  description: "Review your HSP Mart cart before checkout.",
};

export default function CartPage() {
  return <CartPageClient />;
}
