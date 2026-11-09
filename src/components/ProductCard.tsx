"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Check, FilePlus2, ShoppingBag } from "lucide-react";
import { formatPrice, productPriceLabel, type Product } from "@/data/products";
import { isInStock } from "@/lib/productAvailability";
import {
  canQuickAdd,
  getQuickAddCustomization,
  isProductCustomizable,
  requiresProductBuildFlow,
} from "@/lib/productModel";
import { ProductVisual } from "@/components/ProductVisual";
import { displayName } from "@/lib/displayName";
import { WishlistButton } from "@/components/discovery/WishlistButton";
import { useCart } from "@/context/CartContext";
import { useQuoteSheet } from "@/context/QuoteSheetContext";
import discovery from "./discovery/discovery.module.css";
import styles from "./ProductCard.module.css";

type Props = {
  product: Product;
  onWishlistRemoved?: (product: Product, previousIndex: number) => void;
  actions?: ReactNode;
};

/**
 * Boutique gift card: photo on warm ivory, serif name and price, and two
 * actions — buy one now, or add the gift to the corporate quote request.
 */
export function ProductCard({ product, onWishlistRemoved, actions }: Props) {
  const { addToCart, openCart } = useCart();
  const sheet = useQuoteSheet();
  const inStock = isInStock(product);
  const quickAdd = canQuickAdd(product);
  const buildFlow = requiresProductBuildFlow(product);
  const onRequest = Boolean(product.priceOnRequest) || product.price <= 0;
  const onSheet = sheet.has(product.slug);
  const productHref = buildFlow
    ? `/products/${product.slug}#customize`
    : `/products/${product.slug}`;
  const showCompareAt =
    typeof product.compareAtPrice === "number" &&
    product.compareAtPrice > product.price;

  // One quiet line of order facts, only where the data supports it.
  const facts: string[] = [];
  if (onRequest) facts.push("Made to order");
  if (product.minOrderQuantity) facts.push(`Min. ${product.minOrderQuantity}`);
  if (isProductCustomizable(product)) facts.push("Can be personalised");
  const note = facts.join(" · ");

  const handleQuickAdd = () => {
    if (!quickAdd) return;
    const ok = addToCart(product.id, 1, getQuickAddCustomization(product));
    if (ok) openCart();
  };

  return (
    <article className={styles.plate} data-on-sheet={onSheet || undefined}>
      <div className={styles.figure}>
        <Link href={productHref} aria-label={`View ${product.name}`} className={styles.figureLink}>
          <ProductVisual
            product={product}
            featured={product.featured}
            variant="card"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 300px"
          />
        </Link>
        {onSheet ? (
          <span className={styles.stamp}>
            <Check aria-hidden /> In your quote
          </span>
        ) : null}
        {!inStock ? <span className={styles.flag}>Out of stock</span> : null}
        <div className={discovery.cardActions}>
          <WishlistButton product={product} onRemoved={onWishlistRemoved} />
        </div>
      </div>

      <div className={styles.body}>
        <h3 className={styles.name}>
          <Link href={productHref}>{displayName(product.name)}</Link>
        </h3>

        {note ? <p className={styles.note}>{note}</p> : null}

        <div className={styles.priceRow}>
          <span className={onRequest ? styles.priceRequest : styles.price} data-num>
            {onRequest ? "On request" : productPriceLabel(product)}
          </span>
          {showCompareAt ? (
            <span className={styles.compare} data-num>
              {formatPrice(product.compareAtPrice!, product.currency)}
            </span>
          ) : null}
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.quote}
            data-active={onSheet || undefined}
            aria-pressed={onSheet}
            aria-label={onSheet ? `${product.name} is in your quote` : `Add ${product.name} to quote`}
            onClick={() => (onSheet ? sheet.open() : sheet.add(product.slug))}
          >
            {onSheet ? <Check aria-hidden /> : <FilePlus2 aria-hidden />}
            <span className={styles.quoteLong}>{onSheet ? "Added" : "Add to quote"}</span>
            <span className={styles.quoteShort} aria-hidden>
              {onSheet ? "Added" : "Quote"}
            </span>
          </button>
          {quickAdd ? (
            <button
              type="button"
              className={styles.buy}
              onClick={handleQuickAdd}
              aria-label={`Add ${product.name} to cart`}
            >
              <ShoppingBag aria-hidden />
            </button>
          ) : null}
        </div>

        {actions ? <div className={styles.extra}>{actions}</div> : null}
      </div>
    </article>
  );
}
