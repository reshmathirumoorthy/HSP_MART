import type { ReactNode } from "react";
import Link from "next/link";
import { company } from "@/data/company";
import styles from "./ServiceBenefits.module.css";

/** Lucide-style outline icons (inline SVGs — lucide-react is not a project dependency). */
export function IconTruck() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
      <path d="M15 18H9" />
      <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
      <circle cx="17" cy="18" r="2" />
      <circle cx="7" cy="18" r="2" />
    </svg>
  );
}

export function IconLightbulb() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
      <path d="M9 18h6" />
      <path d="M10 22h4" />
    </svg>
  );
}

function IconPackage() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z" />
      <path d="M12 22V12" />
      <polyline points="3.29 7 12 12 20.71 7" />
      <path d="m7.5 4.27 9 5.15" />
    </svg>
  );
}

export function IconHeadset() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 11h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5Zm0 0a9 9 0 1 1 18 0m0 0v5a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3Z" />
      <path d="M21 16v2a4 4 0 0 1-4 4h-5" />
    </svg>
  );
}

export function IconShieldCheck() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

type BenefitItem = {
  title: string;
  body: string;
  icon: ReactNode;
  href?: string;
};

const items: BenefitItem[] = [
  {
    title: "Free Delivery",
    body: "On orders above ₹499",
    icon: <IconTruck />,
  },
  {
    title: "Expert Advice",
    body: "Guidance over a phone call",
    icon: <IconLightbulb />,
  },
  {
    title: "Bulk & Branding",
    body: "Quotes and custom branding for teams",
    icon: <IconPackage />,
    href: "/bulk-quote",
  },
  {
    title: "Clear Contact",
    body: `${company.contact.phone} · ${company.contact.email}`,
    icon: <IconHeadset />,
    href: "/contact",
  },
];

export function ServiceBenefits() {
  return (
    <section className={styles.section} aria-label="Shopping benefits">
      <div className={`shell ${styles.grid}`}>
        {items.map((item) => {
          const content = (
            <>
              <span className={styles.icon} aria-hidden="true">
                {item.icon}
              </span>
              <div>
                <h3 className={styles.title}>{item.title}</h3>
                <p className={styles.body}>{item.body}</p>
              </div>
            </>
          );

          if (item.href) {
            return (
              <Link
                key={item.title}
                href={item.href}
                className={`${styles.item} ${styles.itemLink}`}
              >
                {content}
              </Link>
            );
          }

          return (
            <div key={item.title} className={styles.item}>
              {content}
            </div>
          );
        })}
      </div>
    </section>
  );
}
