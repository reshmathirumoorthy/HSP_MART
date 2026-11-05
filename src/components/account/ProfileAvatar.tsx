"use client";

import { useAccountProfile } from "@/context/AccountProfileContext";
import styles from "./account.module.css";

type Props = {
  size?: "xl" | "lg" | "sm";
  className?: string;
};

function initialsFor(fullName: string, firstName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return (firstName || "?").slice(0, 2).toUpperCase();
  const first = parts[0].charAt(0);
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : "";
  return (first + last).toUpperCase() || "?";
}

export function ProfileAvatar({ size = "lg", className }: Props) {
  const { profile } = useAccountProfile();
  const classes = [
    styles.avatar,
    size === "xl"
      ? styles.avatarXl
      : size === "lg"
        ? styles.avatarLg
        : styles.avatarSm,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (profile.avatar) {
    return (
      // Data URL from local upload — plain <img>; next/image rejects data URLs.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        className={`${classes} ${styles.avatarImg}`}
        src={profile.avatar}
        alt={`${profile.fullName} profile photo`}
      />
    );
  }

  return (
    <span
      className={`${classes} ${styles.avatarInitials}`}
      role="img"
      aria-label={`${profile.fullName || "Customer"} avatar`}
    >
      {initialsFor(profile.fullName, profile.firstName)}
    </span>
  );
}
