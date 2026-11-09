"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { useNotifications } from "@/context/NotificationContext";
import { useRfp } from "@/context/RfpContext";
import { SearchOverlay } from "@/components/search/SearchOverlay";
import { NotificationPanel } from "@/components/notifications/NotificationPanel";
import { ProductsNavLink } from "@/components/ProductsNavLink";
import { productCategories } from "@/data/categories";
import { trapTabKey } from "@/lib/focusTrap";
import styles from "./Navbar.module.css";

const categoryLinks = productCategories
  .filter((c) => c.slug !== "all")
  .map((c) => ({
    slug: c.slug,
    href: `/products?category=${c.slug}`,
    label: c.label,
  }));

const shopLinks = [
  { href: "/products", label: "Products" },
  ...categoryLinks,
  { href: "/bulk-quote", label: "Bulk Orders" },
];

const exploreLinks = [
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/faq", label: "FAQ" },
];

const accountLinks = [
  { href: "/account", label: "Account" },
  { href: "/wishlist", label: "Wishlist" },
  { href: "/compare", label: "Compare" },
  { href: "/account/orders", label: "Orders" },
  { href: "/account/notifications", label: "Notifications" },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { cartCount, openCart, hydrated } = useCart();
  const { count: wishlistCount, hydrated: wishlistHydrated } = useWishlist();
  const { unreadCount, hydrated: notificationsHydrated } = useNotifications();
  const { items: rfpItems, openRfp, toggleRfp } = useRfp();
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const notifWrapRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  const countLabel = hydrated && cartCount > 0 ? String(cartCount) : null;
  const wishlistLabel =
    wishlistHydrated && wishlistCount > 0 ? String(wishlistCount) : null;
  const unreadLabel =
    notificationsHydrated && unreadCount > 0 ? String(unreadCount) : null;
  const rfpCount = rfpItems.length;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!notifOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!notifWrapRef.current?.contains(event.target as Node)) {
        setNotifOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setNotifOpen(false);
        bellRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [notifOpen]);

  useEffect(() => {
    if (!open) return;
    if (typeof window === "undefined") return;
    // Lock the document scroller (html) rather than body: body overflow
    // hidden re-parents the sticky navbar into a clip container whose
    // scrollTop is 0, flinging the header off-screen.
    const docEl = document.documentElement;
    const scrollbarWidth = window.innerWidth - docEl.clientWidth;
    const previousOverflow = docEl.style.overflow;
    const previousPaddingRight = docEl.style.paddingRight;
    docEl.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      docEl.style.paddingRight = `${scrollbarWidth}px`;
    }
    return () => {
      docEl.style.overflow = previousOverflow;
      docEl.style.paddingRight = previousPaddingRight;
    };
  }, [open]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        menuBtnRef.current?.focus();
      }
      if (panelRef.current) trapTabKey(event, panelRef.current);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const [routePath, setRoutePath] = useState(pathname);
  if (routePath !== pathname) {
    setRoutePath(pathname);
    setOpen(false);
    setNotifOpen(false);
  }

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    const q = query.trim();
    if (!q) {
      setSearchOpen(true);
      return;
    }
    router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <>
      <header
        className={`${styles.header} ${scrolled ? styles.scrolled : ""}`}
        role="banner"
      >
        <div className={`shell ${styles.bar}`}>
          <Link
            href="/"
            className={styles.brand}
            aria-label="HSP Mart home"
            onClick={() => setOpen(false)}
          >
            <Image
              src="/images/hsp-mart-logo.png"
              alt=""
              width={32}
              height={27}
              className={styles.logo}
              priority
            />
            <span className={styles.wordmark}>HSP Mart</span>
          </Link>

          <nav className={styles.primaryNav} aria-label="Main navigation">
            <Link
              href="/"
              className={`${styles.navLink} ${pathname === "/" ? styles.navLinkActive : ""}`}
              aria-current={pathname === "/" ? "page" : undefined}
              onClick={() => setOpen(false)}
            >
              Home
            </Link>
            <ProductsNavLink onNavigate={() => setOpen(false)} />
            <Link
              href="/products?category=stationery"
              className={styles.navLink}
              onClick={() => setOpen(false)}
            >
              Categories
            </Link>
            <Link
              href="/products?category=gifts"
              className={styles.navLink}
              onClick={() => setOpen(false)}
            >
              Gifting
            </Link>
            <Link
              href="/about"
              className={styles.navLink}
              onClick={() => setOpen(false)}
            >
              About Us
            </Link>
            <Link
              href="/contact"
              className={styles.navLink}
              onClick={() => setOpen(false)}
            >
              Contact
            </Link>
          </nav>

          <form className={styles.search} onSubmit={submitSearch} role="search">
            <span className={styles.searchIcon} aria-hidden>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.7" />
                <path d="M16 16l4 4" stroke="currentColor" strokeWidth="1.7" />
              </svg>
            </span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products…"
              className={styles.searchInput}
              aria-label="Search products"
            />
          </form>

          <div className={styles.actions}>
            <Link
              href="/account"
              className={styles.iconBtn}
              aria-label="Account"
              onClick={() => setOpen(false)}
            >
              <AccountIcon />
            </Link>

            <Link
              href="/wishlist"
              className={styles.iconBtn}
              suppressHydrationWarning
              aria-label={
                wishlistLabel
                  ? `Wishlist, ${wishlistLabel} items`
                  : "Wishlist"
              }
              onClick={() => setOpen(false)}
            >
              <HeartIcon />
              <span
                className={styles.badge}
                aria-hidden={!wishlistLabel}
                suppressHydrationWarning
              >
                {wishlistLabel}
              </span>
            </Link>

            <div className={styles.notifWrap} ref={notifWrapRef}>
              <button
                ref={bellRef}
                type="button"
                className={styles.iconBtn}
                suppressHydrationWarning
                aria-label={
                  unreadLabel
                    ? `Notifications, ${unreadLabel} unread`
                    : "Notifications"
                }
                aria-expanded={notifOpen}
                aria-controls={notifOpen ? "header-notifications" : undefined}
                onClick={() => setNotifOpen((value) => !value)}
              >
                <BellIcon />
                {unreadLabel ? (
                  <span className={styles.badge} suppressHydrationWarning>
                    {unreadLabel}
                  </span>
                ) : null}
              </button>
              {notifOpen ? (
                <NotificationPanel
                  id="header-notifications"
                  onClose={() => setNotifOpen(false)}
                />
              ) : null}
            </div>

            <Link
              href="/compare"
              className={styles.iconBtn}
              aria-label="Compare products"
              onClick={() => setOpen(false)}
            >
              <CompareIcon />
            </Link>

            <button
              type="button"
              className={styles.iconBtn}
              suppressHydrationWarning
              aria-label={
                countLabel ? `Open cart, ${countLabel} items` : "Open cart"
              }
              onClick={openCart}
            >
              <CartIcon />
              <span
                className={styles.badge}
                aria-hidden={!countLabel}
                suppressHydrationWarning
              >
                {countLabel}
              </span>
            </button>

            <button
              ref={menuBtnRef}
              type="button"
              className={styles.menuBtn}
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              aria-controls={panelId}
              onClick={() => setOpen((v) => !v)}
            >
              <span />
              <span />
            </button>
          </div>
        </div>
      </header>

      <div
        id={panelId}
        ref={panelRef}
        className={`${styles.mobilePanel} ${open ? styles.mobileOpen : ""}`}
        aria-hidden={!open}
        {...(!open ? { inert: true as const } : {})}
      >
        <div className={styles.mobileHeader}>
          <Link
            href="/"
            className={styles.mobileBrand}
            aria-label="HSP Mart home"
            onClick={() => setOpen(false)}
          >
            <Image
              src="/images/hsp-mart-logo.png"
              alt=""
              width={32}
              height={27}
              className={styles.logo}
            />
            <span className={styles.wordmark}>HSP Mart</span>
          </Link>
          <button
            type="button"
            className={styles.mobileClose}
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          >
            <CloseIcon />
          </button>
        </div>

        <div className={styles.mobileScroll}>
          <nav className={styles.mobileSection} aria-label="Shop">
            <p className={styles.sectionLabel}>Shop</p>
            <ul className={styles.mobileList}>
              {shopLinks.map((link) => (
                <li key={link.href + link.label}>
                  <Link
                    href={link.href}
                    className={styles.mobileLink}
                    tabIndex={open ? 0 : -1}
                    onClick={() => setOpen(false)}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav className={styles.mobileSection} aria-label="Explore">
            <p className={styles.sectionLabel}>Explore</p>
            <ul className={styles.mobileList}>
              {exploreLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={styles.mobileLink}
                    tabIndex={open ? 0 : -1}
                    onClick={() => setOpen(false)}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav className={styles.mobileSection} aria-label="My account">
            <p className={styles.sectionLabel}>My account</p>
            <ul className={styles.mobileList}>
              {accountLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={styles.mobileLink}
                    tabIndex={open ? 0 : -1}
                    onClick={() => setOpen(false)}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className={styles.mobileCta}
              tabIndex={open ? 0 : -1}
              onClick={() => {
                setOpen(false);
                openRfp();
              }}
            >
              View bulk quote list
              {rfpCount > 0 ? ` (${rfpCount})` : ""}
            </button>
          </nav>
        </div>
      </div>

      {open ? (
        <button
          type="button"
          className={styles.backdrop}
          aria-label="Close menu"
          onClick={() => setOpen(false)}
        />
      ) : null}

      {searchOpen ? (
        <SearchOverlay open onClose={() => setSearchOpen(false)} />
      ) : null}
    </>
  );
}

function AccountIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="8" r="3.25" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M5.5 19.2c1.4-3 3.8-4.5 6.5-4.5s5.1 1.5 6.5 4.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 20s-7-4.35-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.65-7 10-7 10Z"
        stroke="currentColor"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 6h2.2l1.4 10h10.8l1.6-7H7"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <circle cx="10" cy="19" r="1.2" fill="currentColor" />
      <circle cx="17" cy="19" r="1.2" fill="currentColor" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6.3 9.6a5.7 5.7 0 0 1 11.4 0c0 4.5 1.7 5.7 1.7 5.7H4.6s1.7-1.2 1.7-5.7Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M10.2 19a2 2 0 0 0 3.6 0"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CompareIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M7 4v16M17 4v16M4 8h6M14 16h6"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function BriefcaseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="3"
        y="7"
        width="18"
        height="13"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"
        stroke="currentColor"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}