/**
 * Phase 12A — storefront search foundation.
 * In-memory, deterministic ranking over the local product catalogue.
 * Not an external search service.
 */

import { products } from "@/data/products";
import type { Product, StockStatus } from "@/types/product";
import { isProductCustomizable } from "@/lib/productModel";

export type ProductSearchMatchKind =
  | "name-exact"
  | "name-starts"
  | "name-contains"
  | "sku-exact"
  | "sku-partial"
  | "category-exact"
  | "subcategory-exact"
  | "metadata";

/** Compact result shape for search UIs (reuses Product for visuals). */
export type ProductSearchResult = {
  product: Product;
  matchKind: ProductSearchMatchKind;
  href: string;
  name: string;
  sku: string;
  price: number;
  stockStatus: StockStatus;
  primaryImage?: string;
  category: string;
  subcategory?: string;
  customizable: boolean;
};

export type SearchProductsOptions = {
  source?: Product[];
  limit?: number;
  activeOnly?: boolean;
};

const MATCH_RANK: Record<ProductSearchMatchKind, number> = {
  "name-exact": 0,
  "name-starts": 1,
  "name-contains": 2,
  "sku-exact": 3,
  "sku-partial": 4,
  "category-exact": 5,
  "subcategory-exact": 6,
  metadata: 7,
};

/**
 * Normalize a user query for case-/whitespace-/punctuation-tolerant matching.
 * Keeps alphanumerics so SKUs like HSP-DSK-006 remain searchable.
 */
export function normalizeSearchQuery(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Compact form for equality / starts-with checks (no spaces). */
export function compactSearchToken(value: string): string {
  return normalizeSearchQuery(value).replace(/\s+/g, "");
}

type SearchDocument = {
  product: Product;
  name: string;
  nameCompact: string;
  sku: string;
  skuCompact: string;
  category: string;
  categoryCompact: string;
  subcategory: string;
  subcategoryCompact: string;
  metadata: string;
  metadataCompact: string;
};

function buildDocument(product: Product): SearchDocument {
  const name = normalizeSearchQuery(product.name);
  const sku = normalizeSearchQuery(product.sku);
  const category = normalizeSearchQuery(product.category);
  const subcategory = normalizeSearchQuery(product.subcategory ?? "");
  const metadata = normalizeSearchQuery(
    [
      product.shortDescription,
      product.description,
      product.brand ?? "",
      product.badge ?? "",
      ...product.tags,
      ...(product.customizationTypes ?? []),
    ].join(" "),
  );

  return {
    product,
    name,
    nameCompact: name.replace(/\s+/g, ""),
    sku,
    skuCompact: sku.replace(/\s+/g, ""),
    category,
    categoryCompact: category.replace(/\s+/g, ""),
    subcategory,
    subcategoryCompact: subcategory.replace(/\s+/g, ""),
    metadata,
    metadataCompact: metadata.replace(/\s+/g, ""),
  };
}

let documentCache: SearchDocument[] | null = null;
let documentSource: Product[] | null = null;

function getDocuments(source: Product[]): SearchDocument[] {
  if (documentSource === source && documentCache) return documentCache;
  documentSource = source;
  documentCache = source.map(buildDocument);
  return documentCache;
}

function classifyMatch(
  doc: SearchDocument,
  query: string,
  queryCompact: string,
): ProductSearchMatchKind | null {
  if (!query) return null;

  if (doc.name === query || doc.nameCompact === queryCompact) return "name-exact";
  if (doc.name.startsWith(query) || doc.nameCompact.startsWith(queryCompact)) {
    return "name-starts";
  }
  if (doc.name.includes(query) || doc.nameCompact.includes(queryCompact)) {
    return "name-contains";
  }

  if (doc.sku === query || doc.skuCompact === queryCompact) return "sku-exact";
  if (doc.sku.includes(query) || doc.skuCompact.includes(queryCompact)) {
    return "sku-partial";
  }

  if (
    doc.category === query ||
    doc.categoryCompact === queryCompact ||
    doc.product.categorySlug === query
  ) {
    return "category-exact";
  }
  if (
    doc.subcategory &&
    (doc.subcategory === query || doc.subcategoryCompact === queryCompact)
  ) {
    return "subcategory-exact";
  }

  if (
    doc.category.includes(query) ||
    doc.categoryCompact.includes(queryCompact) ||
    doc.subcategory.includes(query) ||
    doc.subcategoryCompact.includes(queryCompact) ||
    doc.metadata.includes(query) ||
    doc.metadataCompact.includes(queryCompact)
  ) {
    return "metadata";
  }

  return null;
}

export function productMatchesSearch(product: Product, query: string): boolean {
  const normalized = normalizeSearchQuery(query);
  if (!normalized) return true;
  const match = classifyMatch(
    buildDocument(product),
    normalized,
    compactSearchToken(query),
  );
  return match !== null;
}

export function toProductSearchResult(
  product: Product,
  matchKind: ProductSearchMatchKind,
): ProductSearchResult {
  return {
    product,
    matchKind,
    href: `/products/${product.slug}`,
    name: product.name,
    sku: product.sku,
    price: product.price,
    stockStatus: product.stockStatus,
    primaryImage: product.images[0],
    category: product.category,
    subcategory: product.subcategory,
    customizable: isProductCustomizable(product),
  };
}

/**
 * Ranked product search. Empty query returns no results (callers that want
 * the full catalogue should use filterProducts / products directly).
 */
export function searchProducts(
  query: string,
  options: SearchProductsOptions = {},
): ProductSearchResult[] {
  const {
    source = products,
    limit,
    activeOnly = true,
  } = options;

  const normalized = normalizeSearchQuery(query);
  if (!normalized) return [];

  const queryCompact = compactSearchToken(query);
  const docs = getDocuments(source);
  const ranked: ProductSearchResult[] = [];

  for (const doc of docs) {
    if (activeOnly && !doc.product.active) continue;
    const matchKind = classifyMatch(doc, normalized, queryCompact);
    if (!matchKind) continue;
    ranked.push(toProductSearchResult(doc.product, matchKind));
  }

  ranked.sort((a, b) => {
    const rankDelta = MATCH_RANK[a.matchKind] - MATCH_RANK[b.matchKind];
    if (rankDelta !== 0) return rankDelta;
    if (a.product.featured !== b.product.featured) {
      return a.product.featured ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });

  return typeof limit === "number" ? ranked.slice(0, limit) : ranked;
}

/**
 * Lightweight match context for search UIs.
 * Never exposes scores, percentages, or “AI matched” language.
 */
export function formatSearchMatchHint(
  result: ProductSearchResult,
): string | null {
  switch (result.matchKind) {
    case "sku-exact":
    case "sku-partial":
      return `SKU: ${result.sku}`;
    case "category-exact":
      return `Matching in ${result.category}`;
    case "subcategory-exact":
      return result.subcategory
        ? `Matching in ${result.subcategory}`
        : `Matching in ${result.category}`;
    case "metadata":
      if (result.subcategory) {
        return `${result.category} · ${result.subcategory}`;
      }
      return result.category ? `Matching in ${result.category}` : null;
    default:
      return null;
  }
}

/** Invalidate cached search documents after hot catalogue reloads in tests. */
export function resetProductSearchCache() {
  documentCache = null;
  documentSource = null;
}
