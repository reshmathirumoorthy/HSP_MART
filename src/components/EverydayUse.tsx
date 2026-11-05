import styles from "./EverydayUse.module.css";

const contexts = ["Home", "Office", "Work", "Teams", "Gifting"];

export function EverydayUse() {
  return (
    <section
      id="everyday"
      className={styles.section}
      data-nav-surface="light"
      aria-labelledby="everyday-heading"
    >
      <div className={`shell ${styles.inner}`}>
        <div className={styles.copy}>
          <p className="label">Everyday Use</p>
          <h2 id="everyday-heading" className="h1">
            For your desk.
            <br />
            For your day.
          </h2>
          <p className={`body ${styles.lead}`}>
            Thoughtful stationery, workspace essentials and everyday products
            for home, office and team use.
          </p>
        </div>

        <ul className={styles.contexts}>
          {contexts.map((item, index) => (
            <li key={item}>
              <span>0{index + 1}</span>
              {item}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
