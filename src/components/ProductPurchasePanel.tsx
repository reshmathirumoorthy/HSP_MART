"use client";

import { useState } from "react";
import Link from "next/link";
import { formatPrice, type Product } from "@/data/products";
import {
  isInStock,
  productAvailabilityLabel,
} from "@/lib/productAvailability";
import { isProductCustomizable } from "@/lib/productModel";
import { QuantitySelector } from "@/components/QuantitySelector";
import { useCart } from "@/context/CartContext";
import { WishlistButton } from "@/components/discovery/WishlistButton";
import { CompareButton } from "@/components/discovery/CompareButton";
import discovery from "@/components/discovery/discovery.module.css";
import styles from "./ProductPurchasePanel.module.css";

type Props = {
  product: Product;
};

export function ProductPurchasePanel({ product }: Props) {
  const { addToCart, openCart } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    if (!isInStock(product)) return;
    const ok = addToCart(product.id, quantity);
    if (!ok) return;
    setAdded(true);
    openCart();
    window.setTimeout(() => setAdded(false), 2200);
  };

  return (
    <div className={styles.panel}>
      <p className={styles.category}>{product.category}</p>
      <h1 className={styles.title}>{product.name}</h1>
      <p className={styles.sku}>SKU · {product.sku}</p>

      <div className={styles.priceRow}>
        <p className={styles.price}>{formatPrice(product.price, product.currency)}</p>
      </div>

      <p className={`${styles.stock} ${isInStock(product) ? styles.inStock : styles.outStock}`}>
        {productAvailabilityLabel(product)}
      </p>

      <p className={styles.summary}>{product.shortDescription}</p>

      <QuantitySelector
        value={quantity}
        onChange={setQuantity}
        disabled={!isInStock(product)}
      />

      <button
        type="button"
        className={`btn btn--dark ${styles.addBtn}`}
        onClick={handleAdd}
        disabled={!isInStock(product) || added}
      >
        {isInStock(product)
          ? added
            ? "Added to cart ✓"
            : "Add to Cart"
          : "Currently unavailable"}
      </button>

      <div className={discovery.pdpActions}>
        <WishlistButton product={product} variant="text" />
        <CompareButton product={product} variant="text" />
      </div>

      {product.bulkAvailable ? (
        <div className={styles.businessNote}>
          <p className={styles.businessLabel}>Need a larger quantity?</p>
          <p className={styles.businessCopy}>
            Request pricing for bulk orders and larger requirements.
          </p>
          {product.minOrderQuantity ? (
            <p className={styles.moq}>
              Minimum bulk quantity · {product.minOrderQuantity} units
            </p>
          ) : null}
          <Link
            href={`/bulk-quote?product=${product.slug}`}
            className={styles.ghostAction}
          >
            Request a bulk quote
          </Link>
        </div>
      ) : null}

      {isProductCustomizable(product) ? (
        <div className={styles.businessNote}>
          <p className={styles.businessLabel}>Customization</p>
          <p className={styles.businessCopy}>
            Add text, a logo, or an image on this product before you order.
          </p>
          <Link
            href={`/products/${product.slug}#customize`}
            className={styles.ghostAction}
          >
            Request Customization
          </Link>
        </div>
      ) : null}
    </div>
  );
}
