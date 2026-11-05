import Link from "next/link";
import styles from "./PromoCollections.module.css";

export function PromoCollections() {
  return (
    <section
      className={styles.section}
      data-nav-surface="light"
      aria-labelledby="promo-heading"
    >
      <h2 id="promo-heading" className="sr-only">
        Featured collections
      </h2>
      <div className={`shell ${styles.grid}`}>
        <Link href="/products?category=gifts" className={`${styles.card} ${styles.gold}`}>
          <span className={styles.badge}>Limited edition</span>
          <p className={styles.title}>Festive hampers &amp; sweet treats</p>
          <span className={styles.cta}>View hampers →</span>
        </Link>
        <Link
          href="/products?category=office"
          className={`${styles.card} ${styles.green}`}
        >
          <span className={styles.badge}>School &amp; university</span>
          <p className={styles.title}>Ergonomic school supplies &amp; art kits</p>
          <p className={styles.note}>
            Backpacks, writing tools, and desk essentials for study and studio.
          </p>
          <span className={styles.cta}>Browse supplies →</span>
        </Link>
      </div>
    </section>
  );
}
