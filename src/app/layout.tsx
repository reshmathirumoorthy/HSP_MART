import type { Metadata } from "next";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Providers } from "@/components/Providers";
import { RfpDrawer } from "@/components/rfp/RfpDrawer";
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
        {/* Loaded via CSS instead of next/font/google — Turbopack's Google
            font resolver is currently broken for multi-face families. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=Instrument+Serif&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>
          <a href="#main-content" className="skip-link">
            Skip to main content
          </a>
          <AnnouncementBar />
          <Navbar />
          <main id="main-content">{children}</main>
          <Footer />
          <RfpDrawer />
        </Providers>
      </body>
    </html>
  );
}
