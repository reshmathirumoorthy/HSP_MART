"use client";

import Link from "next/link";
import type { Product } from "@/data/products";
import type { CartCustomization } from "@/types/customization";
import { isInStock } from "@/lib/productAvailability";
import {
  getQuickAddCustomization,
  requiresProductBuildFlow,
} from "@/lib/productModel";
import { SavedVariantActions } from "@/components/cart/SavedVariantActions";
import styles from "./discovery.module.css";

type Props = {
  product: Product;
  addToCart: (
    productId: string,
    quantity?: number,
    customization?: CartCustomization,
  ) => boolean;
  openCart: () => void;
};

export function WishlistItemActions({ product, addToCart, openCart }: Props) {
  const inStock = isInStock(product);
  const buildFlow = requiresProductBuildFlow(product);

  if (!inStock) {
    return (
      <div className={styles.wishlistActions}>
        <span className={styles.wishlistStockOut}>Out of stock</span>
        <Link href={`/products/${product.slug}`} className="btn btn--ghost-dark">
          View product
        </Link>
      </div>
    );
  }

  if (buildFlow) {
    return (
      <div className={styles.wishlistActions}>
        <Link
          href={`/products/${product.slug}#customize`}
          className="btn btn--dark"
        >
          Customize &amp; add
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.wishlistActions}>
      <SavedVariantActions productId={product.id} />
      <button
        type="button"
        className="btn btn--dark"
        onClick={() => {
          const ok = addToCart(
            product.id,
            1,
            getQuickAddCustomization(product),
          );
          if (ok) openCart();
        }}
      >
        Add to cart
      </button>
    </div>
  );
}
