import type { Metadata } from "next";
import Link from "next/link";
import { getOrders } from "@/data/account";
import { AccountShell } from "@/components/account/AccountShell";
import { OrderCard } from "@/components/account/OrderCard";
import { EmptyState } from "@/components/EmptyState";
import styles from "@/components/account/account.module.css";

export const metadata: Metadata = {
  title: "Orders",
  description: "View your HSP Mart order history.",
};

export default function AccountOrdersPage() {
  const orders = getOrders();

  return (
    <AccountShell
      title="Orders"
      description="Demo order samples for UI preview — not live order history."
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
          copy="This page lists orders placed in the storefront demo. Browse the catalogue to start a purchase."
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
