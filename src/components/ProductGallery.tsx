"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import type { Product } from "@/data/products";
import { ProductVisual } from "@/components/ProductVisual";
import { trapTabKey } from "@/lib/focusTrap";
import { productDisplayImageSrc, productOriginalImageSrc } from "@/lib/productImageSrc";
import styles from "./ProductGallery.module.css";

type Props = {
  product: Product;
  /** Real variant photograph, when the selected colour has one. */
  preferredSrc?: string;
  imageAltSuffix?: string;
};

function galleryAlt(product: Product, index: number, total: number): string {
  if (total > 1) {
    return `${product.name}, image ${index + 1} of ${total}`;
  }
  return product.name;
}

export function ProductGallery({
  product,
  preferredSrc,
  imageAltSuffix,
}: Props) {
  const images = useMemo(() => {
    const base = product.images;
    if (!preferredSrc) return base;
    return [preferredSrc, ...base.filter((src) => src !== preferredSrc)];
  }, [preferredSrc, product.images]);
  const imageKey = `${product.id}:${preferredSrc ?? ""}`;
  const [active, setActive] = useState(0);
  const [trackedKey, setTrackedKey] = useState(imageKey);
  if (trackedKey !== imageKey) {
    setTrackedKey(imageKey);
    setActive(0);
  }
  const [lightbox, setLightbox] = useState(false);
  const openerRef = useRef<HTMLButtonElement>(null);
  const lightboxRef = useRef<HTMLDivElement>(null);
  const hasPhotos = images.length > 0;
  const multi = images.length > 1;
  const safeIndex = Math.min(active, Math.max(images.length - 1, 0));

  const go = useCallback(
    (delta: number) => {
      if (images.length < 2) return;
      setActive((current) => (current + delta + images.length) % images.length);
    },
    [images.length],
  );

  useEffect(() => {
    if (!lightbox) return;
    const dialog = lightboxRef.current;
    const opener = openerRef.current;
    dialog
      ?.querySelector<HTMLButtonElement>("[data-lightbox-close]")
      ?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setLightbox(false);
        return;
      }
      if (event.key === "ArrowRight") go(1);
      if (event.key === "ArrowLeft") go(-1);
      if (dialog) trapTabKey(event, dialog);
    };
    window.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      opener?.focus();
    };
  }, [lightbox, go]);

  if (!hasPhotos) {
    return (
      <div className={styles.gallery}>
        <div className={styles.main}>
          <ProductVisual
            product={product}
            featured
            variant="gallery"
            sizes="(max-width: 960px) 100vw, 48vw"
            useOriginalSrc
          />
        </div>
        <p className={styles.caption}>
          Category preview · {product.subcategory || product.category}
        </p>
      </div>
    );
  }

  return (
    <div className={styles.gallery}>
      <div className={styles.main}>
        <button
          ref={openerRef}
          type="button"
          className={styles.mainButton}
          onClick={() => setLightbox(true)}
          aria-label={`Expand image of ${product.name}`}
        >
          <ProductVisual
            product={product}
            featured
            variant="gallery"
            imageSrc={images[safeIndex]}
            altSuffix={safeIndex === 0 ? imageAltSuffix : undefined}
            sizes="(max-width: 960px) 100vw, 52vw"
            priority
            useOriginalSrc
          />
        </button>
        {multi ? (
          <div className={styles.nav}>
            <button
              type="button"
              className={styles.navBtn}
              onClick={() => go(-1)}
              aria-label="Previous image"
            >
              ‹
            </button>
            <button
              type="button"
              className={styles.navBtn}
              onClick={() => go(1)}
              aria-label="Next image"
            >
              ›
            </button>
          </div>
        ) : null}
      </div>

      {multi ? (
        <div
          className={styles.thumbs}
          role="tablist"
          aria-label="Product images"
        >
          {images.map((src, index) => {
            const selected = index === safeIndex;
            return (
              <button
                key={src}
                type="button"
                role="tab"
                className={`${styles.thumb} ${selected ? styles.active : ""}`}
                onClick={() => setActive(index)}
                aria-label={galleryAlt(product, index, images.length)}
                aria-selected={selected}
                tabIndex={selected ? 0 : -1}
                onKeyDown={(event) => {
                  if (event.key === "ArrowRight") {
                    event.preventDefault();
                    go(1);
                  } else if (event.key === "ArrowLeft") {
                    event.preventDefault();
                    go(-1);
                  }
                }}
              >
                <Image
                  src={productDisplayImageSrc(src)}
                  alt=""
                  width={80}
                  height={80}
                  className={styles.thumbImage}
                />
              </button>
            );
          })}
        </div>
      ) : null}

      <p className={styles.caption} aria-live="polite">
        {product.name}
        {multi ? ` · ${safeIndex + 1} / ${images.length}` : null}
      </p>

      {lightbox ? (
        <div
          ref={lightboxRef}
          className={styles.lightbox}
          role="dialog"
          aria-modal="true"
          aria-label={`${product.name} image viewer`}
        >
          <button
            type="button"
            className={styles.lightboxBackdrop}
            aria-label="Close image viewer"
            onClick={() => setLightbox(false)}
          />
          <div className={styles.lightboxPanel}>
            <Image
              src={productDisplayImageSrc(images[safeIndex])}
              alt={galleryAlt(product, safeIndex, images.length)}
              width={1200}
              height={1200}
              className={styles.lightboxImage}
              priority
            />
            <p className={styles.lightboxStatus} aria-live="polite">
              {safeIndex + 1} of {images.length}
            </p>
            <div className={styles.lightboxBar}>
              {multi ? (
                <button
                  type="button"
                  className="btn btn--outline"
                  onClick={() => go(-1)}
                >
                  Previous
                </button>
              ) : null}
              <button
                type="button"
                className="btn btn--primary"
                data-lightbox-close
                onClick={() => setLightbox(false)}
              >
                Close
              </button>
              {multi ? (
                <button
                  type="button"
                  className="btn btn--outline"
                  onClick={() => go(1)}
                >
                  Next
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
