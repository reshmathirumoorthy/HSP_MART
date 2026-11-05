"use client";

import { useSyncExternalStore } from "react";
import { getProductById } from "@/lib/cart";
import { useCart } from "@/context/CartContext";
import {
  getSavedVariantsServerSnapshot,
  getSavedVariantsSnapshot,
  removeSavedVariant,
  subscribeSavedVariants,
} from "@/lib/savedVariants";
import { useClientHydrated } from "@/hooks/useClientHydrated";
import styles from "./SavedVariants.module.css";

export function SavedVariants() {
  const hydrated = useClientHydrated();
  const { addToCart } = useCart();

  const records = useSyncExternalStore(
    subscribeSavedVariants,
    () => (hydrated ? getSavedVariantsSnapshot() : getSavedVariantsServerSnapshot()),
    getSavedVariantsServerSnapshot,
  );

  if (records.length === 0) return null;

  return (
    <section className={styles.section} aria-label="Saved colours">
      <h2 className={styles.title}>Saved colours</h2>
      <p className={styles.copy}>
        These colours stay separate from the product wishlist. Moving one back
        to the cart keeps its colour.
      </p>
      <ul className={styles.list}>
        {records.map((record) => {
          const product = getProductById(record.productId);
          if (!product) return null;
          return (
            <li key={`${record.productId}:${record.variantId}`}>
              <p>
                {product.name}
                <span>Colour: {record.variantLabel}</span>
              </p>
              <button
                type="button"
                onClick={() => {
                  const ok = addToCart(record.productId, 1, {
                    variantId: record.variantId,
                    variantLabel: record.variantLabel,
                  });
                  if (ok) {
                    removeSavedVariant(record.productId, record.variantId);
                  }
                }}
              >
                Move {record.variantLabel} to cart
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
