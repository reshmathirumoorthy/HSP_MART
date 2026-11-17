"use client";

/**
 * Account inbox: the real messages HSP sent this customer (order, payment, dispatch, quote, credit
 * note), from /api/account/notifications. Signed-out visitors have an empty inbox.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Notification } from "@/types/notifications";
import { clientApi } from "@/lib/clientApi";
import { useAccountSession } from "@/hooks/useAccountSession";

type NotificationContextValue = {
  notifications: Notification[];
  unreadCount: number;
  hydrated: boolean;
  /** Shows an in-session notice immediately (e.g. right after checkout) until the inbox refreshes. */
  addNotification: (notification: Notification) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  refresh: () => void;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user, ready } = useAccountSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(() => {
    if (!user) return;
    clientApi<Notification[]>("/account/notifications")
      .then(setNotifications)
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [user]);

  useEffect(() => {
    if (ready && user) refresh();
  }, [ready, user, refresh]);

  const addNotification = useCallback((n: Notification) => {
    setNotifications((cur) => (cur.some((x) => x.id === n.id) ? cur : [n, ...cur]));
  }, []);

  const markAsRead = useCallback(
    (id: string) => {
      setNotifications((cur) => cur.map((n) => (n.id === id ? { ...n, read: true } : n)));
      if (user) clientApi("/account/notifications/read", { body: { ids: [id] } }).catch(() => {});
    },
    [user],
  );

  const markAllAsRead = useCallback(() => {
    setNotifications((cur) => cur.map((n) => ({ ...n, read: true })));
    if (user) clientApi("/account/notifications/read", { body: { ids: null } }).catch(() => {});
  }, [user]);

  const value = useMemo<NotificationContextValue>(
    () => ({
      notifications,
      unreadCount: notifications.filter((n) => !n.read).length,
      hydrated: ready && (!user || loaded),
      addNotification,
      markAsRead,
      markAllAsRead,
      refresh,
    }),
    [notifications, ready, user, loaded, addNotification, markAsRead, markAllAsRead, refresh],
  );
  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
}
