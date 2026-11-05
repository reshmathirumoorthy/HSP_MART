"use client";

import type { KeyboardEvent } from "react";
import type { ResolvedProductView } from "@/lib/customization/viewer";
import styles from "./customization.module.css";

type Props = {
  views: ResolvedProductView[];
  activeIndex: number;
  onSelect: (index: number) => void;
  labelId?: string;
};

/**
 * Discrete view navigation for 2–7 real photographs.
 * Not shown as 360° — that requires orbit-eligible frame counts.
 */
export function CustomizationViewSelector({
  views,
  activeIndex,
  onSelect,
  labelId = "product-view-label",
}: Props) {
  if (views.length < 2) return null;

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    let next = activeIndex;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      next = (activeIndex + 1) % views.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      next = (activeIndex - 1 + views.length) % views.length;
    } else if (event.key === "Home") {
      event.preventDefault();
      next = 0;
    } else if (event.key === "End") {
      event.preventDefault();
      next = views.length - 1;
    } else {
      return;
    }
    onSelect(next);
  };

  return (
    <div className={styles.viewBar}>
      <p className={styles.label} id={labelId}>
        View
      </p>
      <div
        className={styles.viewBarRow}
        role="tablist"
        aria-labelledby={labelId}
        onKeyDown={onKeyDown}
      >
        {views.map((view, index) => {
          const selected = index === activeIndex;
          return (
            <button
              key={view.id}
              type="button"
              role="tab"
              className={`${styles.viewBarBtn} ${
                selected ? styles.viewBarBtnActive : ""
              }`}
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => onSelect(index)}
            >
              {view.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
