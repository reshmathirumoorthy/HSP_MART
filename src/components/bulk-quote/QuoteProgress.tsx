import { QUOTE_STEPS, type QuoteStep } from "@/lib/bulkQuote";
import styles from "./QuoteProgress.module.css";

type Props = {
  current: QuoteStep;
};

export function QuoteProgress({ current }: Props) {
  const currentIndex = QUOTE_STEPS.findIndex((step) => step.id === current);
  const currentStep = QUOTE_STEPS[currentIndex] ?? QUOTE_STEPS[0];

  return (
    <nav className={styles.progress} aria-label="Quote request progress">
      <p className={styles.mobile}>
        {currentStep.number} / 04 · {currentStep.label}
      </p>
      <ol className={styles.list}>
        {QUOTE_STEPS.map((step, index) => {
          const active = index <= currentIndex;
          return (
            <li
              key={step.id}
              className={`${styles.item} ${active ? styles.active : ""}`}
              aria-current={step.id === current ? "step" : undefined}
            >
              <span className={styles.number}>{step.number}</span>
              <span className={styles.label}>{step.label}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
