"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { Notification } from "@/types/notifications";
import {
  NOTIFICATIONS_STORAGE_KEY,
  countUnread,
  createSeedNotifications,
  readNotifications,
  sanitizeNotifications,
  writeNotifications,
} from "@/lib/notifications";
import { useClientHydrated } from "@/hooks/useClientHydrated";

type NotificationContextValue = {
  notifications: Notification[];
  unreadCount: number;
  hydrated: boolean;
  /** Idempotent by `notification.id` — safe under Strict Mode / repeated calls. */
  addNotification: (notification: Notification) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
};

const NotificationContext = createContext<NotificationContextValue | null>(
  null,
);

const EMPTY: Notification[] = [];
const CHANGE_EVENT = "hsp-mart-notifications-change";

let cachedSerialized = "__unset__";
let cachedNotifications: Notification[] = EMPTY;

function emitChange() {
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(onStoreChange: () => void) {
  const handle = () => onStoreChange();
  window.addEventListener("storage", handle);
  window.addEventListener(CHANGE_EVENT, handle);
  return () => {
    window.removeEventListener("storage", handle);
    window.removeEventListener(CHANGE_EVENT, handle);
  };
}

function getServerSnapshot() {
  return EMPTY;
}

function readStored(): Notification[] {
  try {
    const raw = window.localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (raw == null) {
      cachedSerialized = "__empty__";
      cachedNotifications = EMPTY;
      return EMPTY;
    }

    if (raw === cachedSerialized) return cachedNotifications;

    const parsed = sanitizeNotifications(JSON.parse(raw) as unknown);
    cachedSerialized = raw;
    cachedNotifications = parsed ?? EMPTY;
    return cachedNotifications;
  } catch {
    cachedSerialized = "__empty__";
    cachedNotifications = EMPTY;
    return EMPTY;
  }
}

function commit(next: Notification[]) {
  writeNotifications(next);
  cachedSerialized = JSON.stringify(next);
  cachedNotifications = next;
  emitChange();
}

function ensureSeeded() {
  try {
    const raw = window.localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (raw == null) {
      commit(createSeedNotifications());
      return;
    }

    const parsed = sanitizeNotifications(JSON.parse(raw) as unknown);
    if (!parsed) {
      commit(createSeedNotifications());
    }
  } catch {
    commit(createSeedNotifications());
  }
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const hydrated = useClientHydrated();

  useEffect(() => {
    if (!hydrated) return;
    ensureSeeded();
  }, [hydrated]);

  const notifications = useSyncExternalStore(
    subscribe,
    () => (hydrated ? readStored() : EMPTY),
    getServerSnapshot,
  );

  const addNotification = useCallback((notification: Notification) => {
    const current = readNotifications();
    if (current.some((item) => item.id === notification.id)) return;
    commit([notification, ...current]);
  }, []);

  const markAsRead = useCallback((id: string) => {
    const current = readNotifications();
    let changed = false;
    const next = current.map((item) => {
      if (item.id !== id || item.read) return item;
      changed = true;
      return { ...item, read: true };
    });
    if (changed) commit(next);
  }, []);

  const markAllAsRead = useCallback(() => {
    const current = readNotifications();
    if (!current.some((item) => !item.read)) return;
    commit(current.map((item) => ({ ...item, read: true })));
  }, []);

  const value = useMemo<NotificationContextValue>(
    () => ({
      notifications,
      unreadCount: countUnread(notifications),
      hydrated,
      addNotification,
      markAsRead,
      markAllAsRead,
    }),
    [notifications, hydrated, addNotification, markAsRead, markAllAsRead],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error("useNotifications must be used within NotificationProvider");
  }
  return ctx;
}
