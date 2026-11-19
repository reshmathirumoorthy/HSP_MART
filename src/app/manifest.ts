import type { MetadataRoute } from "next";

/** Installable app (Add to Home Screen) for customers, partners and suppliers — Blueprint P2 "mobile applications". */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "HSP Mart",
    short_name: "HSP Mart",
    description: "Corporate and personal gifting from HSP Mart, with the partner and supplier portals.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#015C31",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Partner portal", url: "/partner" },
      { name: "My orders", url: "/account/orders" },
      { name: "Supplier portal", url: "/supplier" },
    ],
  };
}
