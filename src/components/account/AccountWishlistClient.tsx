"use client";

import Link from "next/link";
import { ProductGrid } from "@/components/ProductGrid";
import { EmptyState } from "@/components/EmptyState";
import { WishlistItemActions } from "@/components/discovery/WishlistItemActions";
import { useWishlist } from "@/context/WishlistContext";
import { useCart } from "@/context/CartContext";
import styles from "./account.module.css";

export function AccountWishlistClient() {
  const { products, hydrated, count } = useWishlist();
  const { addToCart, openCart } = useCart();

  if (!hydrated) {
    return <p className={styles.note}>Loading wishlist…</p>;
  }

  if (products.length === 0) {
    return (
      <EmptyState
        label="Wishlist"
        title="Your wishlist is empty"
        copy="Products you save stay on this device. Browse the catalogue and use the heart on a product to keep it here."
        compact
      >
        <Link href="/products" className="btn btn--dark">
          Browse products
        </Link>
      </EmptyState>
    );
  }

  return (
    <div className={styles.content}>
      <p className={styles.note}>
        {count} saved product{count === 1 ? "" : "s"} from this device’s
        wishlist. Same list as the full wishlist page.
      </p>
      <ProductGrid
        products={products}
        renderActions={(product) => (
          <WishlistItemActions
            product={product}
            addToCart={addToCart}
            openCart={openCart}
          />
        )}
      />
      <Link href="/wishlist" className={styles.ghost}>
        Open full wishlist page
      </Link>
    </div>
  );
}
