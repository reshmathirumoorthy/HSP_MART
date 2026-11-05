"use client";

import styles from "./CategoryNav.module.css";

type Props = {
  options: string[];
  value: string;
  onChange: (subcategory: string) => void;
};

export function SubcategoryNav({ options, value, onChange }: Props) {
  if (options.length === 0) return null;

  return (
    <nav
      className={`${styles.nav} ${styles.subNav}`}
      aria-label="Product subcategories"
    >
      <ul className={styles.list}>
        <li>
          <button
            type="button"
            className={`${styles.item} ${value === "" ? styles.active : ""}`}
            aria-pressed={value === ""}
            onClick={() => onChange("")}
          >
            All in category
          </button>
        </li>
        {options.map((label) => {
          const active = value === label;
          return (
            <li key={label}>
              <button
                type="button"
                className={`${styles.item} ${active ? styles.active : ""}`}
                aria-pressed={active}
                onClick={() => onChange(label)}
              >
                {label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
