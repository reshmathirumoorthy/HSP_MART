import type { Metadata } from "next";
import { Suspense } from "react";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Providers } from "@/components/Providers";
import { RfpDrawer } from "@/components/rfp/RfpDrawer";
import "./tailwind.css";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "HSP Mart | Office Supplies, Stationery & Bulk Orders",
    template: "%s | HSP Mart",
  },
  description:
    "Shop stationery, office essentials and gifts from HSP Mart. Everyday purchases, bulk orders and product customization.",
  metadataBase: new URL("https://hspmart.com"),
  applicationName: "HSP Mart",
  icons: {
    icon: [
      { url: "/icon.png", type: "image/png" },
      { url: "/images/hsp-mart-logo.png", type: "image/png" },
    ],
    apple: [{ url: "/images/hsp-mart-logo.png" }],
  },
  openGraph: {
    title: "HSP Mart | Office Supplies, Stationery & Bulk Orders",
    description:
      "Stationery, office essentials, gifting, bulk orders and customization.",
    url: "https://hspmart.com",
    siteName: "HSP Mart",
    type: "website",
    images: [
      {
        url: "/images/hsp-mart-logo.png",
        width: 163,
        height: 137,
        alt: "HSP Mart",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "HSP Mart | Office Supplies, Stationery & Bulk Orders",
    description:
      "Stationery, office essentials, gifting, bulk orders and customization.",
    images: ["/images/hsp-mart-logo.png"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <head>
        {/* Self-hosted variable faces (see @font-face in globals.css). */}
        <link
          rel="preload"
          href="/fonts/bodoni-moda-normal-latin.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/jost-normal-latin.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        <Providers>
          <a href="#main-content" className="skip-link">
            Skip to main content
          </a>
          <AnnouncementBar />
          <Suspense fallback={<div style={{ height: "3.25rem" }} aria-hidden />}>
            <Navbar />
          </Suspense>
          <main id="main-content">{children}</main>
          <Footer />
          <RfpDrawer />
        </Providers>
      </body>
    </html>
  );
}
