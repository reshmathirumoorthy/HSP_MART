"use client";

import Link from "next/link";
import { Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import styles from "./Navbar.module.css";

type Props = {
  onNavigate?: () => void;
};

/**
 * "Products" nav link. Isolated into its own Suspense boundary so the
 * `useSearchParams` read does not de-opt the whole navbar into client-side
 * rendering on statically generated pages.
 */
function ProductsNavLinkInner({ onNavigate }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = pathname.startsWith("/products") && !searchParams.get("category");
  return (
    <Link
      href="/products"
      className={`${styles.navLink} ${active ? styles.navLinkActive : ""}`}
      onClick={onNavigate}
    >
      Products
    </Link>
  );
}

function ProductsNavLinkFallback({ onNavigate }: Props) {
  return (
    <Link href="/products" className={styles.navLink} onClick={onNavigate}>
      Products
    </Link>
  );
}

export function ProductsNavLink({ onNavigate }: Props) {
  return (
    <Suspense fallback={<ProductsNavLinkFallback onNavigate={onNavigate} />}>
      <ProductsNavLinkInner onNavigate={onNavigate} />
    </Suspense>
  );
}
