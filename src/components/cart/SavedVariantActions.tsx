"use client";

import { useSyncExternalStore } from "react";
import { useCart } from "@/context/CartContext";
import {
  getSavedVariantsServerSnapshot,
  getSavedVariantsSnapshot,
  removeSavedVariant,
  subscribeSavedVariants,
} from "@/lib/savedVariants";
import { useClientHydrated } from "@/hooks/useClientHydrated";
import styles from "./SavedVariants.module.css";

type Props = {
  productId: string;
};

export function SavedVariantActions({ productId }: Props) {
  const hydrated = useClientHydrated();
  const { addToCart, openCart } = useCart();

  const records = useSyncExternalStore(
    subscribeSavedVariants,
    () => (hydrated ? getSavedVariantsSnapshot() : getSavedVariantsServerSnapshot()),
    getSavedVariantsServerSnapshot,
  );

  const matches = records.filter((record) => record.productId === productId);
  if (matches.length === 0) return null;

  return (
    <div className={styles.actions}>
      {matches.map((record) => (
        <button
          key={record.variantId}
          type="button"
          onClick={() => {
            const ok = addToCart(productId, 1, {
              variantId: record.variantId,
              variantLabel: record.variantLabel,
            });
            if (!ok) return;
            removeSavedVariant(record.productId, record.variantId);
            openCart();
          }}
        >
          Add {record.variantLabel} to cart
        </button>
      ))}
    </div>
  );
}
