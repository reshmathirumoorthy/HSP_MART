import type { Metadata } from "next";
import Link from "next/link";
import { company } from "@/data/company";
import { ContactEnquiryForm } from "@/components/content/ContactEnquiryForm";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbJsonLd, organizationJsonLd } from "@/lib/seo";
import styles from "@/components/content/contact.module.css";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Contact HSP Mart by phone, email or visit the Paschim Vihar retail store.",
  openGraph: {
    title: "Contact | HSP Mart",
    description: "Reach HSP Mart through verified public channels.",
    url: "/contact",
    siteName: "HSP Mart",
    type: "website",
  },
};

const retailStoreQuery = encodeURIComponent(
  company.contact.retailStore ?? "Paschim Vihar, New Delhi",
);
const registeredOfficeQuery = encodeURIComponent(
  company.contact.registeredOffice ?? "New Delhi",
);

const directionsUrl = (query: string) =>
  `https://www.google.com/maps/search/?api=1&query=${query}`;

export default function ContactPage() {
  const {
    website,
    email,
    phone,
    retailStore,
    registeredOffice,
  } = company.contact;
  const telHref = phone ? `tel:${phone.replace(/\s/g, "")}` : undefined;
  const websiteLabel = (website ?? "https://hspmart.com").replace(
    /^https?:\/\//,
    "",
  );

  return (
    <div className={styles.page} data-nav-surface="light">
      <JsonLd data={organizationJsonLd()} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: "https://hspmart.com/" },
          { name: "Contact", url: "https://hspmart.com/contact" },
        ])}
      />

      <div className={`shell ${styles.container}`}>
        {/* ---------------- Introduction ---------------- */}
        <header className={styles.hero}>
          <p className={styles.eyebrow}>Contact</p>
          <h1 className={styles.title}>Let’s talk about what you need.</h1>
          <p className={styles.lead}>
            Have a question about our products, bulk orders or custom
            requirements? Our team is here to help.
          </p>
        </header>

        {/* ---------------- Two-column main section ---------------- */}
        <div className={styles.mainGrid}>
          {/* Left — contact information */}
          <aside className={styles.infoPanel} aria-labelledby="contact-info-title">
            <h2 id="contact-info-title" className={styles.infoTitle}>
              We’re here to help
            </h2>
            <p className={styles.infoCopy}>
              Choose the channel that suits you best — every detail below is
              verified from the public HSP Mart website.
            </p>

            <ul className={styles.infoList}>
              <li className={styles.infoItem}>
                <span className={styles.infoIcon} aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="8.5" />
                    <path d="M3.5 12h17" />
                    <path d="M12 3.5c2.6 2.3 3.9 5.2 3.9 8.5s-1.3 6.2-3.9 8.5c-2.6-2.3-3.9-5.2-3.9-8.5S9.4 5.8 12 3.5Z" />
                  </svg>
                </span>
                <span>
                  <span className={styles.infoLabel}>Website</span>
                  <p className={styles.infoValue}>
                    {website ? (
                      <a
                        href={website}
                        className={styles.infoLink}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {websiteLabel}
                      </a>
                    ) : (
                      websiteLabel
                    )}
                  </p>
                </span>
              </li>

              {phone ? (
                <li className={styles.infoItem}>
                  <span className={styles.infoIcon} aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 4h4l2 5-2.5 1.5a12 12 0 0 0 5 5L15 13.5 20 15.5v4a2 2 0 0 1-2.2 2A17 17 0 0 1 3 6.2 2 2 0 0 1 5 4Z" />
                    </svg>
                  </span>
                  <span>
                    <span className={styles.infoLabel}>Phone</span>
                    <p className={styles.infoValue}>
                      <a href={telHref} className={styles.infoLink}>
                        {phone}
                      </a>
                    </p>
                  </span>
                </li>
              ) : null}

              {email ? (
                <li className={styles.infoItem}>
                  <span className={styles.infoIcon} aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3.5" y="5.5" width="17" height="13" rx="2.2" />
                      <path d="m4.5 7.5 7.5 6 7.5-6" />
                    </svg>
                  </span>
                  <span>
                    <span className={styles.infoLabel}>Email</span>
                    <p className={styles.infoValue}>
                      <a href={`mailto:${email}`} className={styles.infoLink}>
                        {email}
                      </a>
                    </p>
                  </span>
                </li>
              ) : null}

              {retailStore ? (
                <li className={styles.infoItem}>
                  <span className={styles.infoIcon} aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 9.5 5.6 5h12.8L20 9.5" />
                      <path d="M5 9.5h14" />
                      <path d="M6.5 9.5V19a1.5 1.5 0 0 0 1.5 1.5h8a1.5 1.5 0 0 0 1.5-1.5V9.5" />
                      <path d="M10 20.5v-4.5h4v4.5" />
                    </svg>
                  </span>
                  <span>
                    <span className={styles.infoLabel}>Retail Store</span>
                    <p className={styles.infoValue}>{retailStore}</p>
                    <a
                      href={directionsUrl(retailStoreQuery)}
                      className={styles.directionsLink}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Get directions
                      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M7 17 17 7" />
                        <path d="M9 7h8v8" />
                      </svg>
                    </a>
                  </span>
                </li>
              ) : null}

              {registeredOffice ? (
                <li className={styles.infoItem}>
                  <span className={styles.infoIcon} aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="5" y="3.5" width="14" height="17" rx="1.2" />
                      <path d="M9 7.5h2M13 7.5h2M9 11h2M13 11h2M9 14.5h2M13 14.5h2" />
                      <path d="M10.5 20.5v-2.5h3v2.5" />
                    </svg>
                  </span>
                  <span>
                    <span className={styles.infoLabel}>Registered Office</span>
                    <p className={styles.infoValue}>{registeredOffice}</p>
                    <a
                      href={directionsUrl(registeredOfficeQuery)}
                      className={styles.directionsLink}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Get directions
                      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M7 17 17 7" />
                        <path d="M9 7h8v8" />
                      </svg>
                    </a>
                  </span>
                </li>
              ) : null}
            </ul>
          </aside>

          {/* Right — enquiry form */}
          <section className={styles.formCard} aria-labelledby="enquiry-title">
            <h2 id="enquiry-title" className={styles.formTitle}>
              Send us an enquiry
            </h2>
            <p className={styles.formCopy}>Tell us how we can assist you.</p>
            <ContactEnquiryForm />
          </section>
        </div>

        {/* ---------------- Visit Our Store ---------------- */}
        <section className={styles.locationSection} aria-labelledby="visit-heading">
          <div className={styles.locationHeader}>
            <div>
              <p className={styles.eyebrow}>Visit Us</p>
              <h2 id="visit-heading" className={styles.locationTitle}>
                Visit Our Store
              </h2>
              <p className={styles.locationCopy}>
                Walk in for everyday stationery or collect a bulk order from
                our Paschim Vihar store, or write to us at our registered
                office.
              </p>
            </div>
          </div>

          <div className={styles.locationGrid}>
            <div className={styles.addressStack}>
              {retailStore ? (
                <div className={styles.addressCard}>
                  <span className={styles.addressIcon} aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 21s6.3-5.2 6.3-10.6a6.3 6.3 0 1 0-12.6 0C5.7 15.8 12 21 12 21Z" />
                      <circle cx="12" cy="10.4" r="2.3" />
                    </svg>
                  </span>
                  <span>
                    <span className={styles.addressLabel}>Retail store</span>
                    <p className={styles.addressText}>{retailStore}</p>
                    <span className={styles.addressMeta}>
                      <a
                        href={directionsUrl(retailStoreQuery)}
                        className={styles.directionsLink}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Get directions
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M7 17 17 7" />
                          <path d="M9 7h8v8" />
                        </svg>
                      </a>
                    </span>
                  </span>
                </div>
              ) : null}

              {registeredOffice ? (
                <div className={styles.addressCard}>
                  <span className={styles.addressIcon} aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="5" y="3.5" width="14" height="17" rx="1.2" />
                      <path d="M9 7.5h2M13 7.5h2M9 11h2M13 11h2M9 14.5h2M13 14.5h2" />
                      <path d="M10.5 20.5v-2.5h3v2.5" />
                    </svg>
                  </span>
                  <span>
                    <span className={styles.addressLabel}>Registered office</span>
                    <p className={styles.addressText}>{registeredOffice}</p>
                    <span className={styles.addressMeta}>
                      <a
                        href={directionsUrl(registeredOfficeQuery)}
                        className={styles.directionsLink}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Get directions
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M7 17 17 7" />
                          <path d="M9 7h8v8" />
                        </svg>
                      </a>
                    </span>
                  </span>
                </div>
              ) : null}
            </div>

            <div className={styles.mapWrap}>
              <iframe
                className={styles.mapFrame}
                title="Map showing HSP Mart retail store in Paschim Vihar, New Delhi"
                src={`https://www.google.com/maps?q=${retailStoreQuery}&output=embed`}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
              <a
                className={styles.mapLink}
                href={directionsUrl(retailStoreQuery)}
                target="_blank"
                rel="noreferrer"
              >
                Open in Google Maps
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M7 17 17 7" />
                  <path d="M9 7h8v8" />
                </svg>
              </a>
            </div>
          </div>
        </section>

        {/* ---------------- Business support strip ---------------- */}
        <section className={styles.supportStrip} aria-label="Business support">
          <div className={styles.supportItem}>
            <span className={styles.supportIcon} aria-hidden="true">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 7h12l1.5 12.2a1.6 1.6 0 0 1-1.6 1.8H6.1a1.6 1.6 0 0 1-1.6-1.8L6 7Z" />
                <path d="M9 10.5V6.5a3 3 0 0 1 6 0v4" />
              </svg>
            </span>
            <span>
              <p className={styles.supportTitle}>Product Assistance</p>
              <p className={styles.supportCopy}>
                Help choosing the right products and quantities for your needs.
              </p>
            </span>
          </div>

          <div className={styles.supportItem}>
            <span className={styles.supportIcon} aria-hidden="true">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 20h16" />
                <path d="M6 16V8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8" />
                <path d="M9 12h6M9 15.5h4" />
              </svg>
            </span>
            <span>
              <p className={styles.supportTitle}>Bulk Order Support</p>
              <p className={styles.supportCopy}>
                Quotes for teams, offices, events and corporate gifting.
              </p>
            </span>
          </div>

          <div className={styles.supportItem}>
            <span className={styles.supportIcon} aria-hidden="true">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="m4.5 19.5 4.2-1L19 8.2a2.05 2.05 0 0 0-2.9-2.9L5.8 15.5l-1.3 4Z" />
                <path d="m13.5 7 3 3" />
              </svg>
            </span>
            <span>
              <p className={styles.supportTitle}>Custom Branding</p>
              <p className={styles.supportCopy}>
                Logo printing and packaging on eligible products.
              </p>
            </span>
          </div>
        </section>

        {/* ---------------- Bottom actions ---------------- */}
        <div className={styles.actionsRow}>
          <p className={styles.actionsCopy}>
            <strong>Planning a bulk order?</strong> Tell us your quantities and
            timeline.
          </p>
          <div className={styles.actionsLinks}>
            <Link href="/bulk-quote" className="btn btn--dark">
              Request a bulk quote
            </Link>
            <Link href="/faq" className="btn btn--ghost-dark">
              Read the FAQ
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
