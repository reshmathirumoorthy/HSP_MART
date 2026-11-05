"use client";

import type { FilterState, PriceRangeKey } from "@/data/products";
import { priceRanges } from "@/data/products";
import styles from "./ProductFilters.module.css";

type Props = {
  filters: FilterState;
  onChange: (next: Partial<FilterState>) => void;
  variant?: "inline" | "sheet";
};

export function ProductFilters({ filters, onChange, variant = "inline" }: Props) {
  const group = variant === "sheet" ? "sheet" : "inline";

  return (
    <div className={`${styles.filters} ${variant === "sheet" ? styles.sheet : ""}`}>
      <fieldset className={styles.group}>
        <legend>Price</legend>
        <div className={styles.options}>
          {priceRanges.map((range) => (
            <label key={range.key} className={styles.option}>
              <input
                type="radio"
                name={`price-range-${group}`}
                checked={filters.priceRange === range.key}
                onChange={() => onChange({ priceRange: range.key as PriceRangeKey })}
              />
              <span>{range.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className={styles.group}>
        <legend>Availability</legend>
        <div className={styles.options}>
          <label className={styles.option}>
              <input
                type="radio"
                name={`availability-${group}`}
              checked={!filters.inStockOnly}
              onChange={() => onChange({ inStockOnly: false })}
            />
            <span>All products</span>
          </label>
          <label className={styles.option}>
              <input
                type="radio"
                name={`availability-${group}`}
              checked={filters.inStockOnly}
              onChange={() => onChange({ inStockOnly: true })}
            />
            <span>In stock</span>
          </label>
        </div>
      </fieldset>

      <fieldset className={styles.group}>
        <legend>Capabilities</legend>
        <div className={styles.options}>
          <label className={styles.option}>
            <input
              type="checkbox"
              checked={filters.customizableOnly}
              onChange={(event) =>
                onChange({ customizableOnly: event.target.checked })
              }
            />
            <span>Customizable</span>
          </label>
          <label className={styles.option}>
            <input
              type="checkbox"
              checked={filters.bulkOnly}
              onChange={(event) => onChange({ bulkOnly: event.target.checked })}
            />
            <span>Bulk available</span>
          </label>
        </div>
      </fieldset>
    </div>
  );
}
