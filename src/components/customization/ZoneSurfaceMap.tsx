"use client";

import type {
  CustomizationPreviewType,
  CustomizationZone,
} from "@/types/customization";
import styles from "./ZoneSurfaceMap.module.css";

type Props = {
  previewType: CustomizationPreviewType;
  zones: CustomizationZone[];
  activeZoneId: string;
  onSelect: (zoneId: string) => void;
};

/** Compact surface map — editorial, not CAD. */
export function ZoneSurfaceMap({
  previewType,
  zones,
  activeZoneId,
  onSelect,
}: Props) {
  const byId = (id: string) => zones.find((z) => z.id === id);

  const renderBtn = (id: string, fallbackLabel: string) => {
    const zone = byId(id);
    if (!zone) return null;
    const active = activeZoneId === zone.id;
    return (
      <button
        key={zone.id}
        type="button"
        className={`${styles.node} ${active ? styles.nodeActive : ""}`}
        aria-label={`Customize ${zone.label}`}
        aria-pressed={active}
        onClick={() => onSelect(zone.id)}
      >
        {zone.label.replace(/^(Bottle|Front |Back )/, "") || fallbackLabel}
      </button>
    );
  };

  if (previewType === "bottle") {
    return (
      <div className={styles.map} aria-label="Bottle surface map">
        <div className={styles.rowCenter}>{renderBtn("top", "Top")}</div>
        <div className={styles.rowCenter}>{renderBtn("cap", "Cap")}</div>
        <div className={styles.body}>
          <div className={styles.sideCol}>{renderBtn("left", "Left")}</div>
          <div className={styles.frontBlock}>
            {renderBtn("front", "Front")}
            {renderBtn("back", "Back")}
          </div>
          <div className={styles.sideCol}>{renderBtn("right", "Right")}</div>
        </div>
        <div className={styles.rowCenter}>{renderBtn("bottom", "Bottom")}</div>
      </div>
    );
  }

  if (previewType === "notebook" || previewType === "folder") {
    return (
      <div className={styles.map} aria-label="Cover surface map">
        <div className={styles.notebookRow}>
          {renderBtn("spine", "Spine")}
          {renderBtn("front", "Front")}
          {renderBtn("back", "Back")}
        </div>
        {previewType === "folder" ? (
          <div className={styles.notebookRow}>
            {renderBtn("inside-left", "Inside L")}
            {renderBtn("inside-right", "Inside R")}
          </div>
        ) : null}
      </div>
    );
  }

  if (previewType === "pen") {
    return (
      <div className={styles.map} aria-label="Pen surface map">
        <div className={styles.penRow}>
          {renderBtn("cap", "Cap")}
          {renderBtn("barrel", "Barrel")}
          {renderBtn("clip", "Clip")}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.map} aria-label="Product surface map">
      <div className={styles.chipWrap}>
        {zones.map((zone) => (
          <button
            key={zone.id}
            type="button"
            className={`${styles.node} ${
              activeZoneId === zone.id ? styles.nodeActive : ""
            }`}
            aria-label={`Customize ${zone.label}`}
            aria-pressed={activeZoneId === zone.id}
            onClick={() => onSelect(zone.id)}
          >
            {zone.label}
          </button>
        ))}
      </div>
    </div>
  );
}
