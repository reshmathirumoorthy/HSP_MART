import type { Metadata } from "next";
import { api, getOrNull } from "@/lib/api";
import { requireUser } from "@/lib/auth/dal";
import type { Order, QuoteRequest } from "@/data/account";
import { AccountShell } from "@/components/account/AccountShell";
import { AccountDashboard } from "@/components/account/AccountDashboard";
import { loadSiteData } from "@/lib/siteData.server";

export const metadata: Metadata = {
  title: "Account",
  description: "Your HSP Mart customer account overview.",
};

export default async function AccountPage() {
  await loadSiteData();
  await requireUser("/account");
  const [orders, quotes] = await Promise.all([
    api.get<Order[]>("/account/orders", { dates: false }),
    api.get<QuoteRequest[]>("/account/quotes", { dates: false }),
  ]);

  return (
    <AccountShell showWelcome>
      <AccountDashboard
        recentOrders={orders.slice(0, 2)}
        recentQuotes={quotes.slice(0, 2)}
        orderCount={orders.length}
        quoteCount={quotes.length}
      />
    </AccountShell>
  );
}
