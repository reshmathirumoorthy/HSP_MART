import { CatalogImage } from "@/components/CatalogImage";
import Link from "next/link";
import styles from "./CustomizationSection.module.css";

const showcase = [
  {
    label: "Notebooks",
    href: "/products/custom-branded-notebook#customize",
    image: "/images/products/a5-fancy-magnetic-notebook-main.jpg",
    fit: "cover" as const,
  },
  {
    label: "Bottles",
    href: "/products/insulated-tumbler#customize",
    image: "/images/products/vacuum-bottle-main.jpg",
    fit: "cover" as const,
  },
  {
    label: "Gift Sets",
    href: "/products/executive-gift-set",
    image: "/images/categories/category-gifts.jpg",
    fit: "cover" as const,
  },
];

export function CustomizationSection() {
  return (
    <section
      id="custom"
      className={styles.section}
      data-nav-surface="dark"
      aria-labelledby="custom-heading"
    >
      <div className={styles.band}>
        <div className={`shell ${styles.inner}`}>
          <div className={styles.visualCol}>
            <div className={styles.heroFrame}>
              <CatalogImage
                src="/images/products/trendy-tumbler-main.png"
                alt=""
                fill
                sizes="(max-width: 900px) 88vw, 40vw"
                className={`${styles.heroImage} ${styles.fitContain}`}
              />
            </div>
            <div className={styles.stack}>
              <div className={styles.stackItem}>
                <CatalogImage
                  src="/images/products/a5-fancy-magnetic-notebook-main.jpg"
                  alt=""
                  fill
                  sizes="160px"
                  className={`${styles.stackImage} ${styles.fitCover}`}
                />
              </div>
              <div className={styles.stackItem}>
                <CatalogImage
                  src="/images/products/vacuum-bottle-main.jpg"
                  alt=""
                  fill
                  sizes="160px"
                  className={`${styles.stackImage} ${styles.fitCover}`}
                />
              </div>
            </div>
            <p className={styles.mark}>Your mark · on product</p>
          </div>

          <div className={styles.copy}>
            <p className={styles.eyebrow}>Customization</p>
            <h2 id="custom-heading" className={styles.title}>
              Make it yours
              <br />
              before you order.
            </h2>
            <p className={styles.intro}>
              On selected products, add a logo, name, or message — then review
              the on-page preview before you add to cart or request a quote.
            </p>

            <ul className={styles.showcase} aria-label="Customizable product types">
              {showcase.map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className={styles.showcaseLink}>
                    <span className={styles.thumb}>
                      <CatalogImage
                        src={item.image}
                        alt=""
                        width={64}
                        height={64}
                        className={styles.thumbImage}
                      />
                    </span>
                    <span className={styles.showcaseLabel}>{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>

            <div className={styles.actions}>
              <Link
                href="/products/insulated-tumbler#customize"
                className="btn btn--light"
              >
                Start customizing
                <span aria-hidden> →</span>
              </Link>
              <Link href="/products?customizable=true" className={styles.ghost}>
                Browse customizable products
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
