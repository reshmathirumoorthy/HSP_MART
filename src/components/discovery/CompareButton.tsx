"use client";

import { useCompare } from "@/context/CompareContext";
import type { Product } from "@/data/products";
import styles from "./discovery.module.css";

type Props = {
  product: Product;
  variant?: "chip" | "text" | "pill";
};

export function CompareButton({ product, variant = "chip" }: Props) {
  const { isInCompare, toggleCompare, hydrated } = useCompare();
  const active = hydrated && isInCompare(product.id);
  const label = active
    ? `Remove ${product.name} from comparison`
    : `Add ${product.name} to comparison`;

  if (variant === "pill") {
    return (
      <button
        type="button"
        className={`${styles.pill} ${active ? styles.pillActive : ""}`}
        aria-pressed={active}
        aria-label={label}
        onClick={() => toggleCompare(product.id)}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M7 4v16M7 20l-3-3M7 20l3-3M17 20V4M17 4l-3 3M17 4l3 3" />
        </svg>
        <span aria-hidden="true">{active ? "Comparing" : "Compare"}</span>
      </button>
    );
  }

  if (variant === "text") {
    return (
      <button
        type="button"
        className={`${styles.pdpGhost} ${active ? styles.pdpGhostActive : ""}`}
        aria-pressed={active}
        aria-label={label}
        onClick={() => toggleCompare(product.id)}
      >
        {active ? "In comparison" : "Compare"}
      </button>
    );
  }

  return (
    <button
      type="button"
      className={`${styles.compareChip} ${active ? styles.compareChipActive : ""}`}
      aria-pressed={active}
      aria-label={label}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        toggleCompare(product.id);
      }}
    >
      {active ? "Comparing" : "Compare"}
    </button>
  );
}
