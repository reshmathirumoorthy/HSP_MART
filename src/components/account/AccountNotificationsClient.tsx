"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useNotifications } from "@/context/NotificationContext";
import { formatNotificationTime } from "@/lib/notifications";
import type { NotificationType } from "@/types/notifications";
import styles from "./account.module.css";

function categoryLabel(type: NotificationType): string {
  if (type.startsWith("ORDER_") || type === "PAYMENT_SUCCESSFUL") return "Order";
  if (type.startsWith("QUOTE_")) return "Account";
  if (type.startsWith("CUSTOMIZATION_")) return "Account";
  if (type === "ACCOUNT_SECURITY") return "Account";
  if (type === "WISHLIST_PRICE_UPDATE" || type === "PRODUCT_BACK_IN_STOCK") {
    return "Promotion";
  }
  return "System";
}

export function AccountNotificationsClient() {
  const router = useRouter();
  const { notifications, unreadCount, hydrated, markAsRead, markAllAsRead } =
    useNotifications();

  if (!hydrated) {
    return <p className={styles.note}>Loading notifications…</p>;
  }

  return (
    <div className={styles.content}>
      <div className={styles.cardTop}>
        <p className={styles.note}>
          {unreadCount > 0
            ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`
            : "You’re all caught up."}
        </p>
        <button
          type="button"
          className={styles.ghost}
          disabled={unreadCount === 0}
          onClick={() => markAllAsRead()}
        >
          Mark all as read
        </button>
      </div>

      {notifications.length === 0 ? (
        <div className={styles.empty}>
          <h2 className={styles.emptyTitle}>No notifications yet</h2>
          <p className={styles.emptyCopy}>
            Order, quote, and saved-product updates for this device will show
            up here. Nothing is waiting right now.
          </p>
          <Link href="/products" className="btn btn--dark">
            Browse products
          </Link>
        </div>
      ) : (
        <ul className={styles.notificationList}>
          {notifications.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className={`${styles.notificationItem} ${
                  item.read ? "" : styles.notificationUnread
                }`}
                aria-label={
                  item.read
                    ? item.title
                    : `Unread: ${item.title}`
                }
                onClick={() => {
                  markAsRead(item.id);
                  if (item.href) router.push(item.href);
                }}
              >
                <span className={styles.notificationCategory}>
                  {categoryLabel(item.type)}
                </span>
                <span className={styles.notificationTitle}>
                  {item.title}
                  {!item.read ? (
                    <>
                      <span className="sr-only"> Unread</span>
                      <span className={styles.unreadDot} aria-hidden />
                    </>
                  ) : null}
                </span>
                <p className={styles.notificationMessage}>{item.message}</p>
                <p className={styles.notificationTime}>
                  {formatNotificationTime(item.timestamp)}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Link href="/account" className={styles.ghost}>
        Back to account
      </Link>
    </div>
  );
}
