import type { Metadata } from "next";
import Link from "next/link";
import { getOrderById } from "@/data/account";
import { AccountShell } from "@/components/account/AccountShell";
import { OrderDetailView } from "@/components/account/OrderDetailView";
import styles from "@/components/account/account.module.css";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const order = getOrderById(id);
  return {
    title: order
      ? `Order ${order.reference} — HSP Mart`
      : "Order not found — HSP Mart",
  };
}

export default async function AccountOrderDetailPage({ params }: Props) {
  const { id } = await params;
  const order = getOrderById(id);

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
      description="Demo order detail — not connected to live fulfilment."
    >
      <OrderDetailView order={order} />
    </AccountShell>
  );
}
