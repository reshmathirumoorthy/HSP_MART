import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
    ],
  },
};

export default nextConfig;
