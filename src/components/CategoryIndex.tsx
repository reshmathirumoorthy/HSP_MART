import Link from "next/link";
import styles from "./CategoryIndex.module.css";

const tiles = [
  {
    href: "/products?category=gifts",
    eyebrow: "Corporate & teams",
    title: "Corporate gifts & welcome kits",
    body: "Hampers, planners, pens, and curated sets for clients and employees.",
    cta: "Explore gifts",
    tone: "green" as const,
  },
  {
    href: "/products?category=stationery",
    eyebrow: "Everyday desk",
    title: "Stationery & notebooks",
    body: "Notebooks, sticky notes, and desk tools for daily work.",
    cta: "Shop stationery",
    tone: "cream" as const,
  },
  {
    href: "/products?category=office",
    eyebrow: "Office basics",
    title: "Files, folders & storage",
    body: "Box files, binders, and organisers that keep paperwork in order.",
    cta: "Browse office",
    tone: "gold" as const,
  },
  {
    href: "/products?customizable=true",
    eyebrow: "Branding",
    title: "Custom & bulk-ready items",
    body: "Products that support logos, names, and larger order quantities.",
    cta: "View customisable",
    tone: "deep" as const,
  },
];

export function CategoryIndex() {
  return (
    <section
      id="featured-collections"
      className={styles.section}
      data-nav-surface="light"
      aria-labelledby="featured-collections-heading"
    >
      <div className={`shell ${styles.inner}`}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Featured collections</p>
            <h2 id="featured-collections-heading" className={styles.title}>
              Shop what HSP Mart is known for
            </h2>
          </div>
          <p className={styles.support}>
            Gifting, stationery, office essentials, and customisable products —
            organised for retail desks and business orders.
          </p>
        </header>

        <ul className={styles.mosaic}>
          {tiles.map((tile) => (
            <li key={tile.title} className={`${styles.tile} ${styles[tile.tone]}`}>
              <Link href={tile.href} className={styles.link}>
                <span className={styles.badge}>{tile.eyebrow}</span>
                <span className={styles.name}>{tile.title}</span>
                <span className={styles.body}>{tile.body}</span>
                <span className={styles.cta}>{tile.cta} →</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
