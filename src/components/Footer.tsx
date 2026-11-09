import Image from "next/image";
import Link from "next/link";
import { company } from "@/data/company";
import styles from "./Footer.module.css";


export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={`shell ${styles.grid}`}>
        <div className={styles.brand}>
          <Link href="/" className={styles.brandLink}>
            <Image
              src="/images/hsp-mart-logo.png"
              alt=""
              width={40}
              height={34}
              className={styles.logo}
            />
            <span className={styles.name}>HSP Mart</span>
          </Link>
          <p className={styles.blurb}>{company.tagline}</p>
        </div>

        <div>
          <h3 className={styles.colTitle}>Shop</h3>
          <ul className={styles.list}>
            <li>
              <Link href="/products">All products</Link>
            </li>
            <li>
              <Link href={`/products?category=gifts&subcategory=${encodeURIComponent("Corporate Gifting")}`}>Corporate gifting</Link>
            </li>
            <li>
              <Link href={`/products?category=gifts&subcategory=${encodeURIComponent("Festive Gifting")}`}>Festive gifting</Link>
            </li>
            <li>
              <Link href={`/products?category=gifts&subcategory=${encodeURIComponent("Wedding Gifting")}`}>Wedding gifting</Link>
            </li>
            <li>
              <Link href="/products?category=presentation">Boards &amp; presentation</Link>
            </li>
            <li>
              <Link href="/products?category=stationery">Stationery &amp; office</Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className={styles.colTitle}>Help</h3>
          <ul className={styles.list}>
            <li>
              <Link href="/bulk-quote">Bulk orders</Link>
            </li>
            <li>
              <Link href="/products?customizable=true">Customization</Link>
            </li>
            <li>
              <Link href="/faq">FAQ</Link>
            </li>
            <li>
              <Link href="/contact">Contact</Link>
            </li>
            <li>
              <Link href="/about">About</Link>
            </li>
            <li>
              <Link href="/account">Account</Link>
            </li>
            <li>
              <Link href="/wishlist">Wishlist</Link>
            </li>
            <li>
              <Link href="/cart">Cart</Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className={styles.colTitle}>Contact</h3>
          <p className={styles.address}>{company.contact.registeredOffice}</p>
          <p className={styles.store}>
            Retail: {company.contact.retailStore}
          </p>
          <p className={styles.email}>
            <a href={`mailto:${company.contact.email}`}>
              {company.contact.email}
            </a>
          </p>
          {company.contact.phone ? (
            <p className={styles.phone}>
              <a href={`tel:${company.contact.phone.replace(/\s/g, "")}`}>
                {company.contact.phone}
              </a>
            </p>
          ) : null}
        </div>
      </div>

      <div className={`shell ${styles.bottom}`}>
        <p>© {new Date().getFullYear()} {company.legalName}</p>
        <div className={styles.legal}>
          <Link href="/faq">FAQ</Link>
          <Link href="/contact">Contact</Link>
        </div>
      </div>
    </footer>
  );
}