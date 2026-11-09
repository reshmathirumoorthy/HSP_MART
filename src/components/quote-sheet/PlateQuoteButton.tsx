"use client";

import { Check, FilePlus2 } from "lucide-react";
import { useQuoteSheet } from "@/context/QuoteSheetContext";
import styles from "./PlateQuoteButton.module.css";

/** "Add to quote" stamp for featured plates; becomes "On sheet" once added. */
export function PlateQuoteButton({
  slug,
  tone = "marigold",
  className,
}: {
  slug: string;
  tone?: "marigold" | "green";
  className?: string;
}) {
  const sheet = useQuoteSheet();
  const onSheet = sheet.has(slug);
  return (
    <button
      type="button"
      className={className ? `${styles.button} ${className}` : styles.button}
      data-tone={tone}
      data-active={onSheet || undefined}
      aria-pressed={onSheet}
      onClick={() => (onSheet ? sheet.open() : sheet.add(slug))}
    >
      {onSheet ? <Check aria-hidden /> : <FilePlus2 aria-hidden />}
      {onSheet ? "Added to quote" : "Add to quote"}
    </button>
  );
}
