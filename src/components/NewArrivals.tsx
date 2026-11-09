"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { productionProducts } from "@/data/productionProducts";
import styles from "./NewArrivals.module.css";

export function NewArrivals() {
  // The production feed is ordered newest-first, so its head = latest arrivals.
  const list = productionProducts
    .filter((p) => p.active !== false && p.stockStatus !== "out_of_stock")
    .slice(0, 8);

  const scrollRef = useRef<HTMLUListElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(list.length > 1);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  }, []);

  const scrollBy = useCallback((delta: { left: number }) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy(delta);
  }, []);

  useEffect(() => {
    updateScrollState();
    window.addEventListener("resize", updateScrollState);
    return () => window.removeEventListener("resize", updateScrollState);
  }, [updateScrollState]);

  if (!list.length) return null;

  return (
    <section
      id="new-arrivals"
      className={styles.section}
      aria-labelledby="new-arrivals-heading"
    >
      <div className={`shell ${styles.inner}`}>
        <header className={styles.header}>
          <div className={styles.headingBlock}>
            <h2 id="new-arrivals-heading" className={styles.title}>
              New in the catalogue
            </h2>
            <p className={styles.lead}>
              The latest hampers, gifts and boards added to the HSP Mart range.
            </p>
          </div>
          <Link href="/products" className={styles.viewAll}>
            View all new arrivals
            <span aria-hidden="true">→</span>
          </Link>
        </header>

        <div className={styles.carouselWrapper}>
          <button
            type="button"
            className={`${styles.navBtn} ${styles.navBtnLeft}`}
            aria-label="Scroll previous"
            onClick={() => scrollBy({ left: -320 })}
            disabled={!canScrollLeft}
          >
            <ChevronLeft aria-hidden />
          </button>

          <div className={styles.track}>
            <ul
              ref={scrollRef}
              className={styles.grid}
              onScroll={updateScrollState}
              onWheel={(event) => {
                if (event.deltaY !== 0) {
                  event.preventDefault();
                  scrollBy({ left: event.deltaY });
                }
              }}
            >
              {list.map((product) => (
                <li
                  key={product.id}
                  className={styles.card}
                >
                  <ProductCard product={product} />
                </li>
              ))}
            </ul>
          </div>

          <button
            type="button"
            className={`${styles.navBtn} ${styles.navBtnRight}`}
            aria-label="Scroll next"
            onClick={() => scrollBy({ left: 320 })}
            disabled={!canScrollRight}
          >
            <ChevronRight aria-hidden />
          </button>
        </div>
      </div>
    </section>
  );
}

