"use client";

import Link from "next/link";
import { formatPrice, type Product } from "@/data/products";
import {
  isInStock,
  productAvailabilityLabel,
} from "@/lib/productAvailability";
import {
  canQuickAdd,
  getProductCapabilityLabels,
  getQuickAddCustomization,
  requiresProductBuildFlow,
} from "@/lib/productModel";
import { ProductVisual } from "@/components/ProductVisual";
import { WishlistButton } from "@/components/discovery/WishlistButton";
import { useCart } from "@/context/CartContext";
import styles from "./ProductPreview.module.css";
import discovery from "./discovery/discovery.module.css";

type Props = {
  product: Product;
  featured?: boolean;
  rail?: boolean;
};

export function PreviewProductCard({
  product,
  featured = false,
  rail = false,
}: Props) {
  const { addToCart, openCart } = useCart();
  const inStock = isInStock(product);
  const quickAdd = canQuickAdd(product);
  const buildFlow = requiresProductBuildFlow(product);
  const productHref = buildFlow
    ? `/products/${product.slug}#customize`
    : `/products/${product.slug}`;
  const indicators = getProductCapabilityLabels(product);
  const showCompareAt =
    typeof product.compareAtPrice === "number" &&
    product.compareAtPrice > product.price;

  return (
    <article
      className={`${styles.card} ${featured ? styles.featured : ""} ${rail ? styles.railCard : ""} ${!featured && !rail ? styles.support : ""}`}
    >
      <div className={styles.visualStage}>
        <div className={discovery.cardActions}>
          <WishlistButton product={product} />
        </div>
        <Link
          href={productHref}
          className={styles.visualWrap}
          aria-label={`View ${product.name}`}
        >
          <ProductVisual
            product={product}
            featured={featured}
            variant="card"
            hoverReveal
            sizes="(max-width: 900px) 80vw, 360px"
          />
          {!inStock ? (
            <span className={styles.stockBadge}>Out of stock</span>
          ) : null}
        </Link>
      </div>
      <div className={styles.meta}>
        <p className={styles.category}>{product.category}</p>
        <h3 className={styles.name}>
          <Link href={productHref}>{product.name}</Link>
        </h3>
        <p className={styles.sku}>SKU {product.sku}</p>
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
        <p className={styles.availability}>
          {productAvailabilityLabel(product)}
        </p>
        {indicators.length > 0 ? (
          <p className={styles.indicators}>{indicators.join(" · ")}</p>
        ) : null}
        <div className={styles.actions}>
          {quickAdd ? (
            <button
              type="button"
              className={`btn btn--primary ${styles.addBtn}`}
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
          ) : (
            <Link
              href={productHref}
              className={`btn ${buildFlow ? "btn--outline" : "btn--primary"} ${styles.addBtn}`}
            >
              {buildFlow ? "Configure" : inStock ? "View product" : "View details"}
            </Link>
          )}
          <Link href={productHref} className={`link-quiet ${styles.view}`}>
            {quickAdd || !inStock ? "View" : "Details"}
            <span aria-hidden> →</span>
          </Link>
        </div>
      </div>
    </article>
  );
}
