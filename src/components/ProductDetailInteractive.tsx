"use client";

import { useState } from "react";
import Link from "next/link";
import { formatPrice, type Product } from "@/data/products";
import {
  isInStock,
  productAvailabilityLabel,
} from "@/lib/productAvailability";
import { trackEvent } from "@/lib/analytics";
import { ProductGallery } from "@/components/ProductGallery";
import { ProductInformation } from "@/components/ProductInformation";
import { QuantitySelector } from "@/components/QuantitySelector";
import { useCart } from "@/context/CartContext";
import { WishlistButton } from "@/components/discovery/WishlistButton";
import { CompareButton } from "@/components/discovery/CompareButton";
import { useRouter } from "next/navigation";
import { resolveProductCustomizationConfig } from "@/components/customization/resolveProductCustomization";
import type { CartCustomization } from "@/types/customization";
import styles from "./ProductDetail.module.css";
import purchaseStyles from "./ProductPurchasePanel.module.css";

type Props = {
  product: Product;
};

export function ProductDetailInteractive({ product }: Props) {
  const { addToCart, openCart } = useCart();
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [quantityProductId, setQuantityProductId] = useState(product.id);
  const [added, setAdded] = useState(false);
  const [adding, setAdding] = useState(false);
  if (quantityProductId !== product.id) {
    setQuantityProductId(product.id);
    setQuantity(1);
  }

  const inStock = isInStock(product);
  const customizationConfig = resolveProductCustomizationConfig(product);
  const isCustomizable = Boolean(customizationConfig);
  const maxQuantity =
    typeof product.stockQuantity === "number" && product.stockQuantity > 0
      ? Math.min(999, product.stockQuantity)
      : 999;
  const showCompareAt =
    typeof product.compareAtPrice === "number" &&
    product.compareAtPrice > product.price;

  const safeQuantity = Math.min(Math.max(1, quantity), maxQuantity);

  const commitCart = (customization?: CartCustomization) => {
    if (adding) return;
    setAdding(true);
    const ok = addToCart(product.id, safeQuantity, customization);
    if (!ok) {
      setAdding(false);
      return;
    }
    trackEvent(
      customization ? "customized_product_added_to_cart" : "add_to_cart",
      {
        productId: product.id,
        productSlug: product.slug,
        quantity: safeQuantity,
        customizationTextLength: customization?.text?.length,
        font: customization?.font,
        color: customization?.color,
        placement: customization?.placement,
      },
    );
    setAdded(true);
    openCart();
    window.setTimeout(() => {
      setAdded(false);
      setAdding(false);
    }, 2200);
  };

  const handleAdd = () => {
    if (!inStock) return;
    commitCart();
  };

  const primaryLabel = !inStock
    ? "Currently unavailable"
    : added
      ? "Added to cart"
      : "Add to cart";

  return (
    <div className={styles.configure} data-testid="product-detail">
      <div className={styles.hero}>
        <ProductGallery product={product} />

        <div className={purchaseStyles.panel}>
          <p className={purchaseStyles.category}>{product.category}</p>
          <h1 className={purchaseStyles.title}>{product.name}</h1>
          <p className={purchaseStyles.sku}>SKU · {product.sku}</p>
          <p className={purchaseStyles.summary}>{product.shortDescription}</p>

          <div className={purchaseStyles.priceRow}>
            <p className={purchaseStyles.price}>
              {formatPrice(product.price, product.currency)}
            </p>
            {showCompareAt ? (
              <p className={purchaseStyles.compare}>
                {formatPrice(product.compareAtPrice!, product.currency)}
              </p>
            ) : null}
          </div>

          <p
            className={`${purchaseStyles.stock} ${inStock ? purchaseStyles.inStock : purchaseStyles.outStock}`}
          >
            {productAvailabilityLabel(product)}
          </p>

          <div className={purchaseStyles.purchaseBlock}>
            <QuantitySelector
              value={safeQuantity}
              onChange={(value) =>
                setQuantity(Math.min(maxQuantity, Math.max(1, value)))
              }
              max={maxQuantity}
              disabled={!inStock}
            />

            <button
              type="button"
              className={`btn btn--primary ${purchaseStyles.addBtn}`}
              onClick={handleAdd}
              disabled={!inStock || added || adding}
              aria-busy={added || adding || undefined}
            >
              {primaryLabel}
            </button>

            {isCustomizable ? (
              <button
                type="button"
                className={`btn btn--outline ${purchaseStyles.customiseBtn}`}
                onClick={() =>
                  router.push(
                    `/products/${product.slug}/customize?product=${product.id}`,
                  )
                }
                disabled={!inStock}
              >
                <svg
                  aria-hidden="true"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
                Customise Product
              </button>
            ) : null}

            {isCustomizable ? (
              <p className={purchaseStyles.configCue}>
                Personalise this product with your own name, logo or design.
              </p>
            ) : null}

            <div className={purchaseStyles.wishlistRow}>
              <WishlistButton product={product} variant="text" />
            </div>

            {added ? (
              <p
                className={purchaseStyles.feedback}
                role="status"
                aria-live="polite"
              >
                Added to cart — quantity {safeQuantity}.
              </p>
            ) : null}
          </div>

          {product.bulkAvailable ? (
            <div className={purchaseStyles.businessNote}>
              <Link
                href={`/bulk-quote?product=${product.slug}`}
                className="link-quiet"
              >
                Request a bulk quote
                {product.minOrderQuantity
                  ? ` · min. ${product.minOrderQuantity}`
                  : ""}
                <span aria-hidden> →</span>
              </Link>
            </div>
          ) : null}

          <div className={purchaseStyles.pdpActions}>
            <CompareButton product={product} variant="text" />
          </div>

          {product.tags.length > 0 ? (
            <ul className={purchaseStyles.tags} aria-label="Product tags">
              {product.tags.slice(0, 4).map((tag) => (
                <li key={tag}>{tag}</li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      <ProductInformation product={product} />

      <div className={purchaseStyles.mobileBar} data-sticky-purchase>
        <div className={purchaseStyles.mobileBarMeta}>
          <p className={purchaseStyles.mobileBarPrice}>
            {formatPrice(product.price, product.currency)}
          </p>
          <p className={purchaseStyles.mobileBarStock}>
            {productAvailabilityLabel(product)}
          </p>
        </div>
        <button
          type="button"
          className={`btn btn--primary ${purchaseStyles.mobileBarAction}`}
          onClick={handleAdd}
          disabled={!inStock || added || adding}
          aria-busy={added || adding || undefined}
        >
          {primaryLabel}
        </button>
      </div>
    </div>
  );
}
