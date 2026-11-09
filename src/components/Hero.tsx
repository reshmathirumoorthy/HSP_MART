"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import styles from "./Hero.module.css";

const eyebrow = "THE HSP COLLECTION";
const heading = "Find your everyday essential.";
const subheading =
  "A considered collection for work, study and creative moments.";
const ctaPrimary = "Shop Now";
const ctaPrimaryHref = "/products";
const ctaSecondary = "Request a Bulk Quote";
const ctaSecondaryHref = "/bulk-quote";

export function Hero() {
  const [visible, setVisible] = useState<Set<number>>(new Set());
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const els = document.querySelectorAll<HTMLElement>("[data-reveal]");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Number(
              (entry.target as HTMLElement).dataset.revealIndex ?? "0",
            );
            setVisible((prev) => {
              const next = new Set(prev);
              next.add(idx);
              return next;
            });
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -5% 0px" },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <section className={styles.hero} aria-labelledby="hero-heading">
      <div className={styles.imageWrap}>
        <Image
          src="/images/hero-stationery-flatlay.jpg"
          alt="Executive stationery workspace with notebooks, pens, desk accessories, and a tumbler"
          className={styles.photo}
          fill
          sizes="100vw"
          priority
        />
        <div className={styles.textSafeArea} />
      </div>

      <div className={styles.content}>
        <div className={styles.copy}>
          <p
            className={`${styles.eyebrow} ${visible.has(1) ? styles.isVisible : ""}`}
            data-reveal
            data-reveal-index="1"
            aria-hidden={true}
          >
            {eyebrow}
          </p>
          <h1
            id="hero-heading"
            className={`${styles.title} ${visible.has(2) ? styles.isVisible : ""}`}
            data-reveal
            data-reveal-index="2"
          >
            {heading}
          </h1>
          <p
            className={`${styles.lead} ${visible.has(3) ? styles.isVisible : ""}`}
            data-reveal
            data-reveal-index="3"
          >
            {subheading}
          </p>
          <div
            className={`${styles.ctas} ${visible.has(4) ? styles.isVisible : ""}`}
            data-reveal
            data-reveal-index="4"
          >
            <Link href={ctaPrimaryHref} className={`btn btn--forest ${styles.ctaPrimary}`}>
              {ctaPrimary}
            </Link>
            <Link
              href={ctaSecondaryHref}
              className={`btn btn--cream ${styles.ctaSecondary}`}
            >
              {ctaSecondary}
            </Link>
          </div>
        </div>

        <aside className={styles.note}>
          <p className={styles.noteLabel}>Featured collection</p>
          <p className={styles.noteCopy}>
            Executive notebooks, precision writing instruments, desk organisers,
            and curated gift hampers for modern workspaces.
          </p>
        </aside>
      </div>
    </section>
  );
}