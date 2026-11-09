import styles from "./TrustStrip.module.css";

const TRUST_ITEMS = [
  { label: "Bulk ordering", detail: "Volume discounts for teams" },
  { label: "Custom branding", detail: "Logo, text & packaging" },
  { label: "Product quality", detail: "Genuine stationery & deskware" },
  { label: "Reliable delivery", detail: "Pan-India dispatch" },
];

export function TrustStrip() {
  return (
    <section className={styles.section} aria-label="Shopping benefits">
      <div className={`shell ${styles.grid}`}>
        {TRUST_ITEMS.map((item) => (
          <div key={item.label} className={`${styles.item} ${styles.reveal}`}>
            <p className={styles.label}>{item.label}</p>
            <p className={styles.detail}>{item.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
