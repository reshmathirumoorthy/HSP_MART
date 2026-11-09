"use client";

import { useState } from "react";
import Link from "next/link";
import { formatPrice, productPriceLabel, type Product } from "@/data/products";
import {
  isInStock,
  productAvailabilityLabel,
} from "@/lib/productAvailability";
import { trackEvent } from "@/lib/analytics";
import { productSummary } from "@/lib/productDescription";
import { displayName } from "@/lib/displayName";
import { PlateQuoteButton } from "@/components/quote-sheet/PlateQuoteButton";
import { company } from "@/data/company";
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
  const onRequest = Boolean(product.priceOnRequest) || product.price <= 0;
  const quoteHref = `/bulk-quote?product=${product.slug}`;
  const customizationConfig = resolveProductCustomizationConfig(product);
  const isCustomizable = Boolean(customizationConfig);
  const maxQuantity =
    typeof product.stockQuantity === "number" && product.stockQuantity > 0
      ? Math.min(999, product.stockQuantity)
      : 999;
  const showCompareAt =
    typeof product.compareAtPrice === "number" &&
    product.compareAtPrice > product.price;

  const summary = productSummary(
    product.shortDescription,
    product.description,
    product.name,
  );

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
          <h1 className={purchaseStyles.title}>{displayName(product.name)}</h1>
          {summary ? <p className={purchaseStyles.summary}>{summary}</p> : null}

          <div className={purchaseStyles.priceRow}>
            <p className={purchaseStyles.price}>{productPriceLabel(product)}</p>
            {showCompareAt ? (
              <>
                <p className={purchaseStyles.compare}>
                  {formatPrice(product.compareAtPrice!, product.currency)}
                </p>
              </>
            ) : null}
          </div>

          <p className={purchaseStyles.metaLine}>
            <span
              className={`${purchaseStyles.stockDot} ${inStock ? purchaseStyles.inStock : purchaseStyles.outStock}`}
            >
              {productAvailabilityLabel(product)}
            </span>
            <span aria-hidden>·</span>
            <span>SKU {product.sku}</span>
          </p>

          <div className={purchaseStyles.purchaseBlock}>
            <div className={purchaseStyles.buyRow}>
              {!onRequest ? (
                <QuantitySelector
                  value={safeQuantity}
                  onChange={(value) =>
                    setQuantity(Math.min(maxQuantity, Math.max(1, value)))
                  }
                  max={maxQuantity}
                  disabled={!inStock}
                />
              ) : null}

              {onRequest ? (
                <Link
                  href={quoteHref}
                  className={`btn btn--primary ${purchaseStyles.addBtn}`}
                >
                  Request a quote
                </Link>
              ) : (
                <button
                  type="button"
                  className={`btn btn--primary ${purchaseStyles.addBtn}`}
                  onClick={handleAdd}
                  disabled={!inStock || added || adding}
                  aria-busy={added || adding || undefined}
                >
                  {primaryLabel}
                </button>
              )}
              <PlateQuoteButton slug={product.slug} className={purchaseStyles.quoteBtn} />
            </div>

            {onRequest ? (
              <p className={purchaseStyles.configCue}>
                Premium hamper made to order. Share your quantity and occasion
                and we&apos;ll confirm pricing and delivery.
              </p>
            ) : null}

            {added ? (
              <p className={purchaseStyles.feedback} role="status" aria-live="polite">
                Added to cart — quantity {safeQuantity}.
              </p>
            ) : null}

            <div className={purchaseStyles.secondaryRow}>
              {isCustomizable ? (
                <button
                  type="button"
                  className={purchaseStyles.customisePill}
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
                  Personalise
                </button>
              ) : null}
              <WishlistButton product={product} variant="pill" />
              <CompareButton product={product} variant="pill" />
            </div>
          </div>

          <ul className={purchaseStyles.assurance}>
            <li>
              <TruckIcon />
              <span>
                <strong>Free delivery</strong> on orders above ₹499
              </span>
            </li>
            {product.bulkAvailable || onRequest ? (
              <li>
                <BoxIcon />
                <span>
                  <strong>Bulk &amp; branded orders</strong>
                  {product.minOrderQuantity
                    ? ` · min. ${product.minOrderQuantity} units`
                    : ""}{" "}
                  <Link href={quoteHref} className={purchaseStyles.assuranceLink}>
                    Get a quote →
                  </Link>
                </span>
              </li>
            ) : null}
            {company.contact.phone ? (
              <li>
                <PhoneIcon />
                <span>
                  <strong>Need help choosing?</strong>{" "}
                  <a
                    href={`tel:${company.contact.phone.replace(/\s+/g, "")}`}
                    className={purchaseStyles.assuranceLink}
                  >
                    Call {company.contact.phone}
                  </a>
                </span>
              </li>
            ) : null}
          </ul>
        </div>
      </div>

      <ProductInformation product={product} />

      <div className={purchaseStyles.mobileBar} data-sticky-purchase>
        <div className={purchaseStyles.mobileBarMeta}>
          <p className={purchaseStyles.mobileBarPrice}>
            {productPriceLabel(product)}
          </p>
          <p className={purchaseStyles.mobileBarStock}>
            {productAvailabilityLabel(product)}
          </p>
        </div>
        {onRequest ? (
          <Link
            href={quoteHref}
            className={`btn btn--primary ${purchaseStyles.mobileBarAction}`}
          >
            Request a quote
          </Link>
        ) : (
          <button
            type="button"
            className={`btn btn--primary ${purchaseStyles.mobileBarAction}`}
            onClick={handleAdd}
            disabled={!inStock || added || adding}
            aria-busy={added || adding || undefined}
          >
            {primaryLabel}
          </button>
        )}
      </div>
    </div>
  );
}

function TruckIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 6h11v10H3zM14 9h4l3 3v4h-7" />
      <circle cx="7" cy="17.5" r="1.8" />
      <circle cx="17" cy="17.5" r="1.8" />
    </svg>
  );
}

function BoxIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 8 12 3 3 8v8l9 5 9-5z" />
      <path d="M3 8l9 5 9-5M12 13v8" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
    </svg>
  );
}
