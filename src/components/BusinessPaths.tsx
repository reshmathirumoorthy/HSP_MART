"use client";

import { useState } from "react";
import styles from "./BusinessPaths.module.css";

const paths = [
  {
    num: "01",
    title: "Single Order",
    text: "Place precise requirements for teams, desks and day-to-day operations.",
  },
  {
    num: "02",
    title: "Bulk Procurement",
    text: "Scale quantities for offices, branches and institutional programmes.",
  },
  {
    num: "03",
    title: "Corporate",
    text: "Coordinate multi-department orders with consistent product standards.",
  },
  {
    num: "04",
    title: "Custom",
    text: "Brand, engrave and package products to match your identity.",
  },
];

export function BusinessPaths() {
  const [active, setActive] = useState(0);

  return (
    <section
      id="about"
      className={styles.section}
      data-nav-surface="light"
      aria-labelledby="paths-heading"
    >
      <div className={`shell ${styles.inner}`}>
        <header className={styles.header}>
          <p className="label">Purchasing Flexibility</p>
          <h2 id="paths-heading" className="h1">
            Built for business.
          </h2>
          <p className={styles.signal}>Corporate Procurement · MOQ 25+</p>
        </header>

        <ol className={styles.list}>
          {paths.map((path, index) => {
            const isActive = active === index;
            return (
              <li
                key={path.num}
                className={`${styles.item} ${isActive ? styles.active : ""}`}
                onMouseEnter={() => setActive(index)}
                onFocus={() => setActive(index)}
              >
                <button type="button" className={styles.trigger}>
                  <span className={styles.num}>{path.num}</span>
                  <span className={styles.title}>{path.title}</span>
                </button>
                <p className={styles.text}>{path.text}</p>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
