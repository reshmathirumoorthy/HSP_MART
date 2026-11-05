"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { productCategories } from "@/data/products";
import { searchProducts } from "@/lib/productSearch";
import { addRecentSearch } from "@/lib/recentSearches";
import { ProductSearch } from "@/components/ProductSearch";
import { ProductGrid } from "@/components/ProductGrid";
import { EmptyState } from "@/components/EmptyState";
import { RecentlyViewed } from "@/components/discovery/RecentlyViewed";
import styles from "./SearchResultsPage.module.css";

const DEBOUNCE_MS = 280;

export function SearchResultsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const [, startTransition] = useTransition();
  const [inputValue, setInputValue] = useState(query);
  const [syncedQuery, setSyncedQuery] = useState(query);
  const debounceRef = useRef<number | null>(null);
  const skipDebounceRef = useRef(false);

  // Keep the input aligned with browser back/forward URL changes.
  if (query !== syncedQuery) {
    setSyncedQuery(query);
    setInputValue(query);
  }

  const replaceQuery = (value: string) => {
    const href = value ? `/search?q=${encodeURIComponent(value)}` : "/search";
    startTransition(() => {
      router.replace(href, { scroll: false });
    });
  };

  const clearDebounce = () => {
    if (debounceRef.current !== null) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  };

  useEffect(() => {
    if (skipDebounceRef.current) {
      skipDebounceRef.current = false;
      return;
    }
    if (inputValue === query) return;

    clearDebounce();
    debounceRef.current = window.setTimeout(() => {
      replaceQuery(inputValue);
      debounceRef.current = null;
    }, DEBOUNCE_MS);

    return clearDebounce;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- debounce typed input to URL
  }, [inputValue]);

  const trimmed = query.trim();
  const results = useMemo(
    () => (trimmed ? searchProducts(trimmed, { activeOnly: true }) : []),
    [trimmed],
  );
  const products = useMemo(
    () => results.map((result) => result.product),
    [results],
  );

  const browseCategories = useMemo(
    () => productCategories.filter((category) => category.slug !== "all"),
    [],
  );

  const catalogueHref = trimmed
    ? `/products?search=${encodeURIComponent(trimmed)}`
    : "/products";

  const handleInputChange = (value: string) => {
    setInputValue(value);
    if (!value.trim()) {
      clearDebounce();
      skipDebounceRef.current = true;
      replaceQuery("");
    }
  };

  const commitSearch = (value: string) => {
    const next = value.trim();
    clearDebounce();
    skipDebounceRef.current = true;
    setInputValue(value);
    if (next) addRecentSearch(next);
    replaceQuery(value);
  };

  const countLabel = trimmed
    ? `${results.length} result${results.length === 1 ? "" : "s"}`
    : "Search the catalogue";

  return (
    <div className={styles.page} data-nav-surface="light">
      <header className={`shell ${styles.header}`}>
        <p className={styles.eyebrow}>Search</p>
        {trimmed ? (
          <>
            <h1 className={styles.title}>
              Results for <span>&ldquo;{trimmed}&rdquo;</span>
            </h1>
            <p className={styles.count}>{countLabel}</p>
          </>
        ) : (
          <>
            <h1 className={styles.title}>Search products</h1>
            <p className={styles.lead}>
              Find stationery, desk essentials, gifts and custom pieces by name,
              SKU, or category.
            </p>
          </>
        )}

        <div className={styles.searchBar}>
          <ProductSearch
            value={inputValue}
            onChange={handleInputChange}
            onSubmit={commitSearch}
          />
        </div>

        {trimmed && results.length > 0 ? (
          <p className={styles.refine}>
            <Link href={catalogueHref} className={styles.refineLink}>
              Refine these results in the catalogue
            </Link>
            {" · "}
            filter, sort, and browse by category
          </p>
        ) : null}
      </header>

      <div className={`shell ${styles.body}`}>
        {!trimmed ? (
          <section
            className={styles.emptyPanel}
            aria-labelledby="browse-heading"
          >
            <h2 id="browse-heading" className={styles.sectionLabel}>
              Popular categories
            </h2>
            <ul className={styles.categoryGrid}>
              {browseCategories.map((category) => (
                <li key={category.slug}>
                  <Link
                    href={`/products?category=${category.slug}`}
                    className={styles.categoryCard}
                  >
                    <span className={styles.categoryEyebrow}>Category</span>
                    <span className={styles.categoryName}>{category.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <Link href="/products" className="btn btn--primary">
              Browse all products
            </Link>
          </section>
        ) : results.length === 0 ? (
          <EmptyState
            label="No matches"
            title={`No products for “${trimmed}”`}
            copy="Try a shorter term, a SKU, or browse by category. Recent searches stay on this device."
          >
            <Link href="/products" className="btn btn--dark">
              Browse products
            </Link>
          </EmptyState>
        ) : (
          <ProductGrid products={products} />
        )}
      </div>

      <RecentlyViewed
        title="Recently viewed"
        excludeProductIds={products.map((product) => product.id)}
      />
    </div>
  );
}
