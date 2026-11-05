"use client";

import { useId } from "react";
import styles from "./ProductSearch.module.css";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: (value: string) => void;
};

export function ProductSearch({ value, onChange, onSubmit }: Props) {
  const inputId = useId();

  return (
    <form
      className={styles.wrap}
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit?.(value.trim());
      }}
    >
      <label htmlFor={inputId} className="sr-only">
        Search products
      </label>
      <div className={styles.field}>
        <input
          id={inputId}
          type="search"
          className={styles.input}
          placeholder="Search by name or SKU"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape" && value) {
              event.preventDefault();
              onChange("");
            }
          }}
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="search"
        />
        {value ? (
          <button
            type="button"
            className={styles.clear}
            aria-label="Clear search"
            onClick={() => onChange("")}
          >
            Clear
          </button>
        ) : null}
      </div>
    </form>
  );
}
