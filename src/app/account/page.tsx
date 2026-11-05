import type { Metadata } from "next";
import { getOrders, getQuotes } from "@/data/account";
import { AccountShell } from "@/components/account/AccountShell";
import { AccountDashboard } from "@/components/account/AccountDashboard";

export const metadata: Metadata = {
  title: "Account",
  description: "Your HSP Mart customer account overview.",
};

export default function AccountPage() {
  const orders = getOrders();
  const quotes = getQuotes();

  return (
    <AccountShell showWelcome>
      <AccountDashboard
        recentOrders={orders.slice(0, 2)}
        recentQuotes={quotes.slice(0, 2)}
        demoOrderCount={orders.length}
        demoQuoteCount={quotes.length}
      />
    </AccountShell>
  );
}
