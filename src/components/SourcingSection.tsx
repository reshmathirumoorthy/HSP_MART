import Image from "next/image";
import Link from "next/link";
import { company } from "@/data/company";
import styles from "./SourcingSection.module.css";

export function SourcingSection() {
  return (
    <section
      id="sourcing"
      className={styles.section}
      data-nav-surface="light"
      aria-labelledby="sourcing-heading"
    >
      <div className={`shell ${styles.inner}`}>
        <div className={styles.copy}>
          <p className={styles.eyebrow}>Why HSP Mart</p>
          <h2 id="sourcing-heading" className={styles.title}>
            Office essentials
            <br />
            with a partner behind them.
          </h2>
          <p className={styles.lead}>{company.description}</p>
          <div className={styles.actions}>
            <Link href="/about" className="btn btn--primary">
              About HSP Mart
            </Link>
            <Link href="/contact" className={styles.ghost}>
              Contact us
            </Link>
          </div>
        </div>

        <aside className={styles.aside} aria-hidden>
          <div className={styles.frameLarge}>
            <Image
              src="/images/products/wooden-organiser.png"
              alt=""
              fill
              sizes="(max-width: 900px) 88vw, 28vw"
              className={styles.image}
            />
          </div>
          <div className={styles.frameSmall}>
            <Image
              src="/images/products/document-bag-main.webp"
              alt=""
              fill
              sizes="180px"
              className={styles.image}
            />
          </div>
          <Image
            src="/images/hsp-mart-logo.png"
            alt=""
            width={120}
            height={100}
            className={styles.logoMark}
          />
        </aside>
      </div>
    </section>
  );
}
