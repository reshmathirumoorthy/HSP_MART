import type { Metadata } from "next";
import Link from "next/link";
import { company } from "@/data/company";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbJsonLd, organizationJsonLd } from "@/lib/seo";
import styles from "@/components/content/ContentPage.module.css";

export const metadata: Metadata = {
  title: "About",
  description:
    "Learn about HSP Mart — stationery, gifting, office essentials, bulk orders and product customization.",
  openGraph: {
    title: "About | HSP Mart",
    description: company.description,
    url: "/about",
    siteName: "HSP Mart",
    type: "website",
  },
};

export default function AboutPage() {
  return (
    <div className={styles.page} data-nav-surface="light">
      <JsonLd data={organizationJsonLd()} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: "https://hspmart.com/" },
          { name: "About", url: "https://hspmart.com/about" },
        ])}
      />

      <div className={`shell ${styles.inner}`}>
        <header className={styles.header}>
          <p className="label">Company</p>
          <h1 className="h1">About HSP Mart</h1>
          <p className={`body ${styles.lead}`}>{company.description}</p>
        </header>

        <section className={styles.section} aria-labelledby="about-focus">
          <h2 id="about-focus">What we focus on</h2>
          <p>
            {company.businessType}. Categories in the catalogue include{" "}
            {company.categories.join(", ")}.
          </p>
        </section>

        <section className={styles.section} aria-labelledby="about-services">
          <h2 id="about-services">How you can shop</h2>
          <div className={styles.services}>
            {company.services.map((service) => (
              <article key={service.id} className={styles.service}>
                <h3>{service.name}</h3>
                <p>{service.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section} aria-labelledby="about-legal">
          <h2 id="about-legal">Legal name</h2>
          <p>
            {company.legalName
              ? `${company.companyName} is the online storefront of ${company.legalName}.`
              : company.companyName}
          </p>
        </section>

        <div className={styles.actions}>
          <Link href="/products" className="btn btn--dark">
            Browse products
          </Link>
          <Link href="/bulk-quote" className="btn btn--ghost-dark">
            Request a bulk quote
          </Link>
          <Link href="/contact" className="btn btn--ghost-dark">
            Contact
          </Link>
        </div>
      </div>
    </div>
  );
}
