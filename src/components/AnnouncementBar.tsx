import Link from "next/link";
import { company } from "@/data/company";
import styles from "./AnnouncementBar.module.css";

export function AnnouncementBar() {
  const phone = company.contact.phone;
  const tel = phone?.replace(/\s/g, "") ?? "";

  return (
    <div className={styles.bar} role="region" aria-label="Store notices">
      <div className={`shell ${styles.inner}`}>
        <p className={styles.item}>Free delivery on orders above ₹499</p>
        <span className={styles.sep} aria-hidden>
          ·
        </span>
        {phone ? (
          <a href={`tel:${tel}`} className={styles.item}>
            Call {phone}
          </a>
        ) : null}
      </div>
    </div>
  );
}
