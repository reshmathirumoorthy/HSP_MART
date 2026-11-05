import { CHECKOUT_STEPS, type CheckoutStep } from "@/lib/checkout";
import styles from "./CheckoutProgress.module.css";

type Props = {
  current: CheckoutStep;
};

export function CheckoutProgress({ current }: Props) {
  const currentIndex = CHECKOUT_STEPS.findIndex((step) => step.id === current);

  return (
    <nav className={styles.progress} aria-label="Checkout progress">
      <ol className={styles.list}>
        {CHECKOUT_STEPS.map((step, index) => {
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
