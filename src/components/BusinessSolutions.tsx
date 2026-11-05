import Image from "next/image";
import Link from "next/link";
import styles from "./BusinessSolutions.module.css";

/** Lucide-style outline icons (inline SVGs — lucide-react is not a project dependency). */
function IconLayers() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
      <path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" />
      <path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" />
    </svg>
  );
}

function IconStamp() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 22h14" />
      <path d="M19.27 13.73A2.5 2.5 0 0 0 17.5 13h-11A2.5 2.5 0 0 0 4 15.5V17a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-1.5c0-.66-.26-1.3-.73-1.77Z" />
      <path d="M14 13V8.5C14 7 15 7 15 5a3 3 0 0 0-6 0c0 2 1 2 1 3.5V13" />
    </svg>
  );
}

function IconBuilding() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect width="16" height="20" x="4" y="2" rx="2" ry="2" />
      <path d="M9 22v-4h6v4" />
      <path d="M8 6h.01" />
      <path d="M16 6h.01" />
      <path d="M12 6h.01" />
      <path d="M12 10h.01" />
      <path d="M12 14h.01" />
      <path d="M16 10h.01" />
      <path d="M16 14h.01" />
      <path d="M8 10h.01" />
      <path d="M8 14h.01" />
    </svg>
  );
}

const BENEFITS = [
  {
    icon: IconLayers,
    text: "Bulk pricing for business orders",
  },
  {
    icon: IconStamp,
    text: "Custom branding and personalization",
  },
  {
    icon: IconBuilding,
    text: "Support for corporate and institutional requirements",
  },
] as const;

export function BusinessSolutions() {
  return (
    <section
      id="business"
      className={styles.section}
      data-nav-surface="light"
      aria-labelledby="business-heading"
    >
      <div className={`shell ${styles.layout}`}>
        <div className={styles.copy}>
          <p className={styles.eyebrow}>Business Solutions</p>
          <h2 id="business-heading" className={styles.heading}>
            Bulk Orders &amp; Customization
          </h2>
          <p className={styles.lead}>
            Source stationery at scale for offices, institutions, and corporate
            gifting — with custom branding and packaging tailored to your
            organisation.
          </p>

          <ul className={styles.benefits}>
            {BENEFITS.map(({ icon: Icon, text }) => (
              <li key={text} className={styles.benefit}>
                <span className={styles.benefitIcon}>
                  <Icon />
                </span>
                <span>{text}</span>
              </li>
            ))}
          </ul>

          <div className={styles.actions}>
            <Link href="/bulk-quote" className={`btn btn--primary ${styles.cta}`}>
              Request a Bulk Quote
            </Link>
            <Link
              href="/products?customizable=true"
              className={`btn btn--outline ${styles.ctaSecondary}`}
            >
              Explore Customization
            </Link>
          </div>
        </div>

        <div className={styles.media}>
          <div className={styles.frame}>
            <Image
              src="/images/business-bulk-stationery.jpg"
              alt="Professionally arranged corporate stationery set with notebooks, pens, and office supplies"
              fill
              sizes="(max-width: 959px) 100vw, 46vw"
              className={styles.photo}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
