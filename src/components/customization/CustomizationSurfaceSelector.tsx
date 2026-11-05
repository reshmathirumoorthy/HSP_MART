"use client";

import type { KeyboardEvent } from "react";
import type {
  CustomizationZone,
  ZoneLayerState,
} from "@/types/customization";
import { zoneHasContent } from "@/components/customization/customization.utils";
import styles from "./customization.module.css";

type Props = {
  surfaces: CustomizationZone[];
  activeSurfaceId: string;
  zoneLayers: Record<string, ZoneLayerState>;
  onSelect: (surfaceId: string) => void;
  /** Optional id prefix for aria relationships. */
  labelId?: string;
  className?: string;
  /** Hide the visible label and tighten spacing for inline toolbars. */
  compact?: boolean;
};

/**
 * Accessible multi-surface selector driven by product.customization surfaces.
 * Never hardcodes Body/Cap — labels come from configuration.
 */
export function CustomizationSurfaceSelector({
  surfaces,
  activeSurfaceId,
  zoneLayers,
  onSelect,
  labelId = "customize-on-label",
  className,
  compact = false,
}: Props) {
  if (surfaces.length === 0) return null;

  const activeIndex = Math.max(
    0,
    surfaces.findIndex((surface) => surface.id === activeSurfaceId),
  );

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (surfaces.length < 2) return;
    let next = activeIndex;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      next = (activeIndex + 1) % surfaces.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      next = (activeIndex - 1 + surfaces.length) % surfaces.length;
    } else if (event.key === "Home") {
      event.preventDefault();
      next = 0;
    } else if (event.key === "End") {
      event.preventDefault();
      next = surfaces.length - 1;
    } else {
      return;
    }
    onSelect(surfaces[next].id);
  };

  return (
    <div className={className}>
      {compact ? null : (
        <p className={styles.label} id={labelId}>
          Customize on
        </p>
      )}
      <div
        className={`${styles.surfaceBarRow} ${compact ? styles.surfaceBarRowCompact : ""}`}
        role="tablist"
        aria-label={compact ? "Customization surface" : undefined}
        aria-labelledby={compact ? undefined : labelId}
        onKeyDown={onKeyDown}
      >
        {surfaces.map((surface) => {
          const selected = surface.id === activeSurfaceId;
          const entry = zoneLayers[surface.id];
          const filled = entry ? zoneHasContent(entry) : false;
          return (
            <button
              key={surface.id}
              type="button"
              role="tab"
              id={`surface-tab-${surface.id}`}
              className={`${styles.surfaceBarBtn} ${
                selected ? styles.surfaceBarBtnActive : ""
              } ${filled ? styles.surfaceBarBtnFilled : ""}`}
              aria-selected={selected}
              aria-controls="customization-surface-panel"
              tabIndex={selected ? 0 : -1}
              title={surface.description ?? surface.label}
              onClick={() => onSelect(surface.id)}
            >
              <span className={styles.surfaceBarBtnMark} aria-hidden>
                {selected ? "✓" : filled ? "•" : ""}
              </span>
              <span>{surface.label}</span>
              <span className="sr-only">
                {selected
                  ? ", selected"
                  : filled
                    ? ", has customization"
                    : ", empty"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
