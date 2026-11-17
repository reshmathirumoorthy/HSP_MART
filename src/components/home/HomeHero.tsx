import { CatalogImage } from "@/components/CatalogImage";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { products, productPriceLabel, type Product } from "@/data/products";
import { PlateQuoteButton } from "@/components/quote-sheet/PlateQuoteButton";
import { home } from "@/lib/siteData";
import styles from "./HomeHero.module.css";

const gifting = (sub: string) =>
  `/products?category=gifts&subcategory=${encodeURIComponent(sub)}`;

/** Hero copy, featured product and occasions come from Site content → home (admin app). */
function featured(slug: string): Product | undefined {
  return (
    (slug ? products.find((p) => p.slug === slug && p.images.length) : undefined) ??
    products.find((p) => p.categorySlug === "gifts" && p.images[0]?.startsWith("https://"))
  );
}

export function HomeHero() {
  const { hero, occasions } = home;
  const gift = featured(hero.featuredSlug);
  const active = products.filter((p) => p.active);

  return (
    <section className={styles.hero} aria-labelledby="home-hero-heading">
      <div className={`shell ${styles.frame}`}>
        <div className={styles.copy}>
          <h1 id="home-hero-heading" className={styles.title}>
            {hero.titleBefore} <em>{hero.titleEmphasis}</em> {hero.titleAfter}
          </h1>
          <span className={styles.rule} aria-hidden />
          <p className={styles.lead}>
            {hero.lead}
          </p>
          <div className={styles.actions}>
            <Link href={hero.primaryCta.href} className={styles.primary}>
              {hero.primaryCta.label}
            </Link>
            <Link href={hero.secondaryCta.href} className={styles.secondary}>
              {hero.secondaryCta.label}
            </Link>
          </div>
        </div>

        {gift ? (
          <figure className={styles.window}>
            <Link href={`/products/${gift.slug}`} className={styles.arch} aria-label={gift.name}>
              <CatalogImage
                src={gift.images[0]}
                alt={gift.name}
                fill
                priority
                sizes="(max-width: 900px) 90vw, 40vw"
              />
            </Link>
            <figcaption className={styles.caption}>
              <span className={styles.captionName}>{gift.name.split("|")[0].trim()}</span>
              <span className={styles.captionMeta}>
                <span className={styles.captionPrice}>{productPriceLabel(gift)}</span>
                <PlateQuoteButton slug={gift.slug} className={styles.captionAction} />
              </span>
            </figcaption>
          </figure>
        ) : null}
      </div>

      <nav className={styles.occasions} aria-label="Shop by occasion">
        <ul className="shell">
          {occasions.map((o) => {
            const count = active.filter((p) => p.subcategory === o.subcategory).length;
            return (
              <li key={o.label}>
                <Link href={gifting(o.subcategory)}>
                  <span className={styles.occName}>{o.label}</span>
                  <span className={styles.occNote}>
                    {o.note} · {count}
                  </span>
                  <ArrowRight className={styles.occArrow} aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </section>
  );
}
