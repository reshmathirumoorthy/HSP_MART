"use client";

import Link from "next/link";
import Image from "next/image";
import { company } from "@/data/company";
import styles from "./BrandIntroduction.module.css";

export function BrandIntroduction() {
  return (
    <section
      id="brand-introduction"
      className={styles.section}
      aria-labelledby="brand-heading"
    >
      <div className={`shell ${styles.inner}`}>
        <div className={styles.grid}>
          <div className={styles.copy}>
            <p className={styles.eyebrow}>About HSP Mart</p>
            <h2 id="brand-heading" className={styles.title}>
              Stationery for Every Moment
            </h2>
            <p className={styles.lead}>
              {company.tagline}
            </p>
            <p className={styles.body}>
              {company.description}
            </p>
            <div className={styles.actions}>
              <Link href="/products" className={`btn btn--forest ${styles.btnPrimary}`}>
                Shop Stationery
              </Link>
              <Link href="/about" className={`btn btn--outline ${styles.btnSecondary}`}>
                About Us
              </Link>
            </div>
          </div>
          <div className={styles.image}>
            <Image
              src="/images/about-workspace.jpg"
              alt="Premium workspace with notebooks, a planner, pen and eucalyptus arranged on a wooden desk"
              fill
              sizes="(max-width: 959px) 100vw, 48vw"
              className={styles.photo}
              objectFit="cover"
              objectPosition="center center"
              priority
            />
          </div>
        </div>
      </div>
    </section>
  );
}
