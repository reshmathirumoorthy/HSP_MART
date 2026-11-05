"use client";

import Link from "next/link";
import { useWishlist } from "@/context/WishlistContext";
import styles from "@/components/account/account.module.css";

export function AccountWishlistTeaser() {
  const { count, hydrated } = useWishlist();

  if (!hydrated || count === 0) return null;

  return (
    <section aria-labelledby="saved-products-heading">
      <div className={styles.cardTop}>
        <h2 id="saved-products-heading" className={styles.panelTitle}>
          Saved products
        </h2>
        <Link href="/account/wishlist" className={styles.ghost}>
          View wishlist
        </Link>
      </div>
      <div className={styles.stat}>
        <p className={styles.statLabel}>Wishlist</p>
        <p className={styles.statValue}>{count}</p>
      </div>
    </section>
  );
}
