import type { Notification, NotificationType } from "@/types/notifications";
import { writeJsonStorage } from "@/lib/discovery";

export const NOTIFICATIONS_STORAGE_KEY = "hsp-mart-notifications";

const VALID_TYPES = new Set<NotificationType>([
  "ORDER_PLACED",
  "ORDER_CONFIRMED",
  "ORDER_SHIPPED",
  "ORDER_DELIVERED",
  "ORDER_CANCELLED",
  "PAYMENT_SUCCESSFUL",
  "QUOTE_SUBMITTED",
  "QUOTE_UPDATED",
  "QUOTE_APPROVED",
  "QUOTE_REJECTED",
  "CUSTOMIZATION_SAVED",
  "CUSTOMIZATION_UPDATED",
  "WISHLIST_PRICE_UPDATE",
  "PRODUCT_BACK_IN_STOCK",
  "ACCOUNT_SECURITY",
]);

/** Stable ids for demo-checkout events — prevents Strict Mode / rerender duplicates. */
export function checkoutDemoNotificationId(
  reference: string,
  event: "order-placed" | "payment-success" | "order-confirmed",
): string {
  return `checkout-demo:${reference}:${event}`;
}

/**
 * Frontend-only demo checkout notifications.
 * Links to existing account orders route — does not invent backend order IDs.
 */
export function createCheckoutDemoNotification(
  reference: string,
  event: "order-placed" | "payment-success" | "order-confirmed",
  now = Date.now(),
): Notification {
  const href = "/account/orders";
  const timestamp = new Date(now).toISOString();

  if (event === "order-placed") {
    return {
      id: checkoutDemoNotificationId(reference, event),
      type: "ORDER_PLACED",
      title: "Demo order recorded",
      message: `Demo reference ${reference} was recorded in this browser. No payment was taken.`,
      timestamp,
      read: true,
      href,
    };
  }

  if (event === "payment-success") {
    return {
      id: checkoutDemoNotificationId(reference, event),
      type: "PAYMENT_SUCCESSFUL",
      title: "Demo payment skipped",
      message: `No payment was processed for demo reference ${reference}.`,
      timestamp,
      read: true,
      href,
    };
  }

  return {
    id: checkoutDemoNotificationId(reference, event),
    type: "ORDER_CONFIRMED",
    title: "Demo checkout finished",
    message: `Demo reference ${reference} is complete. Nothing was sent to a fulfilment system.`,
    timestamp,
    read: true,
    href,
  };
}

/** Demo notifications for local storefront until a notifications API exists. */
export function createSeedNotifications(now = Date.now()): Notification[] {
  return [
    {
      id: "seed-order-shipped",
      type: "ORDER_SHIPPED",
      title: "Your order has shipped",
      message: "Vacuum Insulated Bottle 500ml is on its way.",
      timestamp: new Date(now - 2 * 60 * 1000).toISOString(),
      read: true,
      href: "/account/orders",
    },
    {
      id: "seed-quote-updated",
      type: "QUOTE_UPDATED",
      title: "Quote request updated",
      message: "Your bulk quote is being reviewed by our team.",
      timestamp: new Date(now - 60 * 60 * 1000).toISOString(),
      read: true,
      href: "/account/quotes",
    },
    {
      id: "seed-customization-saved",
      type: "CUSTOMIZATION_SAVED",
      title: "Customization saved",
      message: "Your product customization is ready to add to cart.",
      timestamp: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
      read: true,
      href: "/products",
    },
    {
      id: "seed-wishlist",
      type: "WISHLIST_PRICE_UPDATE",
      title: "Wishlist price update",
      message: "A saved item has a new price available.",
      timestamp: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
      read: true,
      href: "/account/wishlist",
    },
  ];
}

function isNotification(value: unknown): value is Notification {
  if (!value || typeof value !== "object") return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.id === "string" &&
    typeof entry.type === "string" &&
    VALID_TYPES.has(entry.type as NotificationType) &&
    typeof entry.title === "string" &&
    typeof entry.message === "string" &&
    typeof entry.timestamp === "string" &&
    typeof entry.read === "boolean" &&
    (entry.href === undefined || typeof entry.href === "string")
  );
}

export function sanitizeNotifications(value: unknown): Notification[] | null {
  if (!Array.isArray(value)) return null;
  const next: Notification[] = [];
  const seen = new Set<string>();

  for (const entry of value) {
    if (!isNotification(entry) || seen.has(entry.id)) continue;
    seen.add(entry.id);
    next.push({
      id: entry.id,
      type: entry.type,
      title: entry.title,
      message: entry.message,
      timestamp: entry.timestamp,
      read: entry.read,
      href: entry.href,
    });
  }

  return next;
}

export function readNotifications(): Notification[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (raw == null) {
      const seeded = createSeedNotifications();
      writeJsonStorage(NOTIFICATIONS_STORAGE_KEY, seeded);
      return seeded;
    }

    const parsed = sanitizeNotifications(JSON.parse(raw) as unknown);
    if (!parsed) {
      const seeded = createSeedNotifications();
      writeJsonStorage(NOTIFICATIONS_STORAGE_KEY, seeded);
      return seeded;
    }

    return parsed;
  } catch {
    return createSeedNotifications();
  }
}

export function writeNotifications(next: Notification[]) {
  writeJsonStorage(NOTIFICATIONS_STORAGE_KEY, next);
}

export function countUnread(notifications: Notification[]): number {
  return notifications.reduce((total, item) => total + (item.read ? 0 : 1), 0);
}

export function formatNotificationTime(
  timestamp: string,
  now = Date.now(),
): string {
  const then = Date.parse(timestamp);
  if (Number.isNaN(then)) return "";

  const diffMs = Math.max(0, now - then);
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours === 1 ? "1 hour ago" : `${hours} hours ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;

  return new Date(then).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
