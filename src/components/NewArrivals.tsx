"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatPrice, products, type Product } from "@/data/products";
import { isInStock } from "@/lib/productAvailability";
import { canQuickAdd, getQuickAddCustomization } from "@/lib/productModel";
import { useCart } from "@/context/CartContext";
import { WishlistButton } from "@/components/discovery/WishlistButton";
import styles from "./NewArrivals.module.css";

export function NewArrivals() {
  const list = products
    .filter((p) => p.active !== false)
    .slice(0, 8);
  if (!list.length) return null;

  const { addToCart } = useCart();
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

  return (
    <section
      id="new-arrivals"
      className={styles.section}
      aria-labelledby="new-arrivals-heading"
    >
      <div className={`shell ${styles.inner}`}>
        <header className={styles.header}>
          <div className={styles.headingBlock}>
            <p className={styles.eyebrow}>New Arrivals</p>
            <h2 id="new-arrivals-heading" className={styles.title}>
              Just added to the catalogue
            </h2>
            <p className={styles.lead}>
              Fresh stationery, desk essentials, and writing instruments.
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
            ‹
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
              {list.map((product, index) => (
                <li
                  key={product.id}
                  className={styles.card}
                  style={{ animationDelay: `${index * 0.08}s` }}
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
            ›
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
          <img
            src={product.images[0]}
            alt={product.name}
            className={styles.image}
            loading="lazy"
            decoding="async"
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