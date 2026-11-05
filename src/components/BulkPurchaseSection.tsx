import Link from "next/link";
import type { Product } from "@/data/products";
import styles from "./BulkPurchaseSection.module.css";

type Props = {
  product: Product;
};

export function BulkPurchaseSection({ product }: Props) {
  if (!product.bulkAvailable) return null;

  return (
    <section className={styles.section} aria-labelledby="bulk-heading">
      <div className={styles.inner}>
        <header className={styles.header}>
          <p className={styles.label}>Business option</p>
          <h2 id="bulk-heading" className={styles.title}>
            Buying more?
          </h2>
          <p className={styles.copy}>
            Need larger quantities for your team, office, event or business?
          </p>
        </header>

        {product.minOrderQuantity ? (
          <p className={styles.moq}>
            Minimum bulk quantity · {product.minOrderQuantity} units
          </p>
        ) : null}

        <Link
          href={`/bulk-quote?product=${product.slug}`}
          className="btn btn--dark"
        >
          Request a bulk quote
        </Link>
      </div>
    </section>
  );
}
