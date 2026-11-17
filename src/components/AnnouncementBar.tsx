import Link from "next/link";
import { company } from "@/data/company";
import { announcement, announcementMessages } from "@/lib/siteData";
import styles from "./AnnouncementBar.module.css";

export function AnnouncementBar() {
  const phone = company.contact.phone;
  const tel = phone?.replace(/\s/g, "") ?? "";

  return (
    <div className={styles.bar} role="region" aria-label="Store notices">
      <div className={`shell ${styles.inner}`}>
        {announcementMessages().map((m, i) => (
          <span key={i} className={styles.item}>
            {i > 0 ? <span className={styles.sep} aria-hidden>· </span> : null}
            {m}
          </span>
        ))}
        {announcement.showPhone && phone ? (
          <span className={`${styles.sep} ${styles.wideOnly}`} aria-hidden>
            ·
          </span>
        ) : null}
        {announcement.showPhone && phone ? (
          <a href={`tel:${tel}`} className={`${styles.item} ${styles.wideOnly}`}>
            Call {phone}
          </a>
        ) : null}
      </div>
    </div>
  );
}
