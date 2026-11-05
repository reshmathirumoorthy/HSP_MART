import type { HomepageVisualAsset } from "@/data/homepageVisuals";
import styles from "./EditorialPhotoPanel.module.css";

type Props = {
  visual: HomepageVisualAsset;
  /** Optional section layout class (grid placement, hover, etc.). */
  className?: string;
};

/**
 * Shared homepage editorial photo panel.
 *
 * Replaces CSS-only gradient “visual” blocks used by Gifting / Why-HSP
 * composition cards. Renders a real existing public/ image with cover crop
 * and a light label scrim — never invents photography.
 */
export function EditorialPhotoPanel({ visual, className }: Props) {
  const labelTone = visual.labelTone ?? "light";

  return (
    <div
      className={[styles.panel, className].filter(Boolean).join(" ")}
      style={{ backgroundColor: visual.fallbackTone }}
      data-label-tone={labelTone}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- decorative public/ photography */}
      <img
        className={styles.photo}
        src={visual.src}
        alt=""
        width={visual.width}
        height={visual.height}
        decoding="async"
        style={
          visual.objectPosition
            ? { objectPosition: visual.objectPosition }
            : undefined
        }
      />
      <span className={styles.label}>{visual.label}</span>
    </div>
  );
}
