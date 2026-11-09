import Link from "next/link";
import { ArrowRight, Mail, MapPin, Phone } from "lucide-react";
import { company } from "@/data/company";
import { products, type Product } from "@/data/products";
import { ProductCard } from "@/components/ProductCard";
import styles from "./HomeSections.module.css";

const corporateHref = `/products?category=gifts&subcategory=${encodeURIComponent("Corporate Gifting")}`;

const withPhoto = (p: Product) => p.active && p.images[0]?.startsWith("https://");

/** Hampers first: the house's signature, curated and packed in-house. */
export function SignatureHampers() {
  const list = products
    .filter(
      (p) =>
        withPhoto(p) &&
        p.categorySlug === "gifts" &&
        /hamper|basket|platter/i.test(p.name) &&
        p.stockStatus !== "out_of_stock",
    )
    .slice(0, 8);
  if (!list.length) return null;

  return (
    <section className={styles.section} aria-labelledby="hampers-heading">
      <div className="shell">
        <header className={styles.head}>
          <h2 id="hampers-heading" className={styles.h2}>
            Signature hampers
          </h2>
          <p className={styles.headCopy}>
            Composed, wrapped and packed by our own team. Order one, or add them
            to your quote and we&apos;ll tailor contents and branding for your
            occasion.
          </p>
          <Link href="/products?category=gifts" className={styles.headLink}>
            All gifts <ArrowRight aria-hidden />
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
  const list = products
    .filter(
      (p) =>
        withPhoto(p) &&
        p.subcategory === "Corporate Gifting" &&
        p.stockStatus === "in_stock" &&
        !p.priceOnRequest &&
        p.price > 0,
    )
    .slice(0, 8);
  if (!list.length) return null;

  return (
    <section className={styles.section} aria-labelledby="dispatch-heading">
      <div className="shell">
        <header className={styles.head}>
          <h2 id="dispatch-heading" className={styles.h2}>
            Signature corporate gifts
          </h2>
          <p className={styles.headCopy}>
            Refined writing sets and desk gifts, in stock and ready to dispatch.
            Order one to sample, or add them to your quote for your whole team.
          </p>
          <Link href={`${corporateHref}&stock=in-stock`} className={styles.headLink}>
            All corporate gifts <ArrowRight aria-hidden />
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

/** Production's own four-step promise, set as a continuous order trail. */
const TRAIL = [
  {
    title: "Understand the occasion",
    copy: "Tell us who the gifts are for, how many, the budget per unit and the date they must land.",
  },
  {
    title: "Curate the gifts",
    copy: "We shortlist hampers and kits from the catalogue, or build a custom set around your brief.",
  },
  {
    title: "Pack with a personal touch",
    copy: "Assembled and packed by our own team, with your logo, names or custom packaging where you need it.",
  },
  {
    title: "Delivered on time",
    copy: "Dispatched against the date you need them by.",
  },
];

export function OrderTrail() {
  return (
    <section className={`${styles.section} ${styles.trailSection}`} aria-labelledby="trail-heading">
      <div className="shell">
        <header className={styles.head}>
          <h2 id="trail-heading" className={styles.h2}>
            Every gift, considered
          </h2>
          <p className={styles.headCopy}>
            Every hamper is put together with care, in-house, from the first
            call to the delivery date.
          </p>
        </header>
        <ol className={styles.trail}>
          {TRAIL.map((step, i) => (
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
          <Link href="/bulk-quote" className={styles.trailCta}>
            Start with a quote request <ArrowRight aria-hidden />
          </Link>
          <span className={styles.trailNote}>
            Pricing, branding and delivery are confirmed after we review your
            request.
          </span>
        </div>
      </div>
    </section>
  );
}

/** Gifting and office supplies from the same house. */
export function OneHouse() {
  const boards = products
    .filter((p) => withPhoto(p) && p.categorySlug === "presentation" && !p.priceOnRequest)
    .slice(0, 3);

  return (
    <section className={`${styles.section} ${styles.house}`} aria-labelledby="house-heading">
      <div className={`shell ${styles.houseGrid}`}>
        <div className={styles.houseCopy}>
          <h2 id="house-heading" className={styles.h2}>
            Gifting and the office,
            from one trusted house.
          </h2>
          <p>
            HSP Office Basics supplies magnetic whiteboards, notice and chalk
            boards, easel stands and desk essentials alongside its gifting
            range, so one vendor can cover both.
          </p>
          <div className={styles.houseLinks}>
            <Link href="/products?category=presentation">
              Boards &amp; presentation <ArrowRight aria-hidden />
            </Link>
            <Link href="/products?category=desk">
              Desk accessories <ArrowRight aria-hidden />
            </Link>
            <Link href="/products?category=stationery">
              Stationery <ArrowRight aria-hidden />
            </Link>
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
  return (
    <section className={styles.close} aria-labelledby="close-heading">
      <div className={`shell ${styles.closeGrid}`}>
        <h2 id="close-heading" className={styles.closeTitle}>
          Planning gifts for fifty people, or five thousand?
        </h2>
        <div className={styles.closeActions}>
          <Link href="/bulk-quote" className={styles.closePrimary}>
            Request a quote
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
            <MapPin aria-hidden /> Retail store, Paschim Vihar · Office,
            Connaught Place, New Delhi
          </p>
        </div>
      </div>
    </section>
  );
}
