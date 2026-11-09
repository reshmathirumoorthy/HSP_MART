import Link from "next/link";
import Image from "next/image";
import { products, type Product } from "@/data/products";
import styles from "./HomeCategories.module.css";

type Collection = {
  id: string;
  name: string;
  blurb: string;
  href: string;
  match: (product: Product) => boolean;
  /** Preferred cover product; falls back to the first match with a photo. */
  coverSlug?: string;
};

const gifting = (subcategory: string) =>
  `/products?category=gifts&subcategory=${encodeURIComponent(subcategory)}`;

/** Shop-by-occasion entry points — mirrors how HSP Mart customers buy. */
const COLLECTIONS: Collection[] = [
  {
    id: "corporate",
    name: "Corporate Gifting",
    blurb: "Clients, employees & rewards",
    href: gifting("Corporate Gifting"),
    match: (p) => p.subcategory === "Corporate Gifting",
  },
  {
    id: "festive",
    name: "Festive Gifting",
    blurb: "Diwali, Rakhi & seasonal hampers",
    href: gifting("Festive Gifting"),
    match: (p) => p.subcategory === "Festive Gifting",
    coverSlug: "diwali-relish-6",
  },
  {
    id: "wedding",
    name: "Wedding Gifting",
    blurb: "Shagun, platters & return gifts",
    href: gifting("Wedding Gifting"),
    match: (p) => p.subcategory === "Wedding Gifting",
  },
  {
    id: "occasional",
    name: "Occasional Gifting",
    blurb: "Birthdays, anniversaries & baby showers",
    href: gifting("Occasional Gifting"),
    match: (p) => p.subcategory === "Occasional Gifting",
  },
  {
    id: "boards",
    name: "Boards & Presentation",
    blurb: "Whiteboards, notice boards & easels",
    href: "/products?category=presentation",
    match: (p) => p.categorySlug === "presentation",
  },
  {
    id: "personalised",
    name: "Personalised Gifts",
    blurb: "Names, logos & custom platters",
    href: "/products?category=custom",
    match: (p) => p.categorySlug === "custom",
  },
];

function summarise(collection: Collection) {
  const matches = products.filter((p) => p.active && collection.match(p));
  const cover =
    (collection.coverSlug && matches.find((p) => p.slug === collection.coverSlug)) ||
    matches.find((p) => p.images[0]?.startsWith("https://")) ||
    matches.find((p) => p.images.length > 0);
  return { count: matches.length, cover };
}

export function HomeCategories() {
  const list = COLLECTIONS.map((c) => ({ ...c, ...summarise(c) })).filter(
    (c) => c.count > 0,
  );

  return (
    <section
      id="categories"
      className={styles.section}
      aria-labelledby="shop-categories-heading"
    >
      <div className={`shell ${styles.inner}`}>
        <header className={styles.header}>
          <div className={styles.headingBlock}>
            <h2 id="shop-categories-heading" className={styles.title}>
              Shop by occasion
            </h2>
            <p className={styles.lead}>
              From client appreciation to wedding shagun — curated collections,
              ready to order individually or in bulk.
            </p>
          </div>
          <Link href="/products" className={styles.viewAll}>
            View all products
            <span aria-hidden="true">→</span>
          </Link>
        </header>

        <ul className={styles.grid}>
          {list.map((collection, index) => (
            <li key={collection.id}>
              <Link
                href={collection.href}
                className={styles.card}
                aria-label={`${collection.name}, ${collection.count} products`}
              >
                <div className={styles.imageWrap}>
                  {collection.cover ? (
                    <Image
                      src={collection.cover.images[0]}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1100px) 33vw, 420px"
                      className={styles.image}
                      priority={index < 3}
                    />
                  ) : null}
                  <span className={styles.arrow} aria-hidden="true">
                    →
                  </span>
                </div>
                <div className={styles.body}>
                  <span className={styles.name}>{collection.name}</span>
                  <span className={styles.blurb}>{collection.blurb}</span>
                  <span className={styles.count}>
                    {collection.count} {collection.count === 1 ? "product" : "products"}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
