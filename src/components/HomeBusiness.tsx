import Image from "next/image";
import Link from "next/link";
import styles from "./HomeBusiness.module.css";

export function HomeBusiness() {
  return (
    <section className={styles.section} aria-labelledby="business-heading">
      <div className={`shell ${styles.grid}`}>
        <article className={styles.card}>
          <div className={styles.copy}>
            <p className={styles.eyebrow}>For teams &amp; offices</p>
            <h2 id="business-heading" className={styles.title}>
              Buy in bulk with a clear quote
            </h2>
            <p className={styles.body}>
              Need larger quantities for your office, school, or event? Send a
              bulk quote with the products and quantities you need. Pricing is
              confirmed through the quote process.
            </p>
            <Link href="/bulk-quote" className={`btn btn--primary ${styles.cta}`}>
              Request Bulk Quote
            </Link>
          </div>
          <div className={styles.media} aria-hidden="true">
            <Image
              src="/images/products/box-file-main.webp"
              alt=""
              fill
              sizes="(max-width: 859px) 90vw, 280px"
              className={styles.image}
            />
          </div>
        </article>

        <article className={`${styles.card} ${styles.cardAlt}`}>
          <div className={styles.copy}>
            <p className={styles.eyebrow}>Personalization</p>
            <h2 className={styles.title}>Customize eligible products</h2>
            <p className={styles.body}>
              Selected items support names, logos, or packaging options. Open a
              customizable product to preview before you order.
            </p>
            <Link
              href="/products?customizable=true"
              className={`btn btn--outline ${styles.cta}`}
            >
              Browse Customizable Products
            </Link>
          </div>
          <div className={styles.media} aria-hidden="true">
            <Image
              src="/images/products/a5-fancy-magnetic-notebook-main.jpg"
              alt=""
              fill
              sizes="(max-width: 859px) 90vw, 280px"
              className={styles.image}
            />
          </div>
        </article>
      </div>
    </section>
  );
}
