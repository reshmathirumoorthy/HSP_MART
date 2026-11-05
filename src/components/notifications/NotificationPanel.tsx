"use client";

import { useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import { useNotifications } from "@/context/NotificationContext";
import { formatNotificationTime } from "@/lib/notifications";
import type { Notification, NotificationType } from "@/types/notifications";
import styles from "./NotificationPanel.module.css";

type Props = {
  id: string;
  onClose: () => void;
};

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="17"
      height="17"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const TYPE_ICONS: Record<NotificationType, ReactNode> = {
  ORDER_PLACED: (
    <Icon>
      <path d="M6 7h12l1.4 12a1.6 1.6 0 0 1-1.6 1.8H6.2A1.6 1.6 0 0 1 4.6 19L6 7Z" />
      <path d="M9 10.5V6a3 3 0 0 1 6 0v4.5" />
    </Icon>
  ),
  ORDER_CONFIRMED: (
    <Icon>
      <path d="M6 7h12l1.4 12a1.6 1.6 0 0 1-1.6 1.8H6.2A1.6 1.6 0 0 1 4.6 19L6 7Z" />
      <path d="m9.5 13.5 2 2 3.5-3.5" />
    </Icon>
  ),
  ORDER_SHIPPED: (
    <Icon>
      <path d="M3 7h11v10H3z" />
      <path d="M14 10h4l3 3v4h-7" />
      <circle cx="7" cy="17" r="1.4" />
      <circle cx="17" cy="17" r="1.4" />
    </Icon>
  ),
  ORDER_DELIVERED: (
    <Icon>
      <path d="M3 7h11v10H3z" />
      <path d="M14 10h4l3 3v4h-7" />
      <circle cx="7" cy="17" r="1.4" />
      <circle cx="17" cy="17" r="1.4" />
      <path d="m16.2 12.6 1.2 1.2 2.2-2.2" />
    </Icon>
  ),
  ORDER_CANCELLED: (
    <Icon>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m9.5 9.5 5 5m0-5-5 5" />
    </Icon>
  ),
  PAYMENT_SUCCESSFUL: (
    <Icon>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m8.8 12.3 2.2 2.2 4.2-4.4" />
    </Icon>
  ),
  QUOTE_SUBMITTED: (
    <Icon>
      <path d="M7 3.5h7L18.5 8v12a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 20V5A1.5 1.5 0 0 1 7 3.5Z" />
      <path d="M13.5 3.5V8H18" />
      <path d="M9 12.5h6M9 16h4" />
    </Icon>
  ),
  QUOTE_UPDATED: (
    <Icon>
      <path d="M7 3.5h7L18.5 8v12a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 20V5A1.5 1.5 0 0 1 7 3.5Z" />
      <path d="M13.5 3.5V8H18" />
      <path d="M9 12.5h6M9 16h4" />
    </Icon>
  ),
  QUOTE_APPROVED: (
    <Icon>
      <path d="M7 3.5h7L18.5 8v12a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 20V5A1.5 1.5 0 0 1 7 3.5Z" />
      <path d="M13.5 3.5V8H18" />
      <path d="m9.5 14.6 1.8 1.8 3-3.2" />
    </Icon>
  ),
  QUOTE_REJECTED: (
    <Icon>
      <path d="M7 3.5h7L18.5 8v12a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 20V5A1.5 1.5 0 0 1 7 3.5Z" />
      <path d="M13.5 3.5V8H18" />
      <path d="m10 12.5 4 4m0-4-4 4" />
    </Icon>
  ),
  CUSTOMIZATION_SAVED: (
    <Icon>
      <path d="m4.5 19.5 4.2-1L19 8.2a2.05 2.05 0 0 0-2.9-2.9L5.8 15.5l-1.3 4Z" />
      <path d="m13.5 7 3 3" />
    </Icon>
  ),
  CUSTOMIZATION_UPDATED: (
    <Icon>
      <path d="m4.5 19.5 4.2-1L19 8.2a2.05 2.05 0 0 0-2.9-2.9L5.8 15.5l-1.3 4Z" />
      <path d="m13.5 7 3 3" />
    </Icon>
  ),
  WISHLIST_PRICE_UPDATE: (
    <Icon>
      <path d="M4 11V5.5A1.5 1.5 0 0 1 5.5 4H11l9 9-6.5 6.5-9-9Z" />
      <circle cx="8.5" cy="8.5" r="1.2" />
    </Icon>
  ),
  PRODUCT_BACK_IN_STOCK: (
    <Icon>
      <path d="M6 7h12l1.4 12a1.6 1.6 0 0 1-1.6 1.8H6.2A1.6 1.6 0 0 1 4.6 19L6 7Z" />
      <path d="M9 10.5V6a3 3 0 0 1 6 0v4.5" />
    </Icon>
  ),
  ACCOUNT_SECURITY: (
    <Icon>
      <path d="M12 3 5 6v6c0 4.5 3 7.6 7 9 4-1.4 7-4.5 7-9V6l-7-3Z" />
      <path d="m9.8 12 1.6 1.6 2.8-2.8" />
    </Icon>
  ),
};

function notificationIcon(type: NotificationType): ReactNode {
  return TYPE_ICONS[type] ?? TYPE_ICONS.ORDER_PLACED;
}

function NotificationRow({
  item,
  onRead,
}: {
  item: Notification;
  onRead: (id: string) => void;
}) {
  return (
    <li>
      <button
        type="button"
        className={`${styles.item} ${item.read ? "" : styles.itemUnread}`}
        onClick={() => onRead(item.id)}
        aria-label={item.read ? item.title : `${item.title} — unread`}
      >
        <span className={styles.itemIcon} aria-hidden="true">
          {notificationIcon(item.type)}
        </span>
        <span className={styles.itemBody}>
          <span className={styles.itemTitle}>{item.title}</span>
          <span className={styles.message}>{item.message}</span>
          <span className={styles.time} suppressHydrationWarning>
            {formatNotificationTime(item.timestamp)}
          </span>
        </span>
        {!item.read ? (
          <span className={styles.unreadDot} aria-hidden="true" />
        ) : null}
      </button>
    </li>
  );
}

export function NotificationPanel({ id, onClose }: Props) {
  const {
    notifications,
    unreadCount,
    hydrated,
    markAsRead,
    markAllAsRead,
  } = useNotifications();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  const unreadLabel =
    unreadCount === 1 ? "1 unread" : `${unreadCount} unread`;

  return (
    <div
      id={id}
      ref={panelRef}
      className={styles.panel}
      role="dialog"
      aria-label="Notifications"
      tabIndex={-1}
    >
      <div className={styles.header}>
        <h2 className={styles.title}>Notifications</h2>
        <div className={styles.headerMeta}>
          {unreadCount > 0 ? (
            <span className={styles.unreadBadge}>{unreadLabel}</span>
          ) : null}
          <button
            type="button"
            className={styles.markAll}
            disabled={!hydrated || unreadCount === 0}
            onClick={() => markAllAsRead()}
          >
            Mark all as read
          </button>
        </div>
      </div>

      {!hydrated ? (
        <div className={styles.loadingList} aria-hidden="true">
          {[0, 1, 2].map((row) => (
            <div key={row} className={styles.loadingRow}>
              <span className={styles.loadingIcon} />
              <span className={styles.loadingLines}>
                <span className={styles.loadingLine} />
                <span className={`${styles.loadingLine} ${styles.loadingLineShort}`} />
              </span>
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon} aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              width="34"
              height="34"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6.3 9.6a5.7 5.7 0 0 1 11.4 0c0 4.5 1.7 5.7 1.7 5.7H4.6s1.7-1.2 1.7-5.7Z" />
              <path d="M10.2 19a2 2 0 0 0 3.6 0" />
            </svg>
          </span>
          <p className={styles.emptyTitle}>You’re all caught up!</p>
          <p className={styles.emptyCopy}>No new notifications right now.</p>
        </div>
      ) : (
        <ul className={styles.list}>
          {notifications.map((item) => (
            <NotificationRow key={item.id} item={item} onRead={markAsRead} />
          ))}
        </ul>
      )}

      <div className={styles.footer}>
        <Link
          href="/account/notifications"
          className={styles.viewAll}
          onClick={onClose}
        >
          View all notifications
          <svg
            viewBox="0 0 24 24"
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M5 12h14" />
            <path d="m13 6 6 6-6 6" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
