import {
  productCategories,
  products,
  type Product,
  type ProductCategorySlug,
} from "@/data/products";
import {
  searchProducts,
  type ProductSearchResult,
} from "@/lib/productSearch";
import { isProductCustomizable } from "@/lib/productModel";

function catalogueProductById(productId: string): Product | undefined {
  return products.find((product) => product.id === productId);
}

export const WISHLIST_STORAGE_KEY = "hsp-mart-wishlist";
export const RECENTLY_VIEWED_STORAGE_KEY = "hsp-mart-recently-viewed";
export const RECENT_SEARCHES_STORAGE_KEY = "hsp-mart-recent-searches";
export const COMPARE_STORAGE_KEY = "hsp-mart-compare";

export const MAX_RECENT_SEARCHES = 5;
export const MAX_RECENTLY_VIEWED = 8;
export const MAX_COMPARE = 4;
/** Compact header dropdown limit (full results live on /search). */
export const MAX_SEARCH_PRODUCTS = 8;
export const MAX_RELATED_PRODUCTS = 4;
export const MAX_SIMILAR_PRODUCTS = 4;
/** Minimum similar matches before rendering the section. */
export const MIN_SIMILAR_PRODUCTS = 2;

function sharedTagCount(a: Product, b: Product): number {
  if (!a.tags.length || !b.tags.length) return 0;
  const left = new Set(a.tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean));
  let hits = 0;
  for (const tag of b.tags) {
    const key = tag.trim().toLowerCase();
    if (key && left.has(key)) hits += 1;
  }
  return hits;
}

/**
 * Deterministic relatedness score from catalogue metadata only.
 * Returns 0 when there is no justified relationship (never pads randomly).
 */
export function scoreRelatedProduct(base: Product, other: Product): number {
  if (base.id === other.id || !other.active) return 0;

  let score = 0;
  const sameCategory = other.categorySlug === base.categorySlug;
  const sameSubcategory =
    sameCategory &&
    Boolean(base.subcategory) &&
    other.subcategory === base.subcategory;

  if (sameSubcategory) score += 100;
  else if (sameCategory) score += 40;
  else return 0;

  score += Math.min(sharedTagCount(base, other) * 10, 30);

  if (isProductCustomizable(base) && isProductCustomizable(other)) score += 15;
  if (base.bulkAvailable && other.bulkAvailable) score += 10;
  if (base.visual && other.visual === base.visual) score += 8;

  return score;
}

/**
 * Stricter similarity: same subcategory, or same category with shared tags.
 */
export function scoreSimilarProduct(base: Product, other: Product): number {
  const related = scoreRelatedProduct(base, other);
  if (related <= 0) return 0;

  const sameSubcategory =
    other.categorySlug === base.categorySlug &&
    Boolean(base.subcategory) &&
    other.subcategory === base.subcategory;
  const tagHits = sharedTagCount(base, other);

  if (sameSubcategory) return related;
  if (other.categorySlug === base.categorySlug && tagHits >= 1) return related;
  return 0;
}

function pickByScore(
  product: Product,
  catalogue: Product[],
  scoreFn: (base: Product, other: Product) => number,
  limit: number,
): Product[] {
  return catalogue
    .map((candidate) => ({
      product: candidate,
      score: scoreFn(product, candidate),
    }))
    .filter((entry) => entry.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score || a.product.name.localeCompare(b.product.name),
    )
    .slice(0, limit)
    .map((entry) => entry.product);
}

/** Related products for PDP discovery — same category/subcategory + metadata. */
export function getRelatedProducts(
  product: Product,
  catalogue: Product[] = products,
  limit = MAX_RELATED_PRODUCTS,
): Product[] {
  return pickByScore(product, catalogue, scoreRelatedProduct, limit);
}

/**
 * Similar products — only when metadata supports a stronger match.
 * Pass `excludeIds` (e.g. related products already shown) to avoid duplicates.
 * Callers should hide the section when length < MIN_SIMILAR_PRODUCTS.
 */
export function getSimilarProducts(
  product: Product,
  catalogue: Product[] = products,
  limit = MAX_SIMILAR_PRODUCTS,
  excludeIds: string[] = [],
): Product[] {
  const excluded = new Set(excludeIds);
  return pickByScore(
    product,
    catalogue,
    scoreSimilarProduct,
    limit + excluded.size,
  )
    .filter((item) => !excluded.has(item.id))
    .slice(0, limit);
}

export type CategorySuggestion = {
  slug: Exclude<ProductCategorySlug, "all">;
  label: string;
};

export function sanitizeProductIds(value: unknown, limit = 50): string[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const next: string[] = [];

  for (const entry of value) {
    if (typeof entry !== "string") continue;
    const id = entry.trim();
    if (!id || seen.has(id) || !catalogueProductById(id)) continue;
    seen.add(id);
    next.push(id);
    if (next.length >= limit) break;
  }

  return next;
}

export function sanitizeSearchTerms(value: unknown, limit = MAX_RECENT_SEARCHES): string[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const next: string[] = [];

  for (const entry of value) {
    if (typeof entry !== "string") continue;
    const term = entry.trim().replace(/\s+/g, " ");
    if (!term || term.length > 60) continue;
    const key = term.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    next.push(term);
    if (next.length >= limit) break;
  }

  return next;
}

export function resolveProductsByIds(ids: string[]): Product[] {
  return ids
    .map((id) => catalogueProductById(id))
    .filter((product): product is Product => Boolean(product));
}

export function pushUniqueId(ids: string[], productId: string, limit: number): string[] {
  const next = [productId, ...ids.filter((id) => id !== productId)];
  return next.slice(0, limit);
}

export function getSearchSuggestions(query: string) {
  const trimmed = query.trim();

  if (!trimmed) {
    return {
      products: [] as Product[],
      results: [] as ProductSearchResult[],
      categories: [] as CategorySuggestion[],
      totalCount: 0,
      hasMore: false,
    };
  }

  const allResults = searchProducts(query, { activeOnly: true });
  const results = allResults.slice(0, MAX_SEARCH_PRODUCTS);
  const q = trimmed.toLowerCase();

  const matchedCategories = productCategories
    .filter((category) => category.slug !== "all")
    .filter((category) => {
      const label = category.label.toLowerCase();
      const slug = category.slug.toLowerCase();
      return label.includes(q) || slug.includes(q) || q.includes(slug);
    })
    .map((category) => ({
      slug: category.slug as Exclude<ProductCategorySlug, "all">,
      label: category.label,
    }));

  return {
    products: results.map((result) => result.product),
    results,
    categories: matchedCategories,
    totalCount: allResults.length,
    hasMore: allResults.length > MAX_SEARCH_PRODUCTS,
  };
}

export function readJsonStorage(key: string): unknown {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

export function writeJsonStorage(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore quota / private mode failures.
  }
}
