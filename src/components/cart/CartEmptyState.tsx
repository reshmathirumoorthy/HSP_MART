import Link from "next/link";
import { products } from "@/data/products";
import { categories as categoryData } from "@/data/categories";
import styles from "./CartEmptyState.module.css";

type Props = {
  onShop?: () => void;
};

const EMPTY_CATEGORY_LABELS = [
  "Stationery",
  "Office Essentials",
  "Desk & Accessories",
  "Writing Instruments",
  "Presentation",
  "Gifting",
] as const;

const CARD_COPY: Record<(typeof EMPTY_CATEGORY_LABELS)[number], string> = {
  Stationery: "Notebooks, pads & paper",
  "Office Essentials": "Everyday desk supplies",
  "Desk & Accessories": "Organizers & clear workspaces",
  "Writing Instruments": "Pens & writing sets",
  Presentation: "Folders & meeting materials",
  Gifting: "Thoughtful gifts & hampers",
};

export function CartEmptyState({ onShop }: Props) {
  const slugByLabel = new Map(
    categoryData.map((category) => [category.name, category.slug]),
  );

  const categories = EMPTY_CATEGORY_LABELS.map((label) => {
    const slug = slugByLabel.get(label);
    const heroProduct = products.find((product) => product.category === label);
    return {
      label,
      slug,
      blurb: CARD_COPY[label],
      image: heroProduct?.images[0] ?? null,
    };
  }).filter((category) => category.slug);

  return (
    <div className={styles.wrap}>
      <div className={styles.hero}>
        <span className={styles.iconRing} aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            width="34"
            height="34"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 7h12l1.5 12.2a1.6 1.6 0 0 1-1.6 1.8H6.1a1.6 1.6 0 0 1-1.6-1.8L6 7Z" />
            <path d="M9 10.5V6.5a3 3 0 0 1 6 0v4" />
          </svg>
        </span>
        <p className={styles.eyebrow}>Your cart</p>
        <h2 className={styles.title}>Your cart is waiting.</h2>
        <p className={styles.copy}>
          Discover everyday essentials, stationery and thoughtful gifts.
        </p>
        <Link href="/products" className={`btn btn--dark ${styles.cta}`} onClick={onShop}>
          Explore Products
        </Link>
      </div>

      <div className={styles.browse}>
        <p className={styles.browseLabel}>Explore our collections</p>
        <ul className={styles.categories}>
          {categories.map((category) => (
            <li key={category.slug}>
              <Link
                href={`/products?category=${category.slug}`}
                className={styles.category}
                onClick={onShop}
              >
                <span className={styles.categoryVisual} aria-hidden="true">
                  {category.image ? (
                    // eslint-disable-next-line @next/next/no-img-element -- local catalogue asset
                    <img src={category.image} alt="" loading="lazy" />
                  ) : (
                    <span className={styles.categoryVisualFallback} />
                  )}
                </span>
                <span className={styles.categoryBody}>
                  <span className={styles.categoryName}>{category.label}</span>
                  <span className={styles.categoryBlurb}>{category.blurb}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
