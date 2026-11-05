/** Bump when regenerated cutouts need a hard browser/CDN cache refresh. */
export const PRODUCT_IMAGE_CACHE_TAG = "full-visible-v12";

/**
 * Prefer transparent PNG cutouts under /images/products/transparent/.
 * Catalogue paths in product data stay unchanged; cutouts are derived assets.
 */
export function toTransparentCutoutSrc(src: string): string {
  if (!src.startsWith("/images/products/")) return src;
  if (src.includes("/transparent/")) return src;

  // /images/products/variants/foo.jpg -> /images/products/transparent/variants/foo.png
  if (src.startsWith("/images/products/variants/")) {
    const base = src
      .slice("/images/products/variants/".length)
      .replace(/\.[^.]+$/, "");
    return `/images/products/transparent/variants/${base}.png`;
  }

  // /images/products/foo.jpg -> /images/products/transparent/foo.png
  const file = src.slice("/images/products/".length);
  if (file.includes("/")) return src;
  const base = file.replace(/\.[^.]+$/, "");
  return `/images/products/transparent/${base}.png`;
}

export function withProductImageCacheTag(src: string): string {
  if (!src.startsWith("/images/products/")) return src;
  const sep = src.includes("?") ? "&" : "?";
  return `${src}${sep}v=${PRODUCT_IMAGE_CACHE_TAG}`;
}

/** Transparent cutout URL with cache tag for product cards and galleries. */
export function productDisplayImageSrc(src: string): string {
  return withProductImageCacheTag(toTransparentCutoutSrc(src));
}

/** Original catalogue image URL with cache tag — for PDP main gallery where the product should fill the frame. */
export function productOriginalImageSrc(src: string): string {
  return withProductImageCacheTag(src);
}
