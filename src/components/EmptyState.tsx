import type { ReactNode } from "react";
import styles from "./EmptyState.module.css";

type Props = {
  label?: string;
  title: string;
  copy: string;
  children?: ReactNode;
  compact?: boolean;
};

export function EmptyState({
  label = "Nothing here yet",
  title,
  copy,
  children,
  compact = false,
}: Props) {
  return (
    <div
      className={`${styles.empty} ${compact ? styles.compact : ""}`}
      role="status"
    >
      <p className={styles.label}>{label}</p>
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.copy}>{copy}</p>
      {children ? <div className={styles.actions}>{children}</div> : null}
    </div>
  );
}
