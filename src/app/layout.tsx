import type { Metadata } from "next";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Providers } from "@/components/Providers";
import { SiteDataProvider } from "@/components/SiteDataProvider";
import { company } from "@/lib/siteData";
import { loadSiteData } from "@/lib/siteData.server";
import { RfpDrawer } from "@/components/rfp/RfpDrawer";
import "./tailwind.css";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  await loadSiteData();
  const name = company.companyName;
  const title = `${name} | Corporate Gifts, Hampers & Office Supplies`;
  return {
  title: {
    default: title,
    template: `%s | ${name}`,
  },
  description: company.tagline,
  metadataBase: new URL(company.contact.website),
  applicationName: name,
  icons: {
    icon: [
      { url: "/icon.png", type: "image/png" },
      { url: "/images/hsp-mart-logo.png", type: "image/png" },
    ],
    apple: [{ url: "/images/hsp-mart-logo.png" }],
  },
  openGraph: {
    title,
    description: company.tagline,
    url: company.contact.website,
    siteName: name,
    type: "website",
    images: [
      {
        url: "/images/hsp-mart-logo.png",
        width: 163,
        height: 137,
        alt: name,
      },
    ],
  },
  twitter: {
    card: "summary",
    title,
    description: company.tagline,
    images: ["/images/hsp-mart-logo.png"],
  },
};
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const siteData = await loadSiteData();
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
        <SiteDataProvider data={siteData}>
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
        </SiteDataProvider>
      </body>
    </html>
  );
}
