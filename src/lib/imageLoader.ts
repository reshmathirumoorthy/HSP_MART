import type { ImageLoader } from "next/image";

/**
 * Shopify catalogue photos are resized by Shopify's own CDN (`?width=`), so the
 * multi-megabyte originals never pass through the Next image optimiser (which
 * timed out under load). Local assets keep the built-in optimiser.
 */
const shopifyLoader: ImageLoader = ({ src, width }) => {
  const url = new URL(src);
  url.searchParams.set("width", String(width));
  return url.toString();
};

export function shopifyImageLoader(src: unknown): ImageLoader | undefined {
  return typeof src === "string" && src.startsWith("https://cdn.shopify.com/")
    ? shopifyLoader
    : undefined;
}
