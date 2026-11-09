"use client";

import Link from "next/link";
import { productPriceLabel, type Product } from "@/data/products";
import {
  isInStock,
  productAvailabilityLabel,
} from "@/lib/productAvailability";
import { isProductCustomizable } from "@/lib/productModel";
import { ProductVisual } from "@/components/ProductVisual";
import type { ChatMessageAction } from "@/lib/ai-shopping";
import styles from "./AIShoppingAssistant.module.css";

type Props = {
  product: Product;
  wishlisted: boolean;
  onAction: (action: ChatMessageAction) => void;
};

export function AIProductResult({ product, wishlisted, onAction }: Props) {
  const customizable = isProductCustomizable(product);
  const inStock = isInStock(product);

  return (
    <article className={styles.productCard} role="listitem">
      <Link
        href={`/products/${product.slug}`}
        className={styles.productImageWrap}
        aria-label={`View ${product.name}`}
        tabIndex={-1}
      >
        <ProductVisual product={product} variant="compact" sizes="150px" />
      </Link>

      <button
        type="button"
        className={styles.wishlistHeart}
        aria-pressed={wishlisted}
        aria-label={
          wishlisted
            ? `Remove ${product.name} from wishlist`
            : `Save ${product.name} to wishlist`
        }
        onClick={() =>
          onAction({
            id: `wish-${product.id}`,
            label: "Wishlist",
            kind: "wishlist",
            productId: product.id,
          })
        }
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 20.5S4.5 15.9 4.5 9.7A4.6 4.6 0 0 1 12 6.6a4.6 4.6 0 0 1 7.5 3.1c0 6.2-7.5 10.8-7.5 10.8Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
            fill={wishlisted ? "currentColor" : "none"}
          />
        </svg>
      </button>

      <p className={styles.productCategory}>{product.category}</p>
      <h3 className={styles.productName}>
        <Link href={`/products/${product.slug}`}>{product.name}</Link>
      </h3>
      <p className={styles.productPrice}>
        {productPriceLabel(product)}
      </p>
      <p className={styles.productMeta}>
        {productAvailabilityLabel(product)}
        {customizable ? " · Customizable" : ""}
        {product.bulkAvailable ? " · Bulk" : ""}
      </p>

      <div className={styles.productActions}>
        <Link href={`/products/${product.slug}`} className={styles.cardBtn}>
          View
        </Link>
        <button
          type="button"
          className={styles.cardBtnPrimary}
          disabled={!inStock}
          aria-label={
            inStock ? `Add ${product.name} to cart` : `${product.name} is out of stock`
          }
          onClick={() =>
            onAction({
              id: `add-${product.id}`,
              label: "Add to cart",
              kind: "add_to_cart",
              productId: product.id,
              quantity: 1,
            })
          }
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M4 6h2.2l1.4 10h10.8l1.6-7H7"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Add
        </button>
      </div>
    </article>
  );
}
