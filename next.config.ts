import type { NextConfig } from "next";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

const nextConfig: NextConfig = {
  // E2E drives the dev server via 127.0.0.1; allow its HMR origin so client hydration is stable.
  allowedDevOrigins: ["127.0.0.1"],
  // Every /api/* request (webhooks, file downloads, exports, cron, storefront calls) is served by
  // the FastAPI backend.
  async rewrites() {
    return { beforeFiles: [], afterFiles: [], fallback: [{ source: "/api/:path*", destination: `${BACKEND_URL}/api/:path*` }] };
  },
  images: {
    // Allow product-image cache tags (`?v=…`) after asset regeneration.
    // Omit `search` so any query is accepted for these local paths.
    localPatterns: [
      { pathname: "/images/products/**" },
      { pathname: "/images/**" },
    ],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        // Production catalogue images (hspmart.com is a Shopify storefront).
        protocol: "https",
        hostname: "cdn.shopify.com",
        pathname: "/s/files/**",
      },
    ],
  },
};

export default nextConfig;
