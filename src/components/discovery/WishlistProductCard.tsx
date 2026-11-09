"use client";

import Link from "next/link";
import { formatPrice, productPriceLabel, type Product } from "@/data/products";
import { isInStock } from "@/lib/productAvailability";
import {
  canQuickAdd,
  getQuickAddCustomization,
  requiresProductBuildFlow,
} from "@/lib/productModel";
import { ProductVisual } from "@/components/ProductVisual";
import { WishlistButton } from "@/components/discovery/WishlistButton";
import { SavedVariantActions } from "@/components/cart/SavedVariantActions";
import type { CartCustomization } from "@/types/customization";
import styles from "./wishlist.module.css";

type Props = {
  product: Product;
  onWishlistRemoved: (product: Product, previousIndex: number) => void;
  addToCart: (
    productId: string,
    quantity?: number,
    customization?: CartCustomization,
  ) => boolean;
  openCart: () => void;
};

export function WishlistProductCard({
  product,
  onWishlistRemoved,
  addToCart,
  openCart,
}: Props) {
  const inStock = isInStock(product);
  const quickAdd = canQuickAdd(product);
  const buildFlow = requiresProductBuildFlow(product);
  const productHref = buildFlow
    ? `/products/${product.slug}#customize`
    : `/products/${product.slug}`;
  const showCompareAt =
    typeof product.compareAtPrice === "number" &&
    product.compareAtPrice > product.price;

  const handleAddToCart = () => {
    if (!quickAdd || !inStock) return;
    const ok = addToCart(product.id, 1, getQuickAddCustomization(product));
    if (ok) openCart();
  };

  return (
    <article className={styles.card}>
      <div className={styles.media}>
        <Link
          href={productHref}
          className={styles.mediaLink}
          aria-label={`View ${product.name}`}
        >
          <ProductVisual
            product={product}
            featured={product.featured}
            variant="card"
            sizes="(max-width: 560px) 47vw, (max-width: 900px) 45vw, (max-width: 1280px) 30vw, 21vw"
            useOriginalSrc
          />
        </Link>

        <span className={styles.heartWrap}>
          <WishlistButton product={product} onRemoved={onWishlistRemoved} />
        </span>

        {!inStock ? <span className={styles.stockBadge}>Out of stock</span> : null}
      </div>

      <div className={styles.meta}>
        <p className={styles.category}>{product.category}</p>
        <h3 className={styles.name}>
          <Link href={productHref} className={styles.nameLink}>
            {product.name}
          </Link>
        </h3>

        <div className={styles.priceRow}>
          <p className={styles.price}>
            {productPriceLabel(product)}
          </p>
          {showCompareAt ? (
            <p className={styles.compareAt}>
              {formatPrice(product.compareAtPrice!, product.currency)}
            </p>
          ) : null}
        </div>

        <div className={styles.variantSlot}>
          <SavedVariantActions productId={product.id} />
        </div>

        <div className={styles.actions}>
          {buildFlow ? (
            <Link href={productHref} className={styles.buildBtn}>
              Customize &amp; add
            </Link>
          ) : quickAdd ? (
            <button
              type="button"
              className={styles.addBtn}
              onClick={handleAddToCart}
              disabled={!inStock}
            >
              {inStock ? "Add to Cart" : "Out of stock"}
            </button>
          ) : (
            <Link href={productHref} className={styles.buildBtn}>
              View details
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
