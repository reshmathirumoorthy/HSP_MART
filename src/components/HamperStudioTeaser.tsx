import { CatalogImage } from "@/components/CatalogImage";
import Link from "next/link";
import styles from "./HamperStudioTeaser.module.css";

const boxes = [
  {
    name: "Corporate Gift Hamper",
    href: "/products/executive-gift-set#customize",
    image: "/images/categories/category-gifts.jpg",
    note: "Build-to-order slots · branding available",
  },
  {
    name: "Employee Welcome Kit",
    href: "/products/employee-welcome-kit#customize",
    image: "/images/categories/category-gifts.jpg",
    note: "Onboarding sets for teams",
  },
  {
    name: "Desk Gift Set",
    href: "/products/desk-gift-set",
    image: "/images/products/wooden-organiser.png",
    note: "Ready desk essentials",
  },
];

export function HamperStudioTeaser() {
  return (
    <section
      id="custom"
      className={styles.section}
      data-nav-surface="light"
      aria-labelledby="hamper-heading"
    >
      <div className={`shell ${styles.inner}`}>
        <header className={styles.header}>
          <p className={styles.badge}>Interactive product builders</p>
          <h2 id="hamper-heading" className={styles.title}>
            Build your custom gift hamper box
          </h2>
          <p className={styles.lead}>
            Choose a configurable gift set, personalise branding on supported
            products, and review the on-page preview before you add to cart or
            request a bulk quote.
          </p>
        </header>

        <div className={styles.layout}>
          <div>
            <p className={styles.step}>
              <span className={styles.stepNum}>1</span>
              Choose gift packaging
            </p>
            <ul className={styles.boxes}>
              {boxes.map((box) => (
                <li key={box.name}>
                  <Link href={box.href} className={styles.boxCard}>
                    <span className={styles.thumb}>
                      <CatalogImage
                        src={box.image}
                        alt=""
                        fill
                        sizes="120px"
                        className={styles.thumbImage}
                      />
                    </span>
                    <span className={styles.boxCopy}>
                      <span className={styles.boxName}>{box.name}</span>
                      <span className={styles.boxNote}>{box.note}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              href="/products/executive-gift-set#customize"
              className={styles.primary}
            >
              Open hamper studio →
            </Link>
          </div>

          <aside className={styles.studio} aria-hidden>
            <p className={styles.studioLabel}>Live hamper studio</p>
            <div className={styles.preview}>
              <CatalogImage
                src="/images/products/harry-potter-quill-main.jpg"
                alt=""
                fill
                sizes="(max-width: 900px) 88vw, 360px"
                className={styles.previewImage}
              />
            </div>
            <p className={styles.studioHint}>
              Interactive preview on the product page — configure slots, then
              add to cart or enquire for volume.
            </p>
          </aside>
        </div>
      </div>
    </section>
  );
}
