"use client";

import { useId } from "react";
import styles from "./QuantitySelector.module.css";

type Props = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
};

export function QuantitySelector({
  value,
  onChange,
  min = 1,
  max = 999,
  disabled = false,
}: Props) {
  const labelId = useId();
  const decrease = () => onChange(Math.max(min, value - 1));
  const increase = () => onChange(Math.min(max, value + 1));

  return (
    <div className={styles.wrap}>
      <p className={styles.label} id={labelId}>
        Quantity
      </p>
      <div className={styles.control} role="group" aria-labelledby={labelId}>
        <button
          type="button"
          className={styles.btn}
          onClick={decrease}
          disabled={disabled || value <= min}
          aria-label="Decrease quantity"
        >
          −
        </button>
        <input
          className={styles.value}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          aria-label="Quantity"
          value={value}
          disabled={disabled}
          onChange={(event) => {
            const raw = event.target.value.trim();
            if (raw === "") return;
            const next = Number.parseInt(raw, 10);
            if (!Number.isFinite(next)) return;
            onChange(Math.min(max, Math.max(min, next)));
          }}
        />
        <button
          type="button"
          className={styles.btn}
          onClick={increase}
          disabled={disabled || value >= max}
          aria-label="Increase quantity"
        >
          +
        </button>
      </div>
      {value >= max ? (
        <p className={styles.limit} role="status">
          Maximum {max} per order line.
        </p>
      ) : null}
    </div>
  );
}
