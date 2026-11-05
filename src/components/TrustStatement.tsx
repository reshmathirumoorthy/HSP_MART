import styles from "./TrustStatement.module.css";

const statements = [
  "Manufacturing",
  "Direct Sourcing",
  "Bulk Supply",
  "Customization",
  "Business Procurement",
];

export function TrustStatement() {
  return (
    <section
      className={styles.section}
      data-nav-surface="dark"
      aria-labelledby="trust-heading"
    >
      <div className={`shell ${styles.inner}`}>
        <p className={`label ${styles.label}`}>How we work</p>
        <h2 id="trust-heading" className="sr-only">
          Business capabilities
        </h2>
        <ul className={styles.list}>
          {statements.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
