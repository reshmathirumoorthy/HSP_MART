import styles from "./TrustBar.module.css";

const items = [
  {
    title: "Expert advice",
    body: "Guidance over a phone call for product and bulk questions.",
  },
  {
    title: "Delhi retail store",
    body: "Pickup available at Paschim Vihar, New Delhi.",
  },
];

export function TrustBar() {
  return (
    <section className={styles.section} aria-label="How shopping works">
      <div className={`shell ${styles.grid}`}>
        {items.map((item) => (
          <div key={item.title} className={styles.item}>
            <span className={styles.mark} aria-hidden="true" />
            <h3 className={styles.title}>{item.title}</h3>
            <p className={styles.body}>{item.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
