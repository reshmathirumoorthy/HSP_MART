"use client";

import type { SortOption } from "@/data/products";
import { sortOptions } from "@/data/products";
import styles from "./ProductSort.module.css";

type Props = {
  value: SortOption;
  onChange: (value: SortOption) => void;
};

export function ProductSort({ value, onChange }: Props) {
  return (
    <div className={styles.wrap}>
      <label htmlFor="product-sort" className={styles.label}>
        Sort
      </label>
      <select
        id="product-sort"
        className={styles.select}
        value={value}
        onChange={(event) => onChange(event.target.value as SortOption)}
      >
        {sortOptions.map((option) => (
          <option key={option.key} value={option.key}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
