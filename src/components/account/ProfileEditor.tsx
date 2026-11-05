"use client";

import { useState } from "react";
import Link from "next/link";
import { INDIAN_STATES, validateCustomer } from "@/lib/checkout";
import { CUSTOMER_TYPE_OPTIONS, type CustomerType } from "@/lib/bulkQuote";
import { useAccountProfile } from "@/context/AccountProfileContext";
import { ProfileAvatar } from "@/components/account/ProfileAvatar";
import { PhotoPreviewModal } from "@/components/account/PhotoPreviewModal";
import { useAvatarUpload } from "@/hooks/useAvatarUpload";
import styles from "./account.module.css";

export function ProfileEditor() {
  const { profile, saveProfile } = useAccountProfile();
  const {
    hasAvatar,
    fileInputRef,
    pendingPhoto,
    photoBusy,
    photoError,
    photoNotice,
    openPicker,
    handleFile,
    savePendingPhoto,
    cancelPendingPhoto,
    removePhoto,
  } = useAvatarUpload();

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(profile);
  const [note, setNote] = useState("");
  const [savedOk, setSavedOk] = useState(false);
  const [errors, setErrors] = useState<{
    fullName?: string;
    email?: string;
    phone?: string;
  }>({});

  const current = editing ? draft : profile;

  function startEditing() {
    setDraft(profile);
    setEditing(true);
    setNote("");
    setSavedOk(false);
    setErrors({});
  }

  function cancelEditing() {
    setDraft(profile);
    setEditing(false);
    setErrors({});
    setNote("");
    setSavedOk(false);
  }

  function saveChanges() {
    const nextErrors = validateCustomer({
      fullName: draft.fullName,
      email: draft.email,
      phone: draft.phone,
    });
    setErrors(nextErrors);
    if (nextErrors.fullName || nextErrors.email || nextErrors.phone) {
      setSavedOk(false);
      setNote("Please fix the highlighted fields before saving.");
      return;
    }
    const firstName =
      draft.fullName.trim().split(/\s+/)[0] || draft.firstName;
    // Avatar lives outside the form draft: take the latest saved
    // photo so an edit-save never reverts a Change Photo made elsewhere.
    saveProfile({ ...draft, firstName, avatar: profile.avatar });
    setEditing(false);
    setErrors({});
    setSavedOk(true);
    setNote("Your changes have been saved on this device.");
  }

  return (
    <div className={styles.content}>
      <div className={styles.editorBar}>
        {!editing ? (
          <button
            type="button"
            className="btn btn--dark"
            onClick={startEditing}
          >
            Edit profile
          </button>
        ) : (
          <div className={styles.editorActions}>
            <button
              type="button"
              className="btn btn--dark"
              onClick={saveChanges}
            >
              Save Changes
            </button>
            <button
              type="button"
              className="btn btn--outline"
              onClick={cancelEditing}
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {note ? (
        <p
          className={savedOk ? styles.formSuccess : styles.formErrorBanner}
          role={savedOk ? "status" : "alert"}
        >
          {savedOk ? (
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          ) : null}
          <span>{note}</span>
        </p>
      ) : (
        <p className={styles.note}>
          Demo profile for the storefront. Edits persist locally in this
          browser and are not a real customer account.
        </p>
      )}

      <section className={styles.panel} aria-labelledby="personal-heading">
        <h2 id="personal-heading" className={styles.sectionTitle}>
          Personal information
        </h2>

        <div className={styles.avatarEditor}>
          <ProfileAvatar />
          <div className={styles.avatarEditorCopy}>
            <p className={styles.avatarEditorTitle}>Profile photo</p>
            <p className={styles.note}>
              Shown in your account header. Saved on this device only — never
              uploaded.
            </p>
            <div className={styles.avatarControls}>
              <button
                type="button"
                className="btn btn--outline"
                onClick={openPicker}
                disabled={photoBusy}
              >
                {photoBusy
                  ? "Processing…"
                  : hasAvatar
                    ? "Change photo"
                    : "Upload photo"}
              </button>
              {hasAvatar ? (
                <button
                  type="button"
                  className={styles.removePhoto}
                  onClick={removePhoto}
                  disabled={photoBusy}
                >
                  Remove
                </button>
              ) : null}
            </div>
            {photoError ? (
              <p className={styles.fieldError} role="alert">
                {photoError}
              </p>
            ) : null}
            {photoNotice ? (
              <p className={styles.photoFeedbackOk} role="status">
                <span>{photoNotice}</span>
              </p>
            ) : null}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(event) => handleFile(event.target.files?.[0])}
          />
        </div>

        <div className={styles.formGrid}>
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="profile-name">
              Full name
            </label>
            <input
              id="profile-name"
              className={styles.input}
              value={current.fullName}
              disabled={!editing}
              autoComplete="name"
              aria-invalid={Boolean(errors.fullName)}
              aria-describedby={errors.fullName ? "profile-name-error" : undefined}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, fullName: event.target.value }))
              }
            />
            {errors.fullName ? (
              <p id="profile-name-error" className={styles.fieldError} role="alert">
                {errors.fullName}
              </p>
            ) : null}
          </div>
          <div className={styles.twoCol}>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="profile-email">
                Email
              </label>
              <input
                id="profile-email"
                className={styles.input}
                type="email"
                autoComplete="email"
                value={current.email}
                disabled={!editing}
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? "profile-email-error" : undefined}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, email: event.target.value }))
                }
              />
              {errors.email ? (
                <p id="profile-email-error" className={styles.fieldError} role="alert">
                  {errors.email}
                </p>
              ) : null}
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="profile-phone">
                Phone
              </label>
              <input
                id="profile-phone"
                className={styles.input}
                type="tel"
                autoComplete="tel"
                value={current.phone}
                disabled={!editing}
                aria-invalid={Boolean(errors.phone)}
                aria-describedby={errors.phone ? "profile-phone-error" : undefined}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, phone: event.target.value }))
                }
              />
              {errors.phone ? (
                <p id="profile-phone-error" className={styles.fieldError} role="alert">
                  {errors.phone}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className={styles.panel} aria-labelledby="business-heading">
        <h2 id="business-heading" className={styles.sectionTitle}>
          Business information
        </h2>
        <div className={styles.formGrid}>
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="profile-type">
              Customer type
            </label>
            <select
              id="profile-type"
              className={styles.select}
              value={current.customerType}
              disabled={!editing}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  customerType: event.target.value as CustomerType,
                }))
              }
            >
              {CUSTOMER_TYPE_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="profile-org">
              Organization
            </label>
            <input
              id="profile-org"
              className={styles.input}
              value={current.organizationName}
              disabled={!editing}
              placeholder="Not added"
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  organizationName: event.target.value,
                }))
              }
            />
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="profile-gstin">
              GSTIN
            </label>
            <input
              id="profile-gstin"
              className={styles.input}
              value={current.gstin}
              disabled={!editing}
              placeholder="Not added"
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, gstin: event.target.value }))
              }
            />
          </div>
        </div>
      </section>

      <section className={styles.panel} aria-labelledby="profile-address-heading">
        <div className={styles.cardTop}>
          <h2 id="profile-address-heading" className={styles.sectionTitle}>
            Contact address
          </h2>
          <Link href="/account/addresses" className={styles.viewAll}>
            Address book
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14" />
              <path d="m13 6 6 6-6 6" />
            </svg>
          </Link>
        </div>
        <p className={styles.note}>
          Optional profile contact address. Delivery addresses for checkout
          belong in the local address book.
        </p>
        <div className={styles.formGrid}>
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="profile-line1">
              Address line 1
            </label>
            <input
              id="profile-line1"
              className={styles.input}
              value={current.address.line1}
              disabled={!editing}
              placeholder="Not added"
              autoComplete="address-line1"
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  address: { ...prev.address, line1: event.target.value },
                }))
              }
            />
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="profile-line2">
              Address line 2
            </label>
            <input
              id="profile-line2"
              className={styles.input}
              value={current.address.line2}
              disabled={!editing}
              placeholder="Not added"
              autoComplete="address-line2"
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  address: { ...prev.address, line2: event.target.value },
                }))
              }
            />
          </div>
          <div className={styles.twoCol}>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="profile-city">
                City
              </label>
              <input
                id="profile-city"
                className={styles.input}
                value={current.address.city}
                disabled={!editing}
                placeholder="Not added"
                autoComplete="address-level2"
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    address: { ...prev.address, city: event.target.value },
                  }))
                }
              />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="profile-state">
                State
              </label>
              <select
                id="profile-state"
                className={styles.select}
                value={current.address.state}
                disabled={!editing}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    address: { ...prev.address, state: event.target.value },
                  }))
                }
              >
                <option value="">Not added</option>
                {INDIAN_STATES.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className={styles.twoCol}>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="profile-pincode">
                Pincode
              </label>
              <input
                id="profile-pincode"
                className={styles.input}
                value={current.address.pincode}
                disabled={!editing}
                placeholder="Not added"
                autoComplete="postal-code"
                inputMode="numeric"
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    address: { ...prev.address, pincode: event.target.value },
                  }))
                }
              />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="profile-country">
                Country
              </label>
              <input
                id="profile-country"
                className={styles.input}
                value={current.address.country}
                disabled={!editing}
                autoComplete="country-name"
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    address: { ...prev.address, country: event.target.value },
                  }))
                }
              />
            </div>
          </div>
        </div>
      </section>

      {pendingPhoto ? (
        <PhotoPreviewModal
          dataUrl={pendingPhoto}
          onSave={savePendingPhoto}
          onCancel={cancelPendingPhoto}
          onChooseAnother={openPicker}
          busy={photoBusy}
        />
      ) : null}
    </div>
  );
}
