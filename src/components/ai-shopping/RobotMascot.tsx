import { useId } from "react";
import styles from "./RobotMascot.module.css";

type Props = {
  /** Rendered width in px. Height scales proportionally. */
  size?: number;
  /** "thinking" swaps the happy eyes for focused dots and speeds the bob. */
  state?: "idle" | "thinking";
  className?: string;
  title?: string;
};

/**
 * HSP AI robot mascot — friendly white/cream robot with forest-green
 * headphones and HSP chest branding. Pure SVG + CSS, no assets required.
 */
export function RobotMascot({
  size = 96,
  state = "idle",
  className,
  title = "HSP AI robot",
}: Props) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const bodyGrad = `rb-body-${uid}`;
  const greenGrad = `rb-green-${uid}`;
  const faceGrad = `rb-face-${uid}`;

  return (
    <svg
      className={`${styles.mascot} ${state === "thinking" ? styles.thinking : ""} ${className ?? ""}`}
      width={size}
      height={(size * 126) / 120}
      viewBox="0 0 120 126"
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      <defs>
        <linearGradient id={bodyGrad} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#F1EFE3" />
        </linearGradient>
        <linearGradient id={greenGrad} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0E6E3C" />
          <stop offset="100%" stopColor="#063B25" />
        </linearGradient>
        <linearGradient id={faceGrad} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#182620" />
          <stop offset="100%" stopColor="#0C1710" />
        </linearGradient>
      </defs>

      <g className={styles.float}>
        {/* spark accents above the head */}
        <path
          className={styles.spark}
          d="M78 6 l2.1 4.4 4.4 2.1 -4.4 2.1 -2.1 4.4 -2.1 -4.4 -4.4 -2.1 4.4 -2.1 Z"
          fill="#015C31"
          opacity="0.9"
        />
        <path
          className={`${styles.spark} ${styles.sparkLate}`}
          d="M98 20 l1.3 2.7 2.7 1.3 -2.7 1.3 -1.3 2.7 -1.3 -2.7 -2.7 -1.3 2.7 -1.3 Z"
          fill="#C9A252"
        />

        {/* antenna */}
        <g className={styles.antenna}>
          <line
            x1="60"
            y1="12"
            x2="60"
            y2="24"
            stroke="#063B25"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle cx="60" cy="9.5" r="4.2" fill="#015C31" />
          <circle cx="58.6" cy="8.2" r="1.3" fill="#7CF0B2" opacity="0.9" />
        </g>

        {/* head */}
        <g className={styles.head}>
          {/* headphone band */}
          <path
            d="M22 46 C 22 18, 98 18, 98 46"
            fill="none"
            stroke="#015C31"
            strokeWidth="6"
            strokeLinecap="round"
          />
          {/* ear cups */}
          <rect x="13" y="40" width="13" height="22" rx="6.5" fill={`url(#${greenGrad})`} />
          <rect x="94" y="40" width="13" height="22" rx="6.5" fill={`url(#${greenGrad})`} />
          <circle cx="19.5" cy="51" r="2.4" fill="#7CF0B2" opacity="0.85" />
          <circle cx="100.5" cy="51" r="2.4" fill="#7CF0B2" opacity="0.85" />

          {/* head shell */}
          <rect
            x="21"
            y="22"
            width="78"
            height="48"
            rx="23"
            fill={`url(#${bodyGrad})`}
            stroke="#E2DFCF"
            strokeWidth="1.5"
          />

          {/* face screen */}
          <rect x="30" y="31" width="60" height="30" rx="15" fill={`url(#${faceGrad})`} />

          {/* happy arc eyes (idle) */}
          <g
            className={styles.eyes}
            stroke="#8BF5B6"
            strokeWidth="2.6"
            strokeLinecap="round"
            fill="none"
          >
            <path d="M41 48.5 q 5 -5.6 10 0" />
            <path d="M69 48.5 q 5 -5.6 10 0" />
          </g>

          {/* focused dot eyes (thinking) */}
          <g className={styles.dots} fill="#8BF5B6">
            <circle cx="46" cy="46.5" r="2.5" />
            <circle cx="74" cy="46.5" r="2.5" />
          </g>

          {/* smile */}
          <path
            className={styles.smile}
            d="M53.5 55 q 6.5 4.6 13 0"
            fill="none"
            stroke="#8BF5B6"
            strokeWidth="2.2"
            strokeLinecap="round"
            opacity="0.95"
          />
        </g>

        {/* body */}
        <g>
          {/* left arm */}
          <g className={styles.armLeft}>
            <rect
              x="24"
              y="79"
              width="10.5"
              height="24"
              rx="5.25"
              fill={`url(#${bodyGrad})`}
              stroke="#E2DFCF"
              strokeWidth="1.2"
              transform="rotate(14 29 80)"
            />
          </g>
          {/* right arm (waves) */}
          <g className={styles.armRight}>
            <rect
              x="85.5"
              y="79"
              width="10.5"
              height="24"
              rx="5.25"
              fill={`url(#${bodyGrad})`}
              stroke="#E2DFCF"
              strokeWidth="1.2"
              transform="rotate(-14 91 80)"
            />
          </g>

          {/* torso */}
          <rect
            x="33"
            y="72"
            width="54"
            height="40"
            rx="17"
            fill={`url(#${bodyGrad})`}
            stroke="#E2DFCF"
            strokeWidth="1.5"
          />
          {/* chest badge */}
          <rect x="45.5" y="83" width="29" height="16.5" rx="4.5" fill="#015C31" />
          <text
            x="60"
            y="94.6"
            textAnchor="middle"
            fontSize="9.5"
            fontWeight="700"
            letterSpacing="1.6"
            fill="#FFFFFF"
            fontFamily="'DM Sans', system-ui, sans-serif"
          >
            HSP
          </text>
        </g>

        {/* legs */}
        <rect x="44" y="109" width="11" height="9" rx="4.5" fill="#E9E7DB" stroke="#E2DFCF" />
        <rect x="65" y="109" width="11" height="9" rx="4.5" fill="#E9E7DB" stroke="#E2DFCF" />
      </g>
    </svg>
  );
}
