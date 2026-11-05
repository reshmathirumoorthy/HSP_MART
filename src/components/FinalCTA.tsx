import Link from "next/link";
import styles from "./FinalCTA.module.css";

export function FinalCTA() {
  return (
    <section
      id="cta"
      className={styles.section}
      data-nav-surface="dark"
      aria-labelledby="cta-heading"
    >
      <div className={`shell ${styles.inner}`}>
        <p className={styles.eyebrow}>Ready when you are</p>
        <h2 id="cta-heading" className={styles.title}>
          Shop for yourself.
          <br />
          Enquire for your team.
        </h2>
        <p className={styles.lead}>
          Start in the catalogue for individual orders — or send a bulk enquiry
          when you need volume, gifting, or branding support.
        </p>
        <div className={styles.actions}>
          <Link href="/products" className="btn btn--light">
            Shop the catalogue
          </Link>
          <Link href="/bulk-quote" className="btn btn--ghost">
            Request a bulk quote
          </Link>
        </div>
      </div>
    </section>
  );
}
