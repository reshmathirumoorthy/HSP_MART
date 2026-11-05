"use client";

import { useEffect, useRef } from "react";
import styles from "./account.module.css";

type Props = {
  /** Data URL of the freshly picked photo, shown before saving. */
  dataUrl: string;
  onSave: () => void;
  onCancel: () => void;
  onChooseAnother: () => void;
  busy?: boolean;
};

export function PhotoPreviewModal({
  dataUrl,
  onSave,
  onCancel,
  onChooseAnother,
  busy = false,
}: Props) {
  const saveRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    saveRef.current?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onCancel();
    };
    document.addEventListener("keydown", handleKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onCancel, busy]);

  return (
    <div
      className={styles.modalOverlay}
      role="presentation"
      onClick={busy ? undefined : onCancel}
    >
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="photo-preview-title"
        aria-describedby="photo-preview-copy"
        onClick={(event) => event.stopPropagation()}
      >
        <p className={styles.modalOverline}>Profile photo</p>
        <h2 id="photo-preview-title" className={styles.modalTitle}>
          Preview your photo
        </h2>
        <p id="photo-preview-copy" className={styles.modalCopy}>
          This is how your picture will appear across your HSP Mart account.
          Nothing is uploaded — it stays on this device.
        </p>

        <div className={styles.modalPreview}>
          {/* eslint-disable-next-line @next/next/no-img-element -- local data URL preview */}
          <img
            className={styles.modalAvatar}
            src={dataUrl}
            alt="Preview of your new profile photo"
          />
          <span className={styles.modalPreviewBadge} aria-hidden="true">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </span>
        </div>

        <div className={styles.modalActions}>
          <button
            ref={saveRef}
            type="button"
            className="btn btn--dark"
            onClick={onSave}
            disabled={busy}
          >
            Save photo
          </button>
          <button
            type="button"
            className="btn btn--outline"
            onClick={onChooseAnother}
            disabled={busy}
          >
            Choose another
          </button>
          <button
            type="button"
            className={styles.ghost}
            onClick={onCancel}
            disabled={busy}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
