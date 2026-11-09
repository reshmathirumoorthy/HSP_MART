"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { AccountNav } from "@/components/account/AccountNav";
import { ProfileAvatar } from "@/components/account/ProfileAvatar";
import { PhotoPreviewModal } from "@/components/account/PhotoPreviewModal";
import { useAvatarUpload } from "@/hooks/useAvatarUpload";
import styles from "./account.module.css";

type Props = {
  children: ReactNode;
  title?: string;
  description?: string;
  showWelcome?: boolean;
};

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 4h4l2 5-2.5 1.5a12 12 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2.2 2A17 17 0 0 1 3 6.2 2 2 0 0 1 5 4z" />
    </svg>
  );
}

export function AccountShell({
  children,
  title,
  description,
}: Props) {
  const {
    profile,
    hydrated,
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
    dismissNotice,
  } = useAvatarUpload();

  const name = profile.fullName;

  return (
    <div className={styles.page} data-nav-surface="light">
      <div className={`shell ${styles.shell}`}>
        <header className={styles.profileHeader}>
          <div className={styles.profileMain}>
            <div className={styles.avatarBlock}>
              <span className={styles.avatarRing}>
                <ProfileAvatar size="xl" />
              </span>
              <span
                className={styles.avatarStatus}
                title="Active account"
                aria-hidden="true"
              />
            </div>

            <div className={styles.profileIdentity}>
              <p className={styles.profileOverline}>
                <span className={styles.demoChip}>Demo frontend</span>
              </p>
              <h1 className={styles.profileName}>{name}</h1>
              <ul className={styles.profileContact}>
                <li>
                  <MailIcon />
                  <span>{profile.email || "Email not added"}</span>
                </li>
                <li>
                  <PhoneIcon />
                  <span>{profile.phone || "Phone not added"}</span>
                </li>
              </ul>
              <p className={styles.statusPill}>
                <span className={styles.statusPillDot} aria-hidden="true" />
                Active account
              </p>
            </div>
          </div>

          <div className={styles.profileActions}>
            <Link href="/account/profile" className="btn btn--dark">
              Edit Profile
            </Link>
            <div className={styles.photoActions}>
              <button
                type="button"
                className="btn btn--outline"
                onClick={openPicker}
                disabled={!hydrated || photoBusy}
              >
                {photoBusy
                  ? "Processing…"
                  : hasAvatar
                    ? "Change Photo"
                    : "Upload Photo"}
              </button>
              {hasAvatar ? (
                <button
                  type="button"
                  className={styles.removePhoto}
                  onClick={removePhoto}
                  disabled={!hydrated || photoBusy}
                >
                  Remove
                </button>
              ) : null}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(event) => handleFile(event.target.files?.[0])}
            />
            {photoError ? (
              <p className={styles.photoFeedbackError} role="alert">
                {photoError}
              </p>
            ) : null}
            {photoNotice ? (
              <p className={styles.photoFeedbackOk} role="status">
                <span>{photoNotice}</span>
                <button
                  type="button"
                  className={styles.photoFeedbackDismiss}
                  onClick={dismissNotice}
                  aria-label="Dismiss message"
                >
                  ×
                </button>
              </p>
            ) : null}
          </div>
        </header>

        {title || description ? (
          <div className={styles.pageIntro}>
            {title ? <h2 className={styles.pageTitle}>{title}</h2> : null}
            {description ? (
              <p className={styles.pageDescription}>{description}</p>
            ) : null}
          </div>
        ) : null}

        <div className={styles.layout}>
          <AccountNav />
          <div className={styles.content}>{children}</div>
        </div>

        <p className={styles.footNote}>
          Signed-in demo session stored on this device only. Not connected to
          CRM or ERPNext.
        </p>
      </div>

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
