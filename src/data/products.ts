/**
 * HSP Mart product catalogue — served by the backend (/api/site-data) and managed in the admin app.
 * `products` is filled from the backend before rendering (see src/lib/siteData.ts).
 */

import { previewProducts, productCategories, products } from "@/lib/siteData";
import type { PriceRangeKey, Product, SortOption } from "@/types/product";

export type {
  FilterState,
  PriceRangeKey,
  Product,
  ProductCategorySlug,
  ProductTone,
  ProductVisualKind,
  SortOption,
} from "@/types/product";

export { previewProducts, productCategories, products };

export const priceRanges: { key: PriceRangeKey; label: string }[] = [
  { key: "all", label: "All prices" },
  { key: "under-500", label: "Under ₹500" },
  { key: "500-1000", label: "₹500–₹1,000" },
  { key: "1000-2000", label: "₹1,000–₹2,000" },
  { key: "2000-plus", label: "₹2,000+" },
];

export const sortOptions: { key: SortOption; label: string }[] = [
  { key: "featured", label: "Featured" },
  { key: "price-asc", label: "Price: Low to High" },
  { key: "price-desc", label: "Price: High to Low" },
  { key: "name-asc", label: "Name: A–Z" },
];

/** Deterministic Indian-grouping formatter — avoids SSR/client locale mismatches. */
function formatInrAmount(price: number): string {
  const rounded = Math.round(price);
  const sign = rounded < 0 ? "-" : "";
  const digits = String(Math.abs(rounded));
  if (digits.length <= 3) return `${sign}${digits}`;

  let result = digits.slice(-3);
  let rest = digits.slice(0, -3);
  while (rest.length > 0) {
    result = `${rest.slice(-2)},${result}`;
    rest = rest.slice(0, -2);
  }
  return `${sign}${result}`;
}

export function formatPrice(price: number, currency: Product["currency"] = "INR"): string {
  if (currency !== "INR") {
    return `${currency} ${formatInrAmount(price)}`;
  }
  return `₹${formatInrAmount(price)}`;
}

/** Customer-facing price for a product; handles price-on-request items. */
export function productPriceLabel(
  product: Pick<Product, "price" | "currency" | "priceOnRequest">,
): string {
  if (product.priceOnRequest || product.price <= 0) return "Price on request";
  return formatPrice(product.price, product.currency);
}

export function getActiveProducts(source: Product[] = products): Product[] {
  return source.filter((product) => product.active);
}
