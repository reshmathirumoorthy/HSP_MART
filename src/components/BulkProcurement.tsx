import Link from "next/link";
import styles from "./BulkProcurement.module.css";

const scales = [
  { label: "01", value: "1" },
  { label: "02", value: "25+" },
  { label: "03", value: "50+" },
  { label: "04", value: "100+" },
  { label: "05", value: "500+" },
  { label: "06", value: "1,000+" },
];

export function BulkProcurement() {
  return (
    <section
      id="bulk"
      className={styles.section}
      data-nav-surface="light"
      aria-labelledby="bulk-heading"
    >
      <div className={`shell ${styles.inner}`}>
        <header className={styles.header}>
          <div className={styles.headerTop}>
            <p className="label">Bulk Orders</p>
            <p className={styles.signal}>Any quantity that works for you</p>
          </div>
          <h2 id="bulk-heading" className="h1">
            For business, events
            <br />
            &amp; larger orders.
          </h2>
          <p className={`body ${styles.lead}`}>
            From small retail purchases to large-scale requirements, HSP Mart
            can support bulk quantities and customization.
          </p>
        </header>

        <div className={styles.scaleRow} aria-label="Order scale">
          {scales.map((item) => (
            <div key={item.label} className={styles.scaleItem}>
              <span className={styles.scaleLabel}>{item.label}</span>
              <span className={styles.scaleValue}>{item.value}</span>
            </div>
          ))}
        </div>

        <div className={styles.ctaRow}>
          <Link href="/bulk-quote" className="btn btn--dark">
            Request a bulk quote
          </Link>
        </div>
      </div>
    </section>
  );
}
