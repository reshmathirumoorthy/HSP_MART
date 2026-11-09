"use client";

import Link from "next/link";
import { ProductCard } from "@/components/ProductCard";
import { useRecentlyViewed } from "@/context/RecentlyViewedContext";
import styles from "./discovery.module.css";

type Props = {
  title?: string;
  excludeProductId?: string;
  excludeProductIds?: string[];
  limit?: number;
  /** When true, show an empty state instead of hiding the section */
  showEmpty?: boolean;
};

export function RecentlyViewed({
  title = "Recently viewed",
  excludeProductId,
  excludeProductIds = [],
  limit = 4,
  showEmpty = false,
}: Props) {
  const { products, hydrated } = useRecentlyViewed();

  if (!hydrated) {
    return (
      <section
        className={styles.section}
        aria-labelledby="recently-viewed-heading"
        aria-busy="true"
      >
        <div className="shell">
          <div className={styles.sectionHeader}>
            <div>
              <h2 id="recently-viewed-heading" className={styles.sectionTitle}>
                {title}
              </h2>
            </div>
          </div>
          <p className={styles.emptyCopy}>Loading your recent views…</p>
        </div>
      </section>
    );
  }

  const excluded = new Set(
    [excludeProductId, ...excludeProductIds].filter(Boolean) as string[],
  );

  const items = products
    .filter((product) => !excluded.has(product.id))
    .slice(0, limit);

  if (items.length === 0 && !showEmpty) return null;

  return (
    <section className={styles.section} aria-labelledby="recently-viewed-heading">
      <div className="shell">
        <div className={styles.sectionHeader}>
          <div>
            <h2 id="recently-viewed-heading" className={styles.sectionTitle}>
              {title}
            </h2>
          </div>
          <Link href="/products" className={styles.sectionLink}>
            Browse products
          </Link>
        </div>
        {items.length === 0 ? (
          <div className={styles.emptyBox} role="status">
            <p className={styles.emptyCopy}>
              Products you view will appear here for quick return visits.
            </p>
            <Link href="/products" className={`btn btn--primary ${styles.emptyCta}`}>
              Explore products
            </Link>
          </div>
        ) : (
          <div className={styles.rail}>
            {items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
