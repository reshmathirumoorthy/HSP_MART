import Link from "next/link";
import { products } from "@/data/products";
import { ProductCard } from "@/components/ProductCard";
import styles from "./FeaturedCollections.module.css";

export function FeaturedCollections() {
  const featured = products.filter((p) => p.featured).slice(0, 8);

  return (
    <section
      id="products"
      className={styles.section}
      aria-labelledby="featured-heading"
    >
      <div className="shell">
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Popular picks</p>
            <h2 id="featured-heading" className={styles.title}>
              Featured products
            </h2>
            <p className={styles.lead}>
              Real catalogue picks with clear prices. Open a product for options,
              variants, and purchase details.
            </p>
          </div>
          <Link href="/products" className={styles.viewAll}>
            View all products
          </Link>
        </header>

        <div className={styles.grid}>
          {featured.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
