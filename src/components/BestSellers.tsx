"use client";

import Image from "next/image";
import { shopifyImageLoader } from "@/lib/imageLoader";
import Link from "next/link";
import { productPriceLabel, products } from "@/data/products";
import styles from "./BestSellers.module.css";

export function BestSellers() {
  // In-stock, priced corporate gifts — buyable today without a quote.
  const list = products
    .filter(
      (p) =>
        p.active !== false &&
        p.subcategory === "Corporate Gifting" &&
        p.stockStatus === "in_stock" &&
        !p.priceOnRequest &&
        p.price > 0 &&
        p.images[0]?.startsWith("https://"),
    )
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
            Ready-to-ship corporate gifts
          </h2>
          <Link
            href={`/products?category=gifts&subcategory=${encodeURIComponent("Corporate Gifting")}&stock=in-stock`}
            className={styles.viewAll}
          >
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
                    loader={shopifyImageLoader(product.images[0] ?? "/images/hsp-mart-logo.png")}
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
                <p className={styles.price}>{productPriceLabel(product)}</p>
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