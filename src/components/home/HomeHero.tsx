import { CatalogImage } from "@/components/CatalogImage";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { products, productPriceLabel, type Product } from "@/data/products";
import { PlateQuoteButton } from "@/components/quote-sheet/PlateQuoteButton";
import styles from "./HomeHero.module.css";

const gifting = (sub: string) =>
  `/products?category=gifts&subcategory=${encodeURIComponent(sub)}`;

/** Four gifting occasions, mirroring the production storefront's menu. */
const OCCASIONS: { label: string; note: string; href: string; sub: string }[] = [
  { label: "Corporate", note: "Clients, teams & rewards", href: gifting("Corporate Gifting"), sub: "Corporate Gifting" },
  { label: "Festive", note: "Diwali, Rakhi & seasonal", href: gifting("Festive Gifting"), sub: "Festive Gifting" },
  { label: "Wedding", note: "Shagun, platters & trousseau", href: gifting("Wedding Gifting"), sub: "Wedding Gifting" },
  { label: "Occasions", note: "Birthdays & celebrations", href: gifting("Occasional Gifting"), sub: "Occasional Gifting" },
];

const FEATURE_SLUG =
  "luxury-decorative-gift-hamper-with-floral-birdcage-premium-festive-corporate-gift-basket";

function featured(): Product | undefined {
  return (
    products.find((p) => p.slug === FEATURE_SLUG && p.images.length) ??
    products.find((p) => p.categorySlug === "gifts" && p.images[0]?.startsWith("https://"))
  );
}

export function HomeHero() {
  const gift = featured();
  const active = products.filter((p) => p.active);

  return (
    <section className={styles.hero} aria-labelledby="home-hero-heading">
      <div className={`shell ${styles.frame}`}>
        <div className={styles.copy}>
          <h1 id="home-hero-heading" className={styles.title}>
            The art of <em>corporate</em> gifting.
          </h1>
          <span className={styles.rule} aria-hidden />
          <p className={styles.lead}>
            Hampers and branded gifts, curated and hand-packed by our own team
            in Delhi, for the clients, colleagues and celebrations that matter.
          </p>
          <div className={styles.actions}>
            <Link href={gifting("Corporate Gifting")} className={styles.primary}>
              Explore corporate gifts
            </Link>
            <Link href="/bulk-quote" className={styles.secondary}>
              Request a quote
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
          {OCCASIONS.map((o) => {
            const count = active.filter((p) => p.subcategory === o.sub).length;
            return (
              <li key={o.label}>
                <Link href={o.href}>
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
