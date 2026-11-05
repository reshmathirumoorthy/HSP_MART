"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import styles from "./account.module.css";

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      className={styles.navIcon}
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const links = [
  {
    href: "/account",
    label: "Overview",
    exact: true,
    icon: (
      <Icon>
        <path d="M4 11.5 12 4l8 7.5" />
        <path d="M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9" />
      </Icon>
    ),
  },
  {
    href: "/account/profile",
    label: "My Profile",
    icon: (
      <Icon>
        <circle cx="12" cy="8" r="3.6" />
        <path d="M5 20a7 7 0 0 1 14 0" />
      </Icon>
    ),
  },
  {
    href: "/account/orders",
    label: "My Orders",
    icon: (
      <Icon>
        <path d="M6 7h12l1.5 13a1.5 1.5 0 0 1-1.5 1.7H6A1.5 1.5 0 0 1 4.5 20L6 7Z" />
        <path d="M9 10.5V6a3 3 0 0 1 6 0v4.5" />
      </Icon>
    ),
  },
  {
    href: "/account/wishlist",
    label: "Wishlist",
    icon: (
      <Icon>
        <path d="M12 20s-7.2-4.5-7.2-9.8A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.2 10c0 5.3-7.2 10-7.2 10Z" />
      </Icon>
    ),
  },
  {
    href: "/account/addresses",
    label: "Saved Addresses",
    icon: (
      <Icon>
        <path d="M12 21s6.3-5.2 6.3-10.6a6.3 6.3 0 1 0-12.6 0C5.7 15.8 12 21 12 21Z" />
        <circle cx="12" cy="10.4" r="2.3" />
      </Icon>
    ),
  },
  {
    href: "/account/notifications",
    label: "Notifications",
    icon: (
      <Icon>
        <path d="M6.2 9.5a5.8 5.8 0 0 1 11.6 0c0 4.6 1.7 5.8 1.7 5.8H4.5s1.7-1.2 1.7-5.8Z" />
        <path d="M10.2 19a2 2 0 0 0 3.6 0" />
      </Icon>
    ),
  },
  {
    href: "/account/quotes",
    label: "Bulk Requests",
    icon: (
      <Icon>
        <path d="M8 4h9a1.5 1.5 0 0 1 1.5 1.5V17" />
        <rect x="4.5" y="8" width="12" height="12.5" rx="1.8" />
        <path d="M8 12.5h5M8 16h3" />
      </Icon>
    ),
  },
];

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function LogoutIcon() {
  return (
    <svg
      className={styles.navIcon}
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14 4H7a1.5 1.5 0 0 0-1.5 1.5v13A1.5 1.5 0 0 0 7 20h7" />
      <path d="m17 8.5 3.5 3.5-3.5 3.5" />
      <path d="M20.5 12H11" />
    </svg>
  );
}

function LogoutControls({
  confirmLogout,
  setConfirmLogout,
  onConfirm,
}: {
  confirmLogout: boolean;
  setConfirmLogout: (value: boolean) => void;
  onConfirm: () => void;
}) {
  if (!confirmLogout) {
    return (
      <button
        type="button"
        className={styles.signOut}
        onClick={() => setConfirmLogout(true)}
      >
        <LogoutIcon />
        <span>Logout</span>
      </button>
    );
  }

  return (
    <div className={styles.logoutConfirm} role="group" aria-label="Confirm logout">
      <p className={styles.logoutCopy}>
        Leave the demo account? Cart and wishlist stay on this device.
      </p>
      <div className={styles.logoutActions}>
        <button type="button" className={styles.signOut} onClick={onConfirm}>
          Confirm logout
        </button>
        <button
          type="button"
          className={styles.ghost}
          onClick={() => setConfirmLogout(false)}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export function AccountNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [confirmLogout, setConfirmLogout] = useState(false);

  const activeHref =
    links.find((link) => isActive(pathname, link.href, link.exact))?.href ??
    "/account";

  const confirm = () => {
    setConfirmLogout(false);
    router.push("/");
  };

  return (
    <div className={styles.navWrap}>
      <label className={styles.mobileNavLabel} htmlFor="account-nav-select">
        Account section
      </label>
      <select
        id="account-nav-select"
        className={styles.mobileNavSelect}
        value={activeHref}
        onChange={(event) => router.push(event.target.value)}
        aria-label="Account navigation"
      >
        {links.map((link) => (
          <option key={link.href} value={link.href}>
            {link.label}
          </option>
        ))}
      </select>

      <div className={styles.mobileLogout}>
        <LogoutControls
          confirmLogout={confirmLogout}
          setConfirmLogout={setConfirmLogout}
          onConfirm={confirm}
        />
      </div>

      <nav className={styles.nav} aria-label="Account">
        <p className={styles.navSectionLabel}>My account</p>
        <ul className={styles.navList}>
          {links.map((link) => {
            const active = isActive(pathname, link.href, link.exact);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`${styles.navLink} ${active ? styles.navLinkActive : ""}`}
                  aria-current={active ? "page" : undefined}
                >
                  {link.icon}
                  <span>{link.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        <div className={styles.desktopLogout}>
          <LogoutControls
            confirmLogout={confirmLogout}
            setConfirmLogout={setConfirmLogout}
            onConfirm={confirm}
          />
        </div>
      </nav>
    </div>
  );
}
