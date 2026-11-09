import Link from "next/link";
import styles from "./not-found.module.css";

export default function NotFound() {
  return (
    <div className={styles.page} data-nav-surface="light">
      <div className={`shell ${styles.inner}`}>
        <h1 className={styles.title}>Page not found</h1>
        <p className={styles.copy}>
          The page you&apos;re looking for may have moved or is no longer
          available.
        </p>
        <div className={styles.actions}>
          <Link href="/" className="btn btn--dark">
            Back to home
          </Link>
          <Link href="/products" className="btn btn--ghost-dark">
            Shop products
          </Link>
        </div>
      </div>
    </div>
  );
}
