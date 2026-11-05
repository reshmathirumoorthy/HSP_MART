import Image from "next/image";
import Link from "next/link";
import styles from "./CorporateGifting.module.css";

export function CorporateGifting() {
  return (
    <section
      id="gifting"
      className={styles.section}
      data-nav-surface="dark"
      aria-labelledby="gifting-heading"
    >
      <div className={styles.media} aria-hidden="true">
        <Image
          src="/images/categories/category-gifts.jpg"
          alt=""
          fill
          sizes="100vw"
          className={styles.photo}
        />
        <div className={styles.scrim} />
      </div>

      <div className={`shell ${styles.inner}`}>
        <div className={styles.copy}>
          <p className={styles.eyebrow}>Corporate gifting</p>
          <h2 id="gifting-heading" className={styles.title}>
            Thoughtful gifts for every occasion
          </h2>
          <p className={styles.lead}>
            Curated sets from the catalogue for clients, teams, and celebrations
            — ready to order or enquire in bulk.
          </p>
          <div className={styles.actions}>
            <Link href="/products?category=gifts" className="btn btn--light">
              Explore gift sets
            </Link>
            <Link href="/bulk-quote" className="btn btn--ghost-light">
              Enquire for bulk
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
