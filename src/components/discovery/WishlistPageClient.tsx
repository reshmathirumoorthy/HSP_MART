"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { productCategories, type Product } from "@/data/products";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { RecentlyViewed } from "@/components/discovery/RecentlyViewed";
import { WishlistProductCard } from "@/components/discovery/WishlistProductCard";
import styles from "./wishlist.module.css";

const UNDO_MS = 5000;

type SortOption = "recent" | "name" | "price-asc" | "price-desc";

type PendingUndo = {
  productId: string;
  productName: string;
  index: number;
};

export function WishlistPageClient() {
  const { products, hydrated, ids, restoreToWishlist, clearWishlist } =
    useWishlist();
  const { addToCart, openCart } = useCart();
  const [pendingUndo, setPendingUndo] = useState<PendingUndo | null>(null);
  const [sort, setSort] = useState<SortOption>("recent");
  const [confirmClear, setConfirmClear] = useState(false);
  const undoTimerRef = useRef<number | null>(null);
  const keepRef = useRef<HTMLButtonElement>(null);

  const browseCategories = useMemo(
    () => productCategories.filter((category) => category.slug !== "all"),
    [],
  );

  const sortedProducts = useMemo(() => {
    const next = [...products];
    switch (sort) {
      case "name":
        return next.sort((a, b) => a.name.localeCompare(b.name, "en-IN"));
      case "price-asc":
        return next.sort((a, b) => a.price - b.price);
      case "price-desc":
        return next.sort((a, b) => b.price - a.price);
      default:
        return next;
    }
  }, [products, sort]);

  const clearUndoTimer = useCallback(() => {
    if (undoTimerRef.current !== null) {
      window.clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }
  }, []);

  const dismissUndo = useCallback(() => {
    clearUndoTimer();
    setPendingUndo(null);
  }, [clearUndoTimer]);

  const queueUndo = useCallback(
    (product: Product, previousIndex: number) => {
      clearUndoTimer();
      setPendingUndo({
        productId: product.id,
        productName: product.name,
        index: previousIndex,
      });
      undoTimerRef.current = window.setTimeout(() => {
        setPendingUndo(null);
        undoTimerRef.current = null;
      }, UNDO_MS);
    },
    [clearUndoTimer],
  );

  // The confirmation bar only makes sense while items remain; render it
  // conditionally instead of syncing state in an effect.
  const showClearConfirm = confirmClear && products.length > 0;

  useEffect(() => () => clearUndoTimer(), [clearUndoTimer]);

  // Move focus into the confirmation bar when it opens.
  useEffect(() => {
    if (showClearConfirm) keepRef.current?.focus();
  }, [showClearConfirm]);

  const handleUndo = () => {
    if (!pendingUndo) return;
    restoreToWishlist(pendingUndo.productId, pendingUndo.index);
    setConfirmClear(false);
    dismissUndo();
  };

  const confirmClearWishlist = () => {
    clearWishlist();
    setConfirmClear(false);
    dismissUndo();
  };

  const countLabel =
    products.length === 1 ? "1 saved product" : `${products.length} saved products`;

  return (
    <>
      <div className={styles.page} data-nav-surface="light">
        <div className={`shell ${styles.container}`}>
          <header className={styles.hero}>
            <div className={styles.heroText}>
              <p className={styles.eyebrow}>Wishlist</p>
              <h1 className={styles.title}>Your Wishlist</h1>
              {hydrated ? (
                <p className={styles.countPill}>
                  <svg
                    viewBox="0 0 24 24"
                    width="13"
                    height="13"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M12 20.5s-7.4-4.6-7.4-10.1A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.4 2.8c0 5.5-7.4 10.1-7.4 10.1Z" />
                  </svg>
                  {countLabel}
                </p>
              ) : null}
              <p className={styles.description}>
                Your favourite finds, all in one place.
              </p>
            </div>
            <Link href="/products" className={styles.continueLink}>
              Continue shopping
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M5 12h14" />
                <path d="m13 6 6 6-6 6" />
              </svg>
            </Link>
          </header>

          {!hydrated ? null : products.length === 0 ? (
            <section className={styles.emptyWrap} aria-labelledby="wishlist-empty-title">
              <div className={styles.emptyInner}>
                <span className={styles.emptyIcon} aria-hidden="true">
                  <svg
                    viewBox="0 0 24 24"
                    width="44"
                    height="44"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 20.5s-7.6-4.7-7.6-10.3a4.4 4.4 0 0 1 7.6-3.1 4.4 4.4 0 0 1 7.6 3.1c0 5.6-7.6 10.3-7.6 10.3Z" />
                  </svg>
                </span>
                <h2 id="wishlist-empty-title" className={styles.emptyTitle}>
                  Your wishlist is waiting.
                </h2>
                <p className={styles.emptyCopy}>
                  Save the pens, notebooks and gifts you love — they will be
                  waiting for you right here when you are ready to order.
                </p>
                <div className={styles.emptyActions}>
                  <Link href="/products" className="btn btn--dark">
                    Explore products
                  </Link>
                </div>
              </div>

              <div className={styles.browseSection}>
                <p className={styles.browseLabel}>Browse popular categories</p>
                <ul className={styles.browseGrid}>
                  {browseCategories.slice(0, 8).map((category) => (
                    <li key={category.slug}>
                      <Link
                        href={`/products?category=${category.slug}`}
                        className={styles.browseItem}
                      >
                        <span className={styles.browseItemLabel}>Category</span>
                        <span className={styles.browseItemName}>
                          {category.label}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          ) : (
            <>
              <div className={styles.toolbar}>
                <p className={styles.toolbarCount}>
                  <strong>{products.length}</strong>{" "}
                  {products.length === 1 ? "item saved" : "items saved"}
                </p>
                <div className={styles.toolbarControls}>
                  <div className={styles.sortWrap}>
                    <label className={styles.sortLabel} htmlFor="wishlist-sort">
                      Sort by
                    </label>
                    <select
                      id="wishlist-sort"
                      className={styles.sortSelect}
                      value={sort}
                      onChange={(event) =>
                        setSort(event.target.value as SortOption)
                      }
                    >
                      <option value="recent">Recently added</option>
                      <option value="name">Name A–Z</option>
                      <option value="price-asc">Price: low to high</option>
                      <option value="price-desc">Price: high to low</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    className={styles.clearBtn}
                    onClick={() => setConfirmClear(true)}
                    aria-expanded={showClearConfirm}
                    aria-controls="clear-wishlist-confirm"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      width="15"
                      height="15"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M4 7h16" />
                      <path d="M9.5 7V4.5A1.5 1.5 0 0 1 11 3h2a1.5 1.5 0 0 1 1.5 1.5V7" />
                      <path d="m6.5 7 1.2 12.2A2 2 0 0 0 9.7 21h4.6a2 2 0 0 0 2-1.8L17.5 7" />
                    </svg>
                    Clear wishlist
                  </button>
                </div>
              </div>

              {showClearConfirm ? (
                <div
                  className={styles.confirmBar}
                  id="clear-wishlist-confirm"
                  role="alertdialog"
                  aria-label="Clear your wishlist"
                >
                  <p className={styles.confirmCopy}>
                    Remove all {products.length}{" "}
                    {products.length === 1 ? "item" : "items"} from your wishlist?
                    This cannot be undone.
                  </p>
                  <div className={styles.confirmActions}>
                    <button
                      type="button"
                      className={styles.confirmDanger}
                      onClick={confirmClearWishlist}
                    >
                      Clear wishlist
                    </button>
                    <button
                      ref={keepRef}
                      type="button"
                      className={styles.confirmKeep}
                      onClick={() => setConfirmClear(false)}
                    >
                      Keep my items
                    </button>
                  </div>
                </div>
              ) : null}

              <ul className={styles.grid}>
                {sortedProducts.map((product) => (
                  <li key={product.id} className={styles.gridItem}>
                    <WishlistProductCard
                      product={product}
                      onWishlistRemoved={queueUndo}
                      addToCart={addToCart}
                      openCart={openCart}
                    />
                  </li>
                ))}
              </ul>

              {pendingUndo ? (
                <div className={styles.undoBar} role="status">
                  <p className={styles.undoCopy}>
                    Removed <strong>{pendingUndo.productName}</strong> from your
                    wishlist.
                  </p>
                  <div className={styles.undoActions}>
                    <button
                      type="button"
                      className={`${styles.undoBtn} ${styles.undoBtnSolid}`}
                      onClick={handleUndo}
                    >
                      Undo
                    </button>
                    <button
                      type="button"
                      className={styles.undoBtn}
                      onClick={dismissUndo}
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
      <RecentlyViewed title="Recently viewed" excludeProductIds={ids} />
    </>
  );
}
