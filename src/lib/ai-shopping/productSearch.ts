/**
 * Catalogue search for HSP AI — wraps existing productSearch + catalogue filters.
 * Never invents products.
 */

import { products } from "@/data/products";
import { filterProducts, sortProducts } from "@/lib/catalogue";
import { isProductCustomizable } from "@/lib/productModel";
import { searchProducts } from "@/lib/productSearch";
import type { Product, ProductCategorySlug, SortOption } from "@/types/product";
import type { AssistantSort, ParsedQuery } from "./types";

export type AssistantSearchOptions = {
  limit?: number;
  source?: Product[];
};

function toCatalogueSort(sort: AssistantSort): SortOption {
  switch (sort) {
    case "price-asc":
      return "price-asc";
    case "price-desc":
      return "price-desc";
    case "name-asc":
      return "name-asc";
    default:
      return "featured";
  }
}

function matchesColor(product: Product, color: string): boolean {
  const haystack = [
    product.name,
    product.shortDescription,
    product.description,
    product.slug,
    ...product.tags,
    ...(product.customization?.variants?.map((v) => v.label) ?? []),
    ...(product.customization?.variants?.map((v) => v.id) ?? []),
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(color.toLowerCase());
}

function applyPriceBounds(
  list: Product[],
  priceMin?: number,
  priceMax?: number,
): Product[] {
  return list.filter((product) => {
    if (priceMin !== undefined && product.price < priceMin) return false;
    if (priceMax !== undefined && product.price > priceMax) return false;
    return true;
  });
}

/**
 * Search / filter the real catalogue based on a parsed assistant query.
 */
export function searchCatalogueForAssistant(
  query: ParsedQuery,
  options: AssistantSearchOptions = {},
): Product[] {
  const limit = options.limit ?? 6;
  const source = (options.source ?? products).filter((p) => p.active);

  // Treat "best sellers" / "featured" phrasing as a featured-flag filter on
  // the real catalogue instead of a literal keyword match.
  const FEATURED_TOKENS = new Set([
    "featured",
    "feature",
    "best",
    "bestseller",
    "bestsellers",
    "seller",
    "sellers",
    "popular",
    "top",
  ]);
  const originalTerms = query.searchTerms.trim();
  const termTokens = originalTerms.toLowerCase().split(/\s+/).filter(Boolean);
  const featuredOnly = termTokens.some((token) => FEATURED_TOKENS.has(token));
  // Generic catalogue words carry no search signal, but only drop them for
  // pure featured queries so other searches behave exactly as before.
  const GENERIC_TOKENS = new Set([
    "product",
    "products",
    "item",
    "items",
    "thing",
    "things",
    "stuff",
    "catalogue",
    "catalog",
  ]);
  const effectiveTerms = featuredOnly
    ? termTokens
        .filter((token) => !FEATURED_TOKENS.has(token) && !GENERIC_TOKENS.has(token))
        .join(" ")
    : originalTerms;

  let results: Product[] = [];

  if (effectiveTerms.trim()) {
    const ranked = searchProducts(effectiveTerms, {
      source,
      limit: 24,
      activeOnly: true,
    });
    results = ranked.map((entry) => entry.product);
  }

  if (featuredOnly) {
    if (results.length === 0) {
      results = source.filter((product) => product.featured);
      results = sortProducts(results, "featured");
    } else {
      results = results.filter((product) => product.featured);
    }
  }

  if (results.length === 0 && query.categorySlug) {
    results = filterProducts(source, {
      category: query.categorySlug as ProductCategorySlug,
      subcategory: "",
      search: "",
      priceRange: "all",
      inStockOnly: false,
      customizableOnly: query.customizableOnly,
      bulkOnly: query.bulkOnly,
      sort: toCatalogueSort(query.sort),
    });
  }

  if (results.length === 0 && !query.searchTerms.trim()) {
    results = filterProducts(source, {
      category: (query.categorySlug as ProductCategorySlug) ?? "all",
      subcategory: "",
      search: "",
      priceRange: "all",
      inStockOnly: false,
      customizableOnly: query.customizableOnly,
      bulkOnly: query.bulkOnly,
      sort: toCatalogueSort(query.sort),
    });
  }

  if (query.categorySlug) {
    results = results.filter((p) => p.categorySlug === query.categorySlug);
  }

  if (query.customizableOnly) {
    results = results.filter((p) => isProductCustomizable(p));
  }

  if (query.bulkOnly) {
    results = results.filter((p) => p.bulkAvailable);
  }

  if (query.color) {
    const colored = results.filter((p) => matchesColor(p, query.color!));
    // Only apply color filter when at least one catalogue match exists —
    // otherwise keep broader results and let the response explain.
    if (colored.length > 0) results = colored;
  }

  results = applyPriceBounds(results, query.priceMin, query.priceMax);

  if (query.sort !== "relevance") {
    results = sortProducts(results, toCatalogueSort(query.sort));
  }

  // Deduplicate while preserving rank order.
  const seen = new Set<string>();
  const unique: Product[] = [];
  for (const product of results) {
    if (seen.has(product.id)) continue;
    seen.add(product.id);
    unique.push(product);
  }

  return unique.slice(0, limit);
}

/**
 * Soft fallback when exact search is empty — nearest category / stationery.
 */
export function findAlternativeProducts(
  query: ParsedQuery,
  excludeIds: string[] = [],
  limit = 4,
): Product[] {
  const source = products.filter(
    (p) => p.active && !excludeIds.includes(p.id),
  );

  if (query.categorySlug) {
    const categoryHits = filterProducts(source, {
      category: query.categorySlug as ProductCategorySlug,
      subcategory: "",
      search: "",
      priceRange: "all",
      inStockOnly: false,
      customizableOnly: false,
      bulkOnly: false,
      sort: "featured",
    }).slice(0, limit);
    if (categoryHits.length) return categoryHits;
  }

  const priced = applyPriceBounds(
    source,
    query.priceMin,
    query.priceMax,
  ).slice(0, limit);
  if (priced.length) return priced;

  return filterProducts(source, {
    category: "stationery",
    subcategory: "",
    search: "",
    priceRange: "all",
    inStockOnly: false,
    customizableOnly: false,
    bulkOnly: false,
    sort: "featured",
  }).slice(0, limit);
}
