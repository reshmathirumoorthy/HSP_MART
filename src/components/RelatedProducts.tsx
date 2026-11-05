import type { Product } from "@/data/products";
import { ProductCard } from "@/components/ProductCard";
import styles from "./RelatedProducts.module.css";

type Props = {
  products: Product[];
  label?: string;
  title?: string;
  headingId?: string;
};

export function RelatedProducts({
  products,
  label = "Continue browsing",
  title = "Related products",
  headingId = "related-heading",
}: Props) {
  if (products.length === 0) return null;

  return (
    <section className={styles.section} aria-labelledby={headingId}>
      <div className={`shell ${styles.inner}`}>
        <header className={styles.header}>
          <p className={styles.label}>{label}</p>
          <h2 id={headingId} className={styles.title}>
            {title}
          </h2>
        </header>
        <ul className={styles.grid}>
          {products.map((product) => (
            <li key={product.id}>
              <ProductCard product={product} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
