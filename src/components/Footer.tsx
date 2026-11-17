import Image from "next/image";
import Link from "next/link";
import { company } from "@/data/company";
import { navigation } from "@/lib/siteData";
import type { NavLink } from "@/types/site";

const links = (list: NavLink[] | undefined) =>
  (list ?? []).map((l) => (
    <li key={`${l.href}-${l.label}`}>
      <Link href={l.href}>{l.label}</Link>
    </li>
  ));
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
            <span className={styles.name}>{company.companyName}</span>
          </Link>
          <p className={styles.blurb}>{company.tagline}</p>
        </div>

        <div>
          <h3 className={styles.colTitle}>Shop</h3>
          <ul className={styles.list}>
            {links(navigation.footer?.shop)}
          </ul>
        </div>

        <div>
          <h3 className={styles.colTitle}>Help</h3>
          <ul className={styles.list}>
            {links(navigation.footer?.help)}
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
          {(navigation.footer?.legal ?? []).map((l) => (
            <Link key={`${l.href}-${l.label}`} href={l.href}>{l.label}</Link>
          ))}
        </div>
      </div>
    </footer>
  );
}