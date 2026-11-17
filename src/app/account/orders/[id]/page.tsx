import type { Metadata } from "next";
import Link from "next/link";
import { api, getOrNull } from "@/lib/api";
import { requireUser } from "@/lib/auth/dal";
import type { Order, QuoteRequest } from "@/data/account";
import { AccountShell } from "@/components/account/AccountShell";
import { OrderDetailView } from "@/components/account/OrderDetailView";
import styles from "@/components/account/account.module.css";
import { loadSiteData } from "@/lib/siteData.server";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await loadSiteData();
  const { id } = await params;
  const order = await getOrNull<Order>(`/account/orders/${encodeURIComponent(id)}`, { dates: false });
  return {
    title: order
      ? `Order ${order.reference} — HSP Mart`
      : "Order not found — HSP Mart",
  };
}

export default async function AccountOrderDetailPage({ params }: Props) {
  await loadSiteData();
  const { id } = await params;
  await requireUser(`/account/orders/${id}`);
  const order = await getOrNull<Order>(`/account/orders/${encodeURIComponent(id)}`, { dates: false });

  if (!order) {
    return (
      <AccountShell title="Order not found">
        <div className={styles.notFound}>
          <p className={styles.copy}>This order could not be found.</p>
          <Link href="/account/orders" className="btn btn--dark">
            Back to orders
          </Link>
        </div>
      </AccountShell>
    );
  }

  return (
    <AccountShell
      title={`Order ${order.reference}`}
      description="Live status from HSP fulfilment."
    >
      <OrderDetailView order={order} />
    </AccountShell>
  );
}
