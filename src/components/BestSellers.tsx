"use client";

import Image from "next/image";
import Link from "next/link";
import { formatPrice, products } from "@/data/products";
import styles from "./BestSellers.module.css";

export function BestSellers() {
  const list = products
    .filter((p) => p.active !== false && p.featured)
    .slice(0, 4);

  if (!list.length) return null;

  return (
    <section
      id="best-sellers"
      className={styles.section}
      aria-labelledby="bestsellers-heading"
    >
      <div className="shell">
        <header className={styles.header}>
          <h2 id="bestsellers-heading" className={styles.title}>
            Best sellers
          </h2>
          <Link href="/products" className={styles.viewAll}>
            View all →
          </Link>
        </header>

        <ul className={styles.grid}>
          {list.map((product) => (
            <li key={product.id} className={styles.card}>
              <Link
                href={`/products/${product.slug}`}
                className={styles.media}
                aria-label={`View ${product.name}`}
              >
                <span className={styles.photoFrame}>
                  <Image
                    src={product.images[0] ?? "/images/hsp-mart-logo.png"}
                    alt={product.name}
                    fill
                    sizes="(max-width: 959px) 100vw, 220px"
                    className={styles.image}
                  />
                </span>
              </Link>
              <div className={styles.body}>
                <p className={styles.category}>{product.category}</p>
                <h3 className={styles.name}>
                  <Link href={`/products/${product.slug}`}>{product.name}</Link>
                </h3>
                <p className={styles.price}>{formatPrice(product.price)}</p>
                <p className={styles.summary}>{product.shortDescription}</p>
                <Link
                  href={`/products/${product.slug}`}
                  className={`btn btn--forest ${styles.cta}`}
                >
                  View product
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}