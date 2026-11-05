import Link from "next/link";
import styles from "./not-found.module.css";

export default function ProductNotFound() {
  return (
    <div className={styles.page} data-nav-surface="light">
      <div className={`shell ${styles.inner}`}>
        <p className={styles.label}>Unavailable</p>
        <h1 className={styles.title}>Product not found</h1>
        <p className={styles.copy}>
          The product you&apos;re looking for may have moved or is no longer
          available.
        </p>
        <div className={styles.actions}>
          <Link href="/products" className="btn btn--dark">
            Back to products
          </Link>
          <Link href="/products" className="btn btn--ghost-dark">
            Shop all products
          </Link>
        </div>
      </div>
    </div>
  );
}
