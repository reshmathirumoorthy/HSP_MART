import type { Metadata } from "next";
import Link from "next/link";
import { api, getOrNull } from "@/lib/api";
import { requireUser } from "@/lib/auth/dal";
import type { Order, QuoteRequest } from "@/data/account";
import { AccountShell } from "@/components/account/AccountShell";
import { OrderCard } from "@/components/account/OrderCard";
import { EmptyState } from "@/components/EmptyState";
import styles from "@/components/account/account.module.css";
import { loadSiteData } from "@/lib/siteData.server";

export const metadata: Metadata = {
  title: "Orders",
  description: "View your HSP Mart order history.",
};

export default async function AccountOrdersPage() {
  await loadSiteData();
  await requireUser("/account/orders");
  const orders = await api.get<Order[]>("/account/orders", { dates: false });

  return (
    <AccountShell
      title="Orders"
      description="Every order placed with HSP from this account."
    >
      {orders.length ? (
        <div className={styles.cardList}>
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      ) : (
        <EmptyState
          label="Orders"
          title="No orders yet"
          copy="Orders you place in the store or from an HSP quotation appear here."
          compact
        >
          <Link href="/products" className="btn btn--dark">
            Start shopping
          </Link>
        </EmptyState>
      )}
    </AccountShell>
  );
}
