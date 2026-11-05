"use client";

import { useCompare } from "@/context/CompareContext";
import type { Product } from "@/data/products";
import styles from "./discovery.module.css";

type Props = {
  product: Product;
  variant?: "chip" | "text";
};

export function CompareButton({ product, variant = "chip" }: Props) {
  const { isInCompare, toggleCompare, hydrated } = useCompare();
  const active = hydrated && isInCompare(product.id);
  const label = active
    ? `Remove ${product.name} from comparison`
    : `Add ${product.name} to comparison`;

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
