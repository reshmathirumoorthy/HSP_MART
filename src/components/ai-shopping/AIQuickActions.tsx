"use client";

import type { ChatQuickAction } from "@/lib/ai-shopping";
import styles from "./AIShoppingAssistant.module.css";

type Props = {
  actions: ChatQuickAction[];
  onSelect: (prompt: string) => void;
};

function QuickActionIcon({ id }: { id: string }) {
  switch (id) {
    case "best-sellers":
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M3 12.5 12.5 3l8.5 8.5-9.5 9.5L3 12.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
          <circle cx="9" cy="9" r="1.4" fill="currentColor" />
        </svg>
      );
    case "delivery":
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M3 7h11v10H3zM14 10h4l3 3v4h-7" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
          <circle cx="7" cy="17" r="1.5" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="17" cy="17" r="1.5" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );
    case "bulk":
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M4 9l8-5 8 5v9l-8 4.5L4 18V9Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
          <path d="M4 9l8 4.5L20 9M12 13.5V22" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        </svg>
      );
    case "custom":
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 3l1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9L12 3Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M18.6 14.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
        </svg>
      );
    default:
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 5v3m0 8v3m7-7h-3M8 12H5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      );
  }
}

export function AIQuickActions({ actions, onSelect }: Props) {
  return (
    <div className={styles.quickActions} role="group" aria-label="Quick suggestions">
      {actions.map((action) => (
        <button
          key={action.id}
          type="button"
          className={styles.quickChip}
          onClick={() => onSelect(action.prompt)}
        >
          <QuickActionIcon id={action.id} />
          {action.label}
        </button>
      ))}
    </div>
  );
}
