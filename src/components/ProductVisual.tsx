"use client";

import { useState } from "react";
import Image from "next/image";
import type { Product, ProductVisualKind } from "@/data/products";
import { productDisplayImageSrc, productOriginalImageSrc } from "@/lib/productImageSrc";
import styles from "./ProductVisual.module.css";

const toneClass: Record<Product["tone"], string> = {
  sand: styles.toneSand,
  stone: styles.toneStone,
  clay: styles.toneClay,
  olive: styles.toneOlive,
  charcoal: styles.toneCharcoal,
  taupe: styles.toneTaupe,
};

export type ProductVisualVariant = "default" | "card" | "gallery" | "compact";

type Props = {
  product: Product;
  featured?: boolean;
  /** Prefer a specific image index when available. */
  imageIndex?: number;
  /**
   * Optional explicit image URL (e.g. selected variant photo).
   * Must be a real asset path — never invents imagery.
   */
  imageSrc?: string;
  /** Extra alt context such as a variant colour label. */
  altSuffix?: string;
  sizes?: string;
  priority?: boolean;
  /** Presentation context for padding, hover, and surface treatment. */
  variant?: ProductVisualVariant;
  /**
   * On desktop hover, crossfade to the second catalogue image when one exists.
   * Only for card surfaces — never invents a second image.
   */
  hoverReveal?: boolean;
  /** Use the original catalogue image (no transparent cutout) for the main PDP gallery. */
  useOriginalSrc?: boolean;
};

function imageAlt(
  product: Product,
  imageIndex: number,
  altSuffix?: string,
): string {
  const base =
    product.images.length > 1
      ? `${product.name}, image ${imageIndex + 1}`
      : product.name;
  return altSuffix ? `${base} — ${altSuffix}` : base;
}

export function ProductVisual({
  product,
  featured = false,
  imageIndex = 0,
  imageSrc,
  altSuffix,
  sizes = "(max-width: 768px) 90vw, 320px",
  priority = false,
  variant = "default",
  hoverReveal = false,
  useOriginalSrc = false,
}: Props) {
  const rawPrimary =
    imageSrc ?? product.images[imageIndex] ?? product.images[0];
  const primarySrc = rawPrimary
    ? useOriginalSrc
      ? productOriginalImageSrc(rawPrimary)
      : productDisplayImageSrc(rawPrimary)
    : undefined;
  const secondarySrc =
    !imageSrc &&
    hoverReveal &&
    product.images.length > 1 &&
    imageIndex === 0
      ? productDisplayImageSrc(product.images[1])
      : undefined;
  const [failed, setFailed] = useState(false);
  const [secondaryFailed, setSecondaryFailed] = useState(false);
  const showPhoto = Boolean(primarySrc) && !failed;
  const showSecondary = Boolean(secondarySrc) && !secondaryFailed;

  const variantClass =
    variant === "card"
      ? styles.stageCard
      : variant === "gallery"
        ? styles.stageGallery
        : variant === "compact"
          ? styles.stageCompact
          : "";

  return (
    <div
      className={`${styles.stage} ${toneClass[product.tone]} ${featured ? styles.featured : ""} ${showPhoto ? styles.hasPhoto : ""} ${showSecondary ? styles.hasSecondary : ""} ${variantClass}`}
    >
      {showPhoto && primarySrc ? (
        <div className={styles.photoFrame}>
          <Image
            src={primarySrc}
            alt={imageAlt(product, imageIndex, altSuffix)}
            fill
            sizes={sizes}
            className={`${styles.photo} ${styles.photoPrimary}`}
            priority={priority}
            onError={() => setFailed(true)}
          />
          {showSecondary && secondarySrc ? (
            <Image
              src={secondarySrc}
              alt=""
              fill
              sizes={sizes}
              className={`${styles.photo} ${styles.photoSecondary}`}
              aria-hidden
              onError={() => setSecondaryFailed(true)}
            />
          ) : null}
        </div>
      ) : (
        <>
          <div className={styles.glow} aria-hidden />
          <div className={styles.surface} aria-hidden />
          <div className={styles.object} data-product-object aria-hidden>
            <VisualShape kind={product.visual} />
          </div>
          <span className={styles.fallbackLabel}>
            {product.subcategory || product.category}
          </span>
        </>
      )}
    </div>
  );
}

function VisualShape({ kind }: { kind: ProductVisualKind }) {
  switch (kind) {
    case "organizer":
      return (
        <div className={`${styles.shape} ${styles.organizer}`}>
          <span className={styles.orgBase} />
          <span className={styles.orgTray} />
          <span className={styles.orgSlotA} />
          <span className={styles.orgSlotB} />
          <span className={styles.orgCup} />
        </div>
      );
    case "notebook":
      return (
        <div className={`${styles.shape} ${styles.notebook}`}>
          <span className={styles.nbBack} />
          <span className={styles.nbMid} />
          <span className={styles.nbFront} />
          <span className={styles.nbBand} />
        </div>
      );
    case "folder":
      return (
        <div className={`${styles.shape} ${styles.folder}`}>
          <span className={styles.folderA} />
          <span className={styles.folderB} />
          <span className={styles.folderC} />
        </div>
      );
    case "tumbler":
      return (
        <div className={`${styles.shape} ${styles.tumbler}`}>
          <span className={styles.tumLid} />
          <span className={styles.tumBody} />
          <span className={styles.tumBand} />
          <span className={styles.tumBase} />
        </div>
      );
    case "kit":
      return (
        <div className={`${styles.shape} ${styles.kit}`}>
          <span className={styles.kitBox} />
          <span className={styles.kitLid} />
          <span className={styles.kitItemA} />
          <span className={styles.kitItemB} />
        </div>
      );
    case "pen":
      return (
        <div className={`${styles.shape} ${styles.pen}`}>
          <span className={styles.penA} />
          <span className={styles.penB} />
          <span className={styles.penC} />
        </div>
      );
    default:
      return null;
  }
}
