import styles from "./account.module.css";

type Props = {
  label: string;
  tone?: "default" | "muted" | "warm";
};

export function StatusBadge({ label, tone = "default" }: Props) {
  const toneClass =
    tone === "muted"
      ? styles.statusMuted
      : tone === "warm"
        ? styles.statusWarm
        : styles.statusGood;

  return (
    <span className={`${styles.status} ${toneClass}`}>
      <span className={styles.statusDot} aria-hidden />
      <span>{label}</span>
    </span>
  );
}
