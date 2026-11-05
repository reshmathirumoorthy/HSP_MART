"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { OrderCard } from "@/components/account/OrderCard";
import { QuoteCard } from "@/components/account/QuoteCard";
import { useWishlist } from "@/context/WishlistContext";
import { useNotifications } from "@/context/NotificationContext";
import { useAccountAddresses } from "@/context/AccountAddressContext";
import { useAccountProfile } from "@/context/AccountProfileContext";
import { displayOrNotAdded } from "@/lib/accountProfile";
import type { Order, QuoteRequest } from "@/data/account";
import styles from "./account.module.css";

type Props = {
  recentOrders: Order[];
  recentQuotes: QuoteRequest[];
  demoOrderCount: number;
  demoQuoteCount: number;
};

function StatIcon({ children }: { children: ReactNode }) {
  return (
    <span className={styles.statIcon} aria-hidden="true">
      <svg
        viewBox="0 0 24 24"
        width="21"
        height="21"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {children}
      </svg>
    </span>
  );
}

export function AccountDashboard({
  recentOrders,
  recentQuotes,
  demoOrderCount,
  demoQuoteCount,
}: Props) {
  const { profile } = useAccountProfile();
  const { count: wishlistCount, hydrated: wishlistHydrated } = useWishlist();
  const { unreadCount, hydrated: notificationsHydrated } = useNotifications();
  const { addresses, hydrated: addressesHydrated } = useAccountAddresses();

  const stats = [
    {
      label: "Total orders",
      value: String(demoOrderCount),
      href: "/account/orders",
      icon: (
        <>
          <path d="M6 7h12l1.4 12a1.6 1.6 0 0 1-1.6 1.8H6.2A1.6 1.6 0 0 1 4.6 19L6 7Z" />
          <path d="M9 10.5V6a3 3 0 0 1 6 0v4.5" />
        </>
      ),
    },
    {
      label: "Wishlist items",
      value: wishlistHydrated ? String(wishlistCount) : "—",
      href: "/account/wishlist",
      icon: (
        <path d="M12 20s-7.2-4.5-7.2-9.8A4.3 4.3 0 0 1 12 7.4a4.3 4.3 0 0 1 7.2 2.8C19.2 15.5 12 20 12 20Z" />
      ),
    },
    {
      label: "Unread notifications",
      value: notificationsHydrated ? String(unreadCount) : "—",
      href: "/account/notifications",
      icon: (
        <>
          <path d="M6.2 9.5a5.8 5.8 0 0 1 11.6 0c0 4.6 1.7 5.8 1.7 5.8H4.5s1.7-1.2 1.7-5.8Z" />
          <path d="M10.2 19a2 2 0 0 0 3.6 0" />
        </>
      ),
    },
    {
      label: "Saved addresses",
      value: addressesHydrated ? String(addresses.length) : "—",
      href: "/account/addresses",
      icon: (
        <>
          <path d="M12 21s6.3-5.2 6.3-10.6a6.3 6.3 0 1 0-12.6 0C5.7 15.8 12 21 12 21Z" />
          <circle cx="12" cy="10.4" r="2.3" />
        </>
      ),
    },
  ];

  const accountRows = [
    { label: "Name", value: displayOrNotAdded(profile.fullName) },
    { label: "Email", value: displayOrNotAdded(profile.email) },
    { label: "Phone", value: displayOrNotAdded(profile.phone) },
  ];

  return (
    <>
      <section className={styles.stats} aria-label="Account overview">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href} className={styles.stat}>
            <StatIcon>{stat.icon}</StatIcon>
            <span className={styles.statBody}>
              <span className={styles.statLabel}>{stat.label}</span>
              <span className={styles.statValue}>{stat.value}</span>
            </span>
          </Link>
        ))}
      </section>

      <div className={styles.dashGrid}>
        <div className={styles.dashMain}>
          <section aria-labelledby="recent-orders-heading">
            <div className={styles.sectionHead}>
              <h2 id="recent-orders-heading" className={styles.sectionTitle}>
                Recent orders
              </h2>
              <Link href="/account/orders" className={styles.viewAll}>
                View all orders
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12h14" />
                  <path d="m13 6 6 6-6 6" />
                </svg>
              </Link>
            </div>
            {recentOrders.length ? (
              <div className={styles.cardList}>
                {recentOrders.map((order) => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>
            ) : (
              <div className={styles.empty}>
                <h3 className={styles.emptyTitle}>No orders yet</h3>
                <p className={styles.emptyCopy}>
                  Browse the catalogue — your demo order history will appear here.
                </p>
                <Link href="/products" className="btn btn--dark">
                  Browse products
                </Link>
              </div>
            )}
          </section>

          <section aria-labelledby="recent-quotes-heading">
            <div className={styles.sectionHead}>
              <div className={styles.sectionHeadText}>
                <h2 id="recent-quotes-heading" className={styles.sectionTitle}>
                  Recent bulk requests
                </h2>
                <p className={styles.sectionHint}>
                  {demoQuoteCount} saved on this device
                </p>
              </div>
              <Link href="/account/quotes" className={styles.viewAll}>
                View all requests
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12h14" />
                  <path d="m13 6 6 6-6 6" />
                </svg>
              </Link>
            </div>
            {recentQuotes.length ? (
              <div className={styles.cardList}>
                {recentQuotes.map((quote) => (
                  <QuoteCard key={quote.id} quote={quote} />
                ))}
              </div>
            ) : (
              <div className={styles.empty}>
                <h3 className={styles.emptyTitle}>No bulk requests yet</h3>
                <p className={styles.emptyCopy}>
                  Need pricing for a team or a larger order? Start a bulk
                  request and it will appear here.
                </p>
                <Link href="/bulk-quote" className="btn btn--dark">
                  Request a bulk quote
                </Link>
              </div>
            )}
          </section>
        </div>

        <aside className={styles.dashSide}>
          <section
            className={styles.panel}
            aria-labelledby="account-info-heading"
          >
            <div className={styles.sectionHead}>
              <h2 id="account-info-heading" className={styles.sectionTitle}>
                Account information
              </h2>
            </div>
            <dl className={styles.infoList}>
              {accountRows.map((row) => (
                <div key={row.label} className={styles.infoRow}>
                  <dt>{row.label}</dt>
                  <dd>{row.value}</dd>
                </div>
              ))}
            </dl>
            <Link href="/account/profile" className={styles.infoEdit}>
              Edit Profile
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M14.5 5.5 18.5 9.5 8.5 19.5H4.5v-4L14.5 5.5Z" />
                <path d="m12.5 7.5 4 4" />
              </svg>
            </Link>
          </section>

          <div className={styles.helpCard}>
            <p className={styles.helpTitle}>Need help with an order?</p>
            <p className={styles.helpCopy}>
              Our support team can help with tracking, returns and bulk
              enquiries.
            </p>
            <Link href="/contact" className={styles.helpLink}>
              Contact support
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14" />
                <path d="m13 6 6 6-6 6" />
              </svg>
            </Link>
          </div>
        </aside>
      </div>
    </>
  );
}
