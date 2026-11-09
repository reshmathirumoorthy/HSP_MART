"use client";

import type { MouseEvent } from "react";
import { useWishlist } from "@/context/WishlistContext";
import type { Product } from "@/data/products";
import styles from "./discovery.module.css";

type Props = {
  product: Product;
  /** Kept for call-site compatibility; both variants render the minimal heart control. */
  variant?: "icon" | "text" | "pill";
  /** Fired after a successful remove, with the index before removal (for undo). */
  onRemoved?: (product: Product, previousIndex: number) => void;
};

export function WishlistButton({
  product,
  variant = "icon",
  onRemoved,
}: Props) {
  const { ids, isWishlisted, toggleWishlist, hydrated } = useWishlist();
  const saved = hydrated && isWishlisted(product.id);
  const label = saved ? "Remove from wishlist" : "Add to wishlist";
  const tooltip = saved ? "Remove from wishlist" : "Add to wishlist";

  const handleToggle = (event?: MouseEvent<HTMLButtonElement>) => {
    event?.preventDefault();
    event?.stopPropagation();
    const wasSaved = isWishlisted(product.id);
    const previousIndex = ids.indexOf(product.id);
    const nowSaved = toggleWishlist(product.id);
    if (wasSaved && !nowSaved && previousIndex >= 0) {
      onRemoved?.(product, previousIndex);
    }
  };

  if (variant === "pill") {
    return (
      <button
        type="button"
        className={`${styles.pill} ${saved ? styles.pillActive : ""}`}
        aria-pressed={saved}
        aria-label={label}
        onClick={handleToggle}
      >
        <HeartIcon filled={saved} />
        <span aria-hidden="true">{saved ? "Saved" : "Save"}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      className={`${styles.iconBtn} ${saved ? styles.iconBtnActive : ""} ${
        variant === "text" ? styles.iconBtnInline : ""
      }`}
      aria-pressed={saved}
      aria-label={label}
      title={tooltip}
      onClick={handleToggle}
    >
      <HeartIcon filled={saved} />
    </button>
  );
}

/** Lucide-style outline/filled heart (inline SVG — lucide-react is not a dependency). */
function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      className={`${styles.heartIcon} ${filled ? styles.heartIconFilled : ""}`}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"
        className={styles.heartPath}
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
