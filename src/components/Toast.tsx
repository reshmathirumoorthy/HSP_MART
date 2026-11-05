"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./Toast.module.css";

type ToastProps = {
  message: string;
  action?: { label: string; onClick: () => void };
  duration?: number;
};

export function Toast({ message, action, duration = 5000 }: ToastProps) {
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<number | null>(null);

  const dismiss = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setVisible(false);
  }, []);

  useEffect(() => {
    timerRef.current = window.setTimeout(dismiss, duration);
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, [dismiss, duration]);

  if (!visible) return null;

  return (
    <div className={styles.toast} role="status" aria-live="polite">
      <p className={styles.message}>{message}</p>
      <div className={styles.actions}>
        {action ? (
          <button
            type="button"
            className={styles.actionBtn}
            onClick={() => {
              action.onClick();
              dismiss();
            }}
          >
            {action.label}
          </button>
        ) : null}
        <button type="button" className={styles.dismissBtn} onClick={dismiss}>
          Dismiss
        </button>
      </div>
    </div>
  );
}
