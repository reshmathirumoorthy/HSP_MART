import type { Metadata } from "next";
import Link from "next/link";
import { company } from "@/data/company";
import { about } from "@/lib/siteData";
import { loadSiteData } from "@/lib/siteData.server";
import { siteUrl } from "@/lib/siteData";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbJsonLd, organizationJsonLd } from "@/lib/seo";
import styles from "@/components/content/ContentPage.module.css";

export async function generateMetadata(): Promise<Metadata> {
  await loadSiteData();
  return {
    title: "About",
    description: company.tagline,
    openGraph: { title: `About | ${company.companyName}`, description: company.description, url: "/about", siteName: company.companyName, type: "website" },
  };
}

export default async function AboutPage() {
  await loadSiteData();
  return (
    <div className={styles.page} data-nav-surface="light">
      <JsonLd data={organizationJsonLd()} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: `${siteUrl()}/` },
          { name: "About", url: `${siteUrl()}/about` },
        ])}
      />

      <div className={`shell ${styles.inner}`}>
        <header className={styles.header}>
          <h1 className="h1">{about.title}</h1>
          <p className={`body ${styles.lead}`}>{company.description}</p>
        </header>

        <section className={styles.section} aria-labelledby="about-focus">
          <h2 id="about-focus">{about.focusTitle}</h2>
          <p>
            {company.businessType}. Categories in the catalogue include{" "}
            {company.categories.join(", ")}.
          </p>
        </section>

        <section className={styles.section} aria-labelledby="about-services">
          <h2 id="about-services">{about.servicesTitle}</h2>
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
          <h2 id="about-legal">{about.legalTitle}</h2>
          <p>
            {company.legalName
              ? `${company.companyName} is the online storefront of ${company.legalName}.`
              : company.companyName}
          </p>
        </section>

        <div className={styles.actions}>
          {about.actions.map((a, i) => (
            <Link key={a.href} href={a.href} className={i === 0 ? "btn btn--dark" : "btn btn--ghost-dark"}>
              {a.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
