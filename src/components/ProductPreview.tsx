"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { products } from "@/data/products";
import { ProductCard } from "@/components/ProductCard";
import styles from "./ProductPreview.module.css";

type TabId = "new" | "popular" | "bestsellers";

const tabs: { id: TabId; label: string }[] = [
  { id: "new", label: "New Arrivals" },
  { id: "popular", label: "Popular" },
  { id: "bestsellers", label: "Best Sellers" },
];

export function ProductPreview() {
  const [tab, setTab] = useState<TabId>("new");

  const featured = useMemo(() => {
    const active = products.filter((p) => p.active !== false);
    if (tab === "new") {
      return [...active].reverse().slice(0, 8);
    }
    if (tab === "bestsellers") {
      return active.filter((p) => p.featured).slice(0, 8);
    }
    return active.filter((p) => p.featured).slice(0, 8);
  }, [tab]);

  return (
    <section
      id="products"
      className={styles.section}
      data-nav-surface="light"
      aria-labelledby="products-heading"
    >
      <div className={`shell ${styles.inner}`}>
        <header className={styles.header}>
          <h2 id="products-heading" className={styles.title}>
            New arrivals
          </h2>
          <div className={styles.filters} role="tablist" aria-label="Featured filters">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                className={`${styles.filter} ${tab === t.id ? styles.filterActive : ""}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <Link href="/products" className={styles.viewAll}>
            View all →
          </Link>
        </header>

        <div className={styles.grid}>
          {featured.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
