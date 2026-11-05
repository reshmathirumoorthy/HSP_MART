import Link from "next/link";
import type { Product } from "@/data/products";
import { isProductCustomizable } from "@/lib/productModel";
import styles from "./ProductCustomizationPanel.module.css";

type Props = {
  product: Product;
};

export function ProductCustomizationPanel({ product }: Props) {
  if (!isProductCustomizable(product)) return null;

  const labels =
    product.customizationTypes?.map(
      (type) => type.charAt(0).toUpperCase() + type.slice(1),
    ) ?? ["Text", "Logo", "Image"];

  return (
    <section className={styles.section} aria-labelledby="custom-pdp-heading">
      <div className={`shell ${styles.inner}`}>
        <header className={styles.header}>
          <p className={styles.label}>Customization</p>
          <h2 id="custom-pdp-heading" className={styles.title}>
            Make it yours
          </h2>
          <p className={styles.copy}>
            This product supports customization. Tell us what you need through a
            bulk quote request — pricing is confirmed after review.
          </p>
        </header>

        <ul className={styles.labels}>
          {labels.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>

        <Link
          href={`/bulk-quote?product=${product.slug}`}
          className="btn btn--ghost-dark"
        >
          Request customization
        </Link>
      </div>
    </section>
  );
}
