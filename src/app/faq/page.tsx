import type { Metadata } from "next";
import Link from "next/link";
import { companyFaqs } from "@/data/company";
import { FaqAccordion } from "@/components/content/FaqAccordion";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbJsonLd } from "@/lib/seo";
import styles from "@/components/content/ContentPage.module.css";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Answers about bulk orders, customization, individual shopping and contacting HSP Mart.",
  openGraph: {
    title: "FAQ | HSP Mart",
    description:
      "Bulk orders, product customization, individual shopping and more.",
    url: "/faq",
    siteName: "HSP Mart",
    type: "website",
  },
};

export default function FaqPage() {
  return (
    <div className={styles.page} data-nav-surface="light">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: "https://hspmart.com/" },
          { name: "FAQ", url: "https://hspmart.com/faq" },
        ])}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: companyFaqs.map((faq) => ({
            "@type": "Question",
            name: faq.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: faq.answer,
            },
          })),
        }}
      />

      <div className={`shell ${styles.inner}`}>
        <header className={styles.header}>
          <p className="label">Help</p>
          <h1 className="h1">Frequently asked questions</h1>
          <p className={`body ${styles.lead}`}>
            Straightforward answers based on how this storefront works today.
          </p>
        </header>

        <FaqAccordion faqs={companyFaqs} />

        <div className={styles.actions}>
          <Link href="/products?customizable=1" className="btn btn--dark">
            Shop customizable products
          </Link>
          <Link href="/bulk-quote" className="btn btn--ghost-dark">
            Start a bulk quote
          </Link>
        </div>
      </div>
    </div>
  );
}
