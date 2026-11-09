"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  productCategories,
  products,
  type ProductCategorySlug,
} from "@/data/products";
import { isInStock } from "@/lib/productAvailability";
import { isProductCustomizable } from "@/lib/productModel";
import { ProductVisual } from "@/components/ProductVisual";
import { getFocusableElements, trapTabKey } from "@/lib/focusTrap";
import styles from "./ProductPicker.module.css";

type Props = {
  open: boolean;
  selectedIds: string[];
  onClose: () => void;
  onAdd: (productId: string) => void;
};

export function ProductPicker({ open, selectedIds, onClose, onAdd }: Props) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<ProductCategorySlug>("all");
  const panelRef = useRef<HTMLDivElement>(null);
  // Keep the latest onClose without making it an effect dependency: the parent
  // passes an inline arrow, and a changing dep would re-run the focus effect
  // (stealing focus) on every parent render while the picker is open.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    returnFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const panel = panelRef.current;
    const focusable = panel ? getFocusableElements(panel) : [];
    const initial = focusable[0] ?? panel;
    window.setTimeout(() => initial?.focus({ preventScroll: true }), 30);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (panel) trapTabKey(event, panel);
    };

    document.addEventListener("keydown", onKeyDown);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previous;
      returnFocusRef.current?.focus({ preventScroll: true });
    };
  }, [open]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products.filter((product) => {
      if (!product.active || !(product.bulkAvailable || product.priceOnRequest)) return false;
      if (category !== "all" && product.categorySlug !== category) return false;
      if (!query) return true;
      return (
        product.name.toLowerCase().includes(query) ||
        product.sku.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query) ||
        (product.subcategory ?? "").toLowerCase().includes(query) ||
        product.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    });
  }, [search, category]);

  if (!open) return null;

  return (
    <div className={styles.root}>
      <button
        type="button"
        className={styles.backdrop}
        aria-label="Close product picker"
        tabIndex={-1}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-picker-title"
        tabIndex={-1}
      >
        <header className={styles.header}>
          <div>
            <h2 id="product-picker-title" className={styles.title}>
              Add a product
            </h2>
            <p className={styles.copy}>
              Choose from the HSP Mart catalogue.
            </p>
          </div>
          <button
            type="button"
            className={styles.close}
            aria-label="Close product picker"
            onClick={onClose}
          >
            ×
          </button>
        </header>

        <div className={styles.filters}>
          <label className="sr-only" htmlFor="picker-search">
            Search products
          </label>
          <input
            id="picker-search"
            className={styles.search}
            type="search"
            placeholder="Search products"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <label className="sr-only" htmlFor="picker-category">
            Category
          </label>
          <select
            id="picker-category"
            className={styles.select}
            value={category}
            onChange={(event) =>
              setCategory(event.target.value as ProductCategorySlug)
            }
          >
            {productCategories.map((item) => (
              <option key={item.slug} value={item.slug}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        {filtered.length === 0 ? (
          <p className={styles.empty}>No products match your search.</p>
        ) : (
          <ul className={styles.list}>
            {filtered.map((product) => {
              const selected = selectedIds.includes(product.id);
              return (
                <li key={product.id} className={styles.item}>
                  <div className={styles.visual}>
                    <ProductVisual
                      product={product}
                      variant="compact"
                      sizes="72px"
                    />
                  </div>
                  <div className={styles.meta}>
                    <p className={styles.category}>{product.category}</p>
                    <p className={styles.name}>{product.name}</p>
                    <p className={styles.flags}>
                      {isInStock(product) ? "In stock" : "Currently unavailable"}
                      {product.bulkAvailable ? " · Bulk" : ""}
                      {isProductCustomizable(product) ? " · Customizable" : ""}
                    </p>
                  </div>
                  {selected ? (
                    <span className={styles.selected}>Selected</span>
                  ) : (
                    <button
                      type="button"
                      className={styles.add}
                      onClick={() => onAdd(product.id)}
                    >
                      Add
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
