"use client";

import { useEffect, useState } from "react";
import {
  ORDER_TYPE_OPTIONS,
  PACKAGING_OPTIONS,
  validateDesignFile,
  type BulkQuoteFieldErrors,
  type BulkQuoteRequirements,
  type DesignFileMeta,
  type OrderType,
  type PackagingPreference,
  type YesNo,
} from "@/lib/bulkQuote";
import styles from "./QuoteRequirements.module.css";

type Props = {
  value: BulkQuoteRequirements;
  errors: BulkQuoteFieldErrors;
  onChange: (next: BulkQuoteRequirements) => void;
  onFileError: (message: string | null) => void;
};

export function QuoteRequirements({
  value,
  errors,
  onChange,
  onFileError,
}: Props) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const setField = <K extends keyof BulkQuoteRequirements>(
    key: K,
    next: BulkQuoteRequirements[K],
  ) => {
    onChange({ ...value, [key]: next });
  };

  const handleFile = (file: File | null) => {
    if (!file) return;
    const error = validateDesignFile(file);
    if (error) {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      onChange({ ...value, designFile: null });
      onFileError(error);
      return;
    }

    const meta: DesignFileMeta = {
      name: file.name,
      size: file.size,
      type: file.type,
    };

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (file.type.startsWith("image/")) {
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setPreviewUrl(null);
    }

    onFileError(null);
    onChange({ ...value, designFile: meta });
  };

  return (
    <section className={styles.section} aria-labelledby="quote-requirements-heading">
      <div className={styles.head}>
        <h2 id="quote-requirements-heading" className={styles.title}>
          Tell us what you need
        </h2>
        <p className={styles.copy}>
          Share the nature of your request and any customization preferences.
          No pricing is calculated on this page.
        </p>
      </div>

      <div className={styles.block}>
        <p className={styles.blockLabel} id="order-type-label">
          Request type
        </p>
        <div
          className={styles.options}
          role="radiogroup"
          aria-labelledby="order-type-label"
        >
          {ORDER_TYPE_OPTIONS.map((option) => {
            const selected = value.orderType === option.id;
            return (
              <label
                key={option.id}
                className={`${styles.option} ${selected ? styles.optionSelected : ""}`}
              >
                <input
                  type="radio"
                  name="orderType"
                  value={option.id}
                  checked={selected}
                  onChange={() => setField("orderType", option.id as OrderType)}
                />
                <span>{option.label}</span>
              </label>
            );
          })}
        </div>
        {errors.orderType ? (
          <p className={styles.error} role="alert">
            {errors.orderType}
          </p>
        ) : null}
      </div>

      <div className={styles.block}>
        <p className={styles.blockLabel} id="customization-label">
          Do you require customization?
        </p>
        <div
          className={styles.inlineOptions}
          role="radiogroup"
          aria-labelledby="customization-label"
        >
          {(
            [
              { id: "no", label: "No" },
              { id: "yes", label: "Yes" },
            ] as const
          ).map((option) => (
            <label key={option.id} className={styles.inlineOption}>
              <input
                type="radio"
                name="customization"
                value={option.id}
                checked={value.customization === option.id}
                onChange={() =>
                  setField("customization", option.id as YesNo)
                }
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </div>

      {value.customization === "yes" ? (
        <div className={styles.field}>
          <label className={styles.label} htmlFor="customization-notes">
            Customization requirements
          </label>
          <textarea
            id="customization-notes"
            className={`${styles.textarea} ${errors.customizationNotes ? styles.textareaError : ""}`}
            placeholder="Describe your customization requirements..."
            value={value.customizationNotes}
            onChange={(event) =>
              setField("customizationNotes", event.target.value)
            }
            aria-invalid={Boolean(errors.customizationNotes)}
            aria-describedby={
              errors.customizationNotes ? "customization-notes-error" : undefined
            }
          />
          {errors.customizationNotes ? (
            <p id="customization-notes-error" className={styles.error} role="alert">
              {errors.customizationNotes}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className={styles.block}>
        <p className={styles.blockLabel}>Upload reference design</p>
        <p className={styles.hint}>
          PNG, JPG, JPEG or PDF · max 5MB · stored only in this browser session
        </p>
        <div className={styles.fileRow}>
          <label className={styles.fileBtn}>
            Choose file
            <input
              type="file"
              accept=".png,.jpg,.jpeg,.pdf,image/png,image/jpeg,application/pdf"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                handleFile(file);
                event.target.value = "";
              }}
            />
          </label>
          {value.designFile ? (
            <>
              <span className={styles.fileName}>{value.designFile.name}</span>
              <button
                type="button"
                className={styles.removeFile}
                onClick={() => {
                  if (previewUrl) {
                    URL.revokeObjectURL(previewUrl);
                    setPreviewUrl(null);
                  }
                  setField("designFile", null);
                }}
              >
                Remove
              </button>
            </>
          ) : null}
        </div>
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="" className={styles.preview} />
        ) : null}
        {errors.designFile ? (
          <p className={styles.error} role="alert">
            {errors.designFile}
          </p>
        ) : null}
      </div>

      <div className={styles.block}>
        <p className={styles.blockLabel} id="packaging-label">
          Packaging requirement
        </p>
        <div
          className={styles.inlineOptions}
          role="radiogroup"
          aria-labelledby="packaging-label"
        >
          {PACKAGING_OPTIONS.map((option) => (
            <label key={option.id} className={styles.inlineOption}>
              <input
                type="radio"
                name="packaging"
                value={option.id}
                checked={value.packaging === option.id}
                onChange={() =>
                  setField("packaging", option.id as PackagingPreference)
                }
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className={styles.block}>
        <p className={styles.blockLabel} id="branding-label">
          Branding required?
        </p>
        <div
          className={styles.inlineOptions}
          role="radiogroup"
          aria-labelledby="branding-label"
        >
          {(
            [
              { id: "no", label: "No" },
              { id: "yes", label: "Yes" },
            ] as const
          ).map((option) => (
            <label key={option.id} className={styles.inlineOption}>
              <input
                type="radio"
                name="branding"
                value={option.id}
                checked={value.branding === option.id}
                onChange={() => setField("branding", option.id as YesNo)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </div>

      {value.branding === "yes" ? (
        <>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="brand-name">
              Brand / company name
            </label>
            <input
              id="brand-name"
              className={`${styles.input} ${errors.brandName ? styles.inputError : ""}`}
              type="text"
              value={value.brandName}
              onChange={(event) => setField("brandName", event.target.value)}
              aria-invalid={Boolean(errors.brandName)}
              aria-describedby={errors.brandName ? "brand-name-error" : undefined}
            />
            {errors.brandName ? (
              <p id="brand-name-error" className={styles.error} role="alert">
                {errors.brandName}
              </p>
            ) : null}
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="branding-notes">
              Branding notes{" "}
              <span style={{ color: "var(--text-muted)" }}>(optional)</span>
            </label>
            <textarea
              id="branding-notes"
              className={styles.textarea}
              placeholder="Colors, placement, or other branding notes"
              value={value.brandingNotes}
              onChange={(event) => setField("brandingNotes", event.target.value)}
            />
          </div>
        </>
      ) : null}

      <div className={styles.field}>
        <label className={styles.label} htmlFor="expected-delivery">
          Expected delivery date{" "}
          <span style={{ color: "var(--text-muted)" }}>(optional)</span>
        </label>
        <input
          id="expected-delivery"
          className={styles.input}
          type="date"
          value={value.expectedDelivery}
          onChange={(event) => setField("expectedDelivery", event.target.value)}
        />
        <p className={styles.hint}>
          Preference only — not a delivery commitment.
        </p>
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="additional-notes">
          Additional notes{" "}
          <span style={{ color: "var(--text-muted)" }}>(optional)</span>
        </label>
        <textarea
          id="additional-notes"
          className={styles.textarea}
          placeholder="Tell us anything else we should know about your requirement..."
          value={value.additionalNotes}
          onChange={(event) => setField("additionalNotes", event.target.value)}
        />
      </div>
    </section>
  );
}
