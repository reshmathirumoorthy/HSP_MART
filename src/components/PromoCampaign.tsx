import Image from "next/image";
import Link from "next/link";
import styles from "./PromoCampaign.module.css";

/** Seasonal / business campaign — no invented countdown or discount. */
export function PromoCampaign() {
  return (
    <section
      className={styles.section}
      aria-labelledby="promo-campaign-heading"
      data-nav-surface="light"
    >
      <div className={`shell ${styles.layout}`}>
        <div className={styles.copy}>
          <p className={styles.eyebrow}>Corporate &amp; occasions</p>
          <h2 id="promo-campaign-heading" className={styles.title}>
            Gifting that feels considered
          </h2>
          <p className={styles.lead}>
            Explore curated gift sets from the catalogue for clients, teams, and
            celebrations — or request a quote for larger quantities.
          </p>
          <div className={styles.actions}>
            <Link
              href="/products?category=gifts"
              className={`btn btn--primary ${styles.cta}`}
            >
              Shop gifting →
            </Link>
            <Link href="/bulk-quote" className={`btn btn--outline ${styles.cta}`}>
              Request a quote
            </Link>
          </div>
        </div>

        <div className={styles.mediaStack} aria-hidden="true">
          <div className={styles.mediaPrimary}>
            <Image
              src="/images/categories/category-gifts.jpg"
              alt=""
              fill
              sizes="(max-width: 959px) 100vw, 36vw"
              className={styles.photo}
            />
          </div>
          <div className={styles.mediaSecondary}>
            <Image
              src="/images/categories/category-desk.jpg"
              alt=""
              fill
              sizes="(max-width: 959px) 100vw, 28vw"
              className={styles.photo}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
