"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { formatPrice, type Product } from "@/data/products";
import { isInStock } from "@/lib/productAvailability";
import {
  canQuickAdd,
  getQuickAddCustomization,
  requiresProductBuildFlow,
} from "@/lib/productModel";
import { ProductVisual } from "@/components/ProductVisual";
import { WishlistButton } from "@/components/discovery/WishlistButton";
import { useCart } from "@/context/CartContext";
import styles from "./ProductCard.module.css";
import discovery from "./discovery/discovery.module.css";

type Props = {
  product: Product;
  onWishlistRemoved?: (product: Product, previousIndex: number) => void;
  actions?: ReactNode;
};

export function ProductCard({
  product,
  onWishlistRemoved,
  actions,
}: Props) {
  const { addToCart, openCart } = useCart();
  const inStock = isInStock(product);
  const quickAdd = canQuickAdd(product);
  const buildFlow = requiresProductBuildFlow(product);
  const productHref = buildFlow
    ? `/products/${product.slug}#customize`
    : `/products/${product.slug}`;
  const showCompareAt =
    typeof product.compareAtPrice === "number" &&
    product.compareAtPrice > product.price;

  const primaryLabel = quickAdd
    ? "Add to Cart"
    : buildFlow
      ? "Configure"
      : "View details";

  const handleQuickAdd = () => {
    if (!quickAdd) return;
    const ok = addToCart(product.id, 1, getQuickAddCustomization(product));
    if (ok) openCart();
  };

  return (
    <article className={styles.card}>
      <div className={styles.visualWrap}>
        <div className={discovery.cardActions}>
          <WishlistButton product={product} onRemoved={onWishlistRemoved} />
        </div>
        {!inStock ? (
          <span className={styles.stockBadge}>Out of stock</span>
        ) : showCompareAt ? (
          <span className={styles.saleBadge}>Sale</span>
        ) : null}
        <Link
          href={productHref}
          className={styles.visualLink}
          aria-label={`View ${product.name}`}
        >
          <ProductVisual
            product={product}
            featured={product.featured}
            variant="card"
            sizes="(max-width: 640px) 92vw, (max-width: 1024px) 45vw, 280px"
            useOriginalSrc
          />
        </Link>
      </div>

      <div className={styles.meta}>
        <p className={styles.category}>{product.category}</p>
        <h3 className={styles.name}>
          <Link href={productHref}>{product.name}</Link>
        </h3>
        <div className={styles.priceRow}>
          <p className={styles.price}>
            {formatPrice(product.price, product.currency)}
          </p>
          {showCompareAt ? (
            <p className={styles.compare}>
              {formatPrice(product.compareAtPrice!, product.currency)}
            </p>
          ) : null}
        </div>

        <div className={styles.actions}>
          {quickAdd ? (
            <button
              type="button"
              className={`btn btn--forest ${styles.primaryAction}`}
              onClick={handleQuickAdd}
              disabled={!inStock}
            >
              {primaryLabel}
            </button>
          ) : (
            <Link
              href={productHref}
              className={`btn btn--forest ${styles.primaryAction}`}
            >
              {primaryLabel}
            </Link>
          )}
        </div>

        {actions ? <div className={styles.extraActions}>{actions}</div> : null}
      </div>
    </article>
  );
}
