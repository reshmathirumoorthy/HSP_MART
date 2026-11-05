"use client";

import styles from "./CartQuantityControl.module.css";

type Props = {
  value: number;
  onIncrease: () => void;
  onDecrease: () => void;
  productName: string;
  disabled?: boolean;
  /** Numeric stock ceiling when available — never invent a max. */
  max?: number;
};

export function CartQuantityControl({
  value,
  onIncrease,
  onDecrease,
  productName,
  disabled = false,
  max,
}: Props) {
  const atMin = value <= 1;
  const atMax =
    typeof max === "number" && Number.isFinite(max) ? value >= max : value >= 999;

  return (
    <div
      className={styles.control}
      role="group"
      aria-label={`Quantity for ${productName}`}
    >
      <button
        type="button"
        className={styles.btn}
        onClick={onDecrease}
        disabled={disabled || atMin}
        aria-label={`Decrease quantity of ${productName}`}
      >
        −
      </button>
      <span className={styles.value} aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        className={styles.btn}
        onClick={onIncrease}
        disabled={disabled || atMax}
        aria-label={`Increase quantity of ${productName}`}
      >
        +
      </button>
    </div>
  );
}
