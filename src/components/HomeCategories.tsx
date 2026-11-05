import Link from "next/link";
import Image from "next/image";
import { categories } from "@/data/categories";
import { products } from "@/data/products";
import styles from "./HomeCategories.module.css";

type FeaturedCategorySlug = "stationery" | "office" | "desk" | "writing";

const CATEGORY_IMAGE: Record<FeaturedCategorySlug, string> = {
  stationery: "/images/categories/category-stationery-supplies.jpg",
  office: "/images/categories/category-office.jpg",
  desk: "/images/categories/category-desk.jpg",
  writing: "/images/categories/category-writing.jpg",
};

function countForCategory(slug: FeaturedCategorySlug) {
  return products.filter((product) => product.categorySlug === slug).length;
}

export function HomeCategories() {
  const list = categories.filter((c) =>
    ["stationery", "office", "desk", "writing"].includes(c.slug as FeaturedCategorySlug),
  );

  return (
    <section
      id="categories"
      className={styles.section}
      aria-labelledby="shop-categories-heading"
    >
      <div className={`shell ${styles.inner}`}>
        <header className={styles.header}>
          <div className={styles.headingBlock}>
            <p className={styles.eyebrow}>Shop by category</p>
            <h2 id="shop-categories-heading" className={styles.title}>
              Explore our collections
            </h2>
            <p className={styles.lead}>
              Office essentials, corporate gifting, stationery, desk accessories,
              and customised products.
            </p>
          </div>
          <Link href="/products" className={styles.viewAll}>
            View all categories
            <span aria-hidden="true">→</span>
          </Link>
        </header>

        <ul className={styles.grid}>
          {list.map((category) => {
            const slug = category.slug as FeaturedCategorySlug;
            const count = countForCategory(slug);
            const imageSrc = CATEGORY_IMAGE[slug];

            return (
              <li key={category.id}>
                <Link
                  href={`/products?category=${category.slug}`}
                  className={styles.card}
                  aria-label={`Explore ${category.name}, ${count} products`}
                >
                  <div className={styles.imageWrap}>
                    <Image
                      src={imageSrc}
                      alt={category.name}
                      fill
                      sizes="(max-width: 1440px) 25vw, 300px"
                      className={styles.image}
                      objectFit="cover"
                      objectPosition="center center"
                      priority={slug === "stationery"}
                    />
                    <span className={styles.arrow}>→</span>
                  </div>
                  <div className={styles.body}>
                    <span className={styles.name}>{category.name}</span>
                    <span className={styles.count}>
                      {count} {count === 1 ? "product" : "products"}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
