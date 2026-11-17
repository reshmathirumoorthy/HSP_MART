import Link from "next/link";
import { ArrowRight, Mail, MapPin, Phone } from "lucide-react";
import { company } from "@/data/company";
import { products, type Product } from "@/data/products";
import { ProductCard } from "@/components/ProductCard";
import { home } from "@/lib/siteData";
import styles from "./HomeSections.module.css";

/** Products picked in the admin app win; otherwise the section's automatic rule applies. */
function pick(ids: string[] | undefined, auto: () => Product[], limit: number): Product[] {
  if (ids?.length) {
    const byId = new Map(products.map((p) => [p.id, p]));
    return ids.map((id) => byId.get(id)).filter((p): p is Product => !!p && p.active).slice(0, limit);
  }
  return auto().slice(0, limit);
}

const withPhoto = (p: Product) => p.active && p.images[0]?.startsWith("https://");

/** Hampers first: the house's signature, curated and packed in-house. */
export function SignatureHampers() {
  const c = home.hampers;
  const list = pick(c.productIds, () =>
    products.filter(
      (p) =>
        withPhoto(p) &&
        p.categorySlug === "gifts" &&
        /hamper|basket|platter/i.test(p.name) &&
        p.stockStatus !== "out_of_stock",
    ), 8);
  if (!list.length) return null;

  return (
    <section className={styles.section} aria-labelledby="hampers-heading">
      <div className="shell">
        <header className={styles.head}>
          <h2 id="hampers-heading" className={styles.h2}>
            {c.title}
          </h2>
          <p className={styles.headCopy}>{c.copy}</p>
          <Link href={c.link.href} className={styles.headLink}>
            {c.link.label} <ArrowRight aria-hidden />
          </Link>
        </header>
        <ul className={styles.plates}>
          {list.map((p) => (
            <li key={p.id}>
              <ProductCard product={p} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** In-stock, fixed-price corporate sets: buyable today, or quotable in bulk. */
export function ReadyToDispatch() {
  const c = home.dispatch;
  const list = pick(c.productIds, () =>
    products.filter(
      (p) =>
        withPhoto(p) &&
        p.subcategory === "Corporate Gifting" &&
        p.stockStatus === "in_stock" &&
        !p.priceOnRequest &&
        p.price > 0,
    ), 8);
  if (!list.length) return null;

  return (
    <section className={styles.section} aria-labelledby="dispatch-heading">
      <div className="shell">
        <header className={styles.head}>
          <h2 id="dispatch-heading" className={styles.h2}>
            {c.title}
          </h2>
          <p className={styles.headCopy}>{c.copy}</p>
          <Link href={c.link.href} className={styles.headLink}>
            {c.link.label} <ArrowRight aria-hidden />
          </Link>
        </header>
        <ul className={styles.plates}>
          {list.map((p) => (
            <li key={p.id}>
              <ProductCard product={p} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function OrderTrail() {
  const c = home.trail;
  return (
    <section className={`${styles.section} ${styles.trailSection}`} aria-labelledby="trail-heading">
      <div className="shell">
        <header className={styles.head}>
          <h2 id="trail-heading" className={styles.h2}>
            {c.title}
          </h2>
          <p className={styles.headCopy}>{c.copy}</p>
        </header>
        <ol className={styles.trail}>
          {c.steps.map((step, i) => (
            <li key={step.title} className={styles.step}>
              <span className={styles.stepNo} data-num>
                {i + 1}
              </span>
              <h3 className={styles.stepTitle}>{step.title}</h3>
              <p className={styles.stepCopy}>{step.copy}</p>
            </li>
          ))}
        </ol>
        <div className={styles.trailEnd}>
          <Link href={c.cta.href} className={styles.trailCta}>
            {c.cta.label} <ArrowRight aria-hidden />
          </Link>
          <span className={styles.trailNote}>{c.note}</span>
        </div>
      </div>
    </section>
  );
}

/** Gifting and office supplies from the same house. */
export function OneHouse() {
  const c = home.house;
  const boards = pick(c.productIds, () =>
    products.filter((p) => withPhoto(p) && p.categorySlug === "presentation" && !p.priceOnRequest), 3);

  return (
    <section className={`${styles.section} ${styles.house}`} aria-labelledby="house-heading">
      <div className={`shell ${styles.houseGrid}`}>
        <div className={styles.houseCopy}>
          <h2 id="house-heading" className={styles.h2}>
            {c.title}
          </h2>
          <p>{c.copy}</p>
          <div className={styles.houseLinks}>
            {c.links.map((l) => (
              <Link key={l.href} href={l.href}>
                {l.label} <ArrowRight aria-hidden />
              </Link>
            ))}
          </div>
        </div>
        {boards.length ? (
          <ul className={styles.housePlates}>
            {boards.map((p) => (
              <li key={p.id}>
                <ProductCard product={p} />
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}

export function CloseContact() {
  const { phone, email } = company.contact;
  const c = home.close;
  return (
    <section className={styles.close} aria-labelledby="close-heading">
      <div className={`shell ${styles.closeGrid}`}>
        <h2 id="close-heading" className={styles.closeTitle}>
          {c.title}
        </h2>
        <div className={styles.closeActions}>
          <Link href={c.cta.href} className={styles.closePrimary}>
            {c.cta.label}
          </Link>
          {phone ? (
            <a href={`tel:${phone.replace(/\s+/g, "")}`} className={styles.closeLine}>
              <Phone aria-hidden /> {phone}
            </a>
          ) : null}
          {email ? (
            <a href={`mailto:${email}`} className={styles.closeLine}>
              <Mail aria-hidden /> {email}
            </a>
          ) : null}
          <p className={styles.closeLine}>
            <MapPin aria-hidden /> {c.address}
          </p>
        </div>
      </div>
    </section>
  );
}
