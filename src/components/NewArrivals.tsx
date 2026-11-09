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

  if (list.length === 0) return null;

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

function ProductCard({ product }: { product: Product }) {
  const { addToCart, openCart } = useCart();
  const inStock = isInStock(product);
  const quickAdd = canQuickAdd(product);
  const showDiscount =
    typeof product.compareAtPrice === "number" &&
    product.compareAtPrice > product.price;
  const discountPct = showDiscount
    ? Math.round(
        ((product.compareAtPrice! - product.price) / product.compareAtPrice!) *
          100
      )
    : 0;

  const handleQuickAdd = () => {
    if (!quickAdd) return;
    const ok = addToCart(product.id, 1, getQuickAddCustomization(product));
    if (ok) openCart();
  };

  return (
    <article className={styles.cardWrap}>
      <div className={styles.visualWrap}>
        <Link
          href={`/products/${product.slug}`}
          className={styles.visualLink}
          aria-label={`View ${product.name}`}
        >
          <Image
            src={product.images[0]}
            alt={product.name}
            className={styles.image}
            fill
            sizes="(max-width: 640px) 70vw, (max-width: 1024px) 33vw, 240px"
            loading="lazy"
          />
        </Link>
        {showDiscount && (
          <span className={styles.discountBadge}>{discountPct}% OFF</span>
        )}
        <div className={styles.actions}>
          <WishlistButton product={product} variant="icon" />
          {quickAdd && inStock ? (
            <button
              type="button"
              className={styles.quickAddBtn}
              onClick={handleQuickAdd}
              title="Quick add to cart"
              aria-label={`Quick add ${product.name} to cart`}
            >
              +
            </button>
          ) : null}
        </div>
      </div>

      <div className={styles.body}>
        <Link href={`/products/${product.slug}`} className={styles.nameLink}>
          <p className={styles.category}>{product.category}</p>
          <h3 className={styles.name}>{product.name}</h3>
        </Link>
        <div className={styles.priceRow}>
          <p className={styles.price}>
            {formatPrice(product.price, product.currency)}
          </p>
          {showDiscount ? (
            <p className={styles.compare}>
              {formatPrice(product.compareAtPrice!, product.currency)}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}
