import type { NextConfig } from "next";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

// Security headers for every response. The Content-Security-Policy is set per request (with a nonce) in src/proxy.ts.
const SECURITY_HEADERS = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(self \"https://checkout.razorpay.com\")" },
  // Browsers ignore HSTS over plain http, so this is safe locally and takes effect behind TLS.
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
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
