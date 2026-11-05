import Link from "next/link";
import { formatPrice } from "@/data/products";
import {
  formatAccountDate,
  orderStatusLabel,
  type Order,
} from "@/data/account";
import { StatusBadge } from "@/components/account/StatusBadge";
import styles from "./account.module.css";

type Props = {
  order: Order;
};

function statusTone(status: Order["status"]) {
  if (status === "cancelled") return "muted" as const;
  if (status === "processing" || status === "confirmed") return "warm" as const;
  return "default" as const;
}

export function OrderCard({ order }: Props) {
  return (
    <article className={styles.orderCard}>
      <div className={styles.orderInfo}>
        <h3 className={styles.orderRef}>{order.reference}</h3>
        <p className={styles.orderMeta}>
          <span>{formatAccountDate(order.placedAt)}</span>
          <span className={styles.metaDot} aria-hidden="true" />
          <span>
            {order.itemCount} {order.itemCount === 1 ? "item" : "items"}
          </span>
        </p>
      </div>
      <div className={styles.orderFigure}>
        <p className={styles.orderTotal}>{formatPrice(order.total)}</p>
        <StatusBadge
          label={orderStatusLabel(order.status)}
          tone={statusTone(order.status)}
        />
      </div>
      <Link href={`/account/orders/${order.id}`} className={styles.cardAction}>
        View order
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 12h14" />
          <path d="m13 6 6 6-6 6" />
        </svg>
      </Link>
    </article>
  );
}
