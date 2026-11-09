"use client";

import Link from "next/link";
import Image from "next/image";
import { shopifyImageLoader } from "@/lib/imageLoader";
import { useEffect, useRef, useState } from "react";
import styles from "./CampaignBanner.module.css";

type Variant = "bulk" | "gifting";

type Slide = { src: string; alt: string };

const GIFTING_HOLD_MS = 5000;

const GIFTING_SLIDES: Slide[] = [
  {
    src: "/images/categories/category-desk.jpg",
    alt: "Open notebook with fountain pen and glasses on a wooden desk",
  },
  {
    src: "/images/categories/category-stationery-supplies.jpg",
    alt: "Colourful stationery and craft supplies arranged for gifting",
  },
  {
    src: "/images/categories/category-custom.jpg",
    alt: "Personalised corporate stationery with a notebook and fountain pen",
  },
  {
    src: "/images/products/harry-potter-quill-main.jpg",
    alt: "Premium gift set with a quill pen in an elegant presentation box",
  },
];

const CAMPAIGNS: Record<
  Variant,
  {
    eyebrow: string;
    title: string;
    copy: string;
    ctaPrimary: string;
    ctaPrimaryHref: string;
    ctaSecondary: string;
    ctaSecondaryHref: string;
    image: string;
    imageAlt: string;
    badge?: string;
  }
> = {
  bulk: {
    eyebrow: "Business & Institutional Supply",
    title: "Everything Your Workplace Needs. All in One Place.",
    copy:
      "Equip your office, institution or organisation with dependable stationery and workplace essentials. Get competitive bulk pricing, customised orders and dedicated support for your requirements.",
    ctaPrimary: "Explore Bulk Catalogue",
    ctaPrimaryHref: "/products?category=office",
    ctaSecondary: "Request a Bulk Quote",
    ctaSecondaryHref: "/bulk-quote",
    image: "/images/categories/category-office.jpg",
    imageAlt: "Office supplies and stationery collection for workplace setup",
    badge: "Min. 25 units",
  },
  gifting: {
    eyebrow: "Thoughtful Corporate Gifting",
    title: "Make Every Corporate Gift Feel Personal.",
    copy:
      "Create memorable gifting experiences for employees, clients and business partners. Discover thoughtfully curated gift collections with customisation and bulk-order support.",
    ctaPrimary: "Explore Gift Collections",
    ctaPrimaryHref: "/products?category=gifts",
    ctaSecondary: "Customise Your Gifts",
    ctaSecondaryHref: "/bulk-quote",
    image: "/images/categories/category-gifts.jpg",
    imageAlt: "Curated gift collection for corporate gifting",
    badge: "Branding available",
  },
};

export function CampaignBanner({ variant }: { variant: Variant }) {
  const c = CAMPAIGNS[variant];
  const isBulk = variant === "bulk";
  const [visible, setVisible] = useState(false);
  const [slide, setSlide] = useState({ current: 0, previous: 0 });
  const frameRef = useRef<HTMLDivElement>(null);

  const slides: Slide[] = isBulk
    ? []
    : [{ src: c.image, alt: c.imageAlt }, ...GIFTING_SLIDES];
  const slideCount = slides.length;

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (slideCount < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    const frame = frameRef.current;
    if (!frame) return;

    let interval: number | null = null;
    const startWhenReady = () => {
      if (interval !== null) return;
      const imgs = frame.querySelectorAll("img");
      if (imgs.length !== slideCount) return;
      const ready = Array.from(imgs).every(
        (img) => img.complete && img.naturalWidth > 0,
      );
      if (!ready) return;
      interval = window.setInterval(() => {
        setSlide(({ current }) => ({
          current: (current + 1) % slideCount,
          previous: current,
        }));
      }, GIFTING_HOLD_MS);
    };

    frame.addEventListener("load", startWhenReady, true);
    startWhenReady();
    return () => {
      frame.removeEventListener("load", startWhenReady, true);
      if (interval !== null) window.clearInterval(interval);
    };
  }, [slideCount]);

  return (
    <section
      className={`${styles.section} ${isBulk ? styles.bulk : styles.gifting}`}
      aria-labelledby={`campaign-${variant}-heading`}
    >
      <div className={styles.wrap}>
        {isBulk ? (
          <>
            <div className={styles.copy}>
              {c.badge && (
                <span className={`${styles.badge} ${styles.badgeBulk}`}>
                  {c.badge}
                </span>
              )}
              <p className={styles.eyebrow}>{c.eyebrow}</p>
              <h2 id={`campaign-${variant}-heading`} className={styles.title}>
                {c.title}
              </h2>
              <p className={styles.lead}>{c.copy}</p>
              <div className={styles.actions}>
                <Link
                  href={c.ctaPrimaryHref}
                  className={`btn btn--ghost ${styles.ctaPrimary}`}
                >
                  {c.ctaPrimary}
                </Link>
                <Link
                  href={c.ctaSecondaryHref}
                  className={`btn btn--forest ${styles.ctaSecondary}`}
                >
                  {c.ctaSecondary}
                </Link>
              </div>
            </div>
            <div className={styles.media}>
              <div className={styles.frame}>
                <Image
                  src={c.image}
                  loader={shopifyImageLoader(c.image)}
                  alt={c.imageAlt}
                  fill
                  sizes="(max-width: 959px) 100vw, 48vw"
                  className={styles.photo}
                  objectFit="cover"
                  objectPosition="center center"
                  priority={variant === "bulk"}
                />
              </div>
            </div>
          </>
        ) : (
          <>
            <div className={styles.media}>
              <div className={styles.frame} ref={frameRef}>
                {slides.map((item, i) => {
                  const isActive = i === slide.current;
                  const isPrev = i === slide.previous;
                  return (
                    <Image
                      key={item.src}
                      src={item.src}
                      alt={item.alt}
                      fill
                      sizes="(max-width: 959px) 100vw, 48vw"
                      className={`${styles.photo} ${
                        slideCount > 1 ? styles.photoSlide : ""
                      } ${
                        isActive
                          ? styles.photoSlideActive
                          : isPrev
                            ? styles.photoSlidePrev
                            : ""
                      }`}
                      objectFit="cover"
                      objectPosition="center center"
                      priority={i === 0}
                      loading={i === 0 ? undefined : "eager"}
                      aria-hidden={!isActive}
                    />
                  );
                })}
              </div>
            </div>
            <div className={styles.copy}>
              {c.badge && (
                <span className={`${styles.badge} ${styles.badgeGifting}`}>
                  {c.badge}
                </span>
              )}
              <p className={styles.eyebrow}>{c.eyebrow}</p>
              <h2 id={`campaign-${variant}-heading`} className={styles.title}>
                {c.title}
              </h2>
              <p className={styles.lead}>{c.copy}</p>
              <div className={styles.actions}>
                <Link
                  href={c.ctaPrimaryHref}
                  className={`btn btn--ghost ${styles.ctaPrimary}`}
                >
                  {c.ctaPrimary}
                </Link>
                <Link
                  href={c.ctaSecondaryHref}
                  className={`btn btn--forest ${styles.ctaSecondary}`}
                >
                  {c.ctaSecondary}
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
