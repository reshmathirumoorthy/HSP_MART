"use client";

import Link from "next/link";
import styles from "./not-found.module.css";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

/**
 * Route-level error boundary: gives users a recovery path instead of Next's
 * default blank page when a render throws.
 */
export default function Error({ error, reset }: Props) {
  return (
    <div className={styles.page} data-nav-surface="light">
      <div className={`shell ${styles.inner}`}>
        <p className={styles.label}>Something went wrong</p>
        <h1 className={styles.title}>We hit an unexpected error</h1>
        <p className={styles.copy}>
          The page could not be loaded. Try again, or head back to the
          homepage.
        </p>
        <div className={styles.actions}>
          <button type="button" className="btn btn--dark" onClick={reset}>
            Try again
          </button>
          <Link href="/" className="btn btn--ghost-dark">
            Back to home
          </Link>
        </div>
        {error?.digest ? (
          <p className={styles.copy}>
            <small>Reference: {error.digest}</small>
          </p>
        ) : null}
      </div>
    </div>
  );
}
