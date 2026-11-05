"use client";

import { useId, useState } from "react";
import { companyFaqs } from "@/data/company";
import styles from "./ContentPage.module.css";

type FaqItem = (typeof companyFaqs)[number];

type Props = {
  faqs: readonly FaqItem[];
};

export function FaqAccordion({ faqs }: Props) {
  const baseId = useId();
  const [openId, setOpenId] = useState<string | null>(faqs[0]?.id ?? null);

  return (
    <div className={styles.faqList}>
      {faqs.map((faq) => {
        const panelId = `${baseId}-${faq.id}-panel`;
        const buttonId = `${baseId}-${faq.id}-button`;
        const labelId = `${baseId}-${faq.id}-label`;
        const isOpen = openId === faq.id;

        return (
          <div key={faq.id} className={styles.faqItem}>
            <h2 className={styles.faqQuestion}>
              <button
                type="button"
                id={buttonId}
                className={styles.faqTrigger}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() =>
                  setOpenId((current) => (current === faq.id ? null : faq.id))
                }
              >
                <span id={labelId} className={styles.faqTriggerText}>
                  {faq.question}
                </span>
                <span className={styles.faqIndicator} aria-hidden>
                  {isOpen ? "−" : "+"}
                </span>
              </button>
            </h2>
            <div
              id={panelId}
              role="region"
              aria-labelledby={labelId}
              hidden={!isOpen}
              className={styles.faqAnswer}
            >
              {isOpen ? <p>{faq.answer}</p> : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
