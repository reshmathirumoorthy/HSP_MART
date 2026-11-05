"use client";

import type { ProductCategorySlug } from "@/data/products";
import { productCategories } from "@/data/products";
import styles from "./CategoryNav.module.css";

type Props = {
  value: ProductCategorySlug;
  onChange: (category: ProductCategorySlug) => void;
};

export function CategoryNav({ value, onChange }: Props) {
  return (
    <nav className={styles.nav} aria-label="Product categories">
      <ul className={styles.list}>
        {productCategories.map((category) => {
          const active = category.slug === value;
          return (
            <li key={category.slug}>
              <button
                type="button"
                className={`${styles.item} ${active ? styles.active : ""}`}
                aria-pressed={active}
                onClick={() => onChange(category.slug)}
              >
                {category.label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
