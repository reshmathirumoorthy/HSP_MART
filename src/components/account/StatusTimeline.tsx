import styles from "./account.module.css";

type Step = {
  id: string;
  label: string;
};

type Props = {
  steps: Step[];
  currentId: string;
  labelledBy: string;
};

export function StatusTimeline({ steps, currentId, labelledBy }: Props) {
  const currentIndex = steps.findIndex((step) => step.id === currentId);

  return (
    <ol className={styles.timeline} aria-labelledby={labelledBy}>
      {steps.map((step, index) => {
        const done = index < currentIndex;
        const current = index === currentIndex;
        return (
          <li
            key={step.id}
            className={`${styles.timelineItem} ${current ? styles.timelineCurrent : ""}`}
          >
            <span
              className={`${styles.marker} ${done ? styles.markerDone : ""} ${current ? styles.markerCurrent : ""}`}
              aria-hidden
            />
            <span className={styles.timelineLabel}>
              {step.label}
              {current ? " · Current" : ""}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
