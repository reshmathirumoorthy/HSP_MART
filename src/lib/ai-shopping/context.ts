/**
 * Resolve product references from conversational context.
 */

import type { Product } from "@/types/product";
import { getProductById } from "@/lib/products";
import type { ConversationContext, ParsedQuery } from "./types";

export function resolveProductFromContext(
  query: ParsedQuery,
  context: ConversationContext,
): Product | null {
  if (query.ordinal && context.lastResults.length > 0) {
    const index = query.ordinal - 1;
    if (index >= 0 && index < context.lastResults.length) {
      return context.lastResults[index] ?? null;
    }
  }

  if (query.useCurrentProduct && context.currentPageProductId) {
    return getProductById(context.currentPageProductId) ?? null;
  }

  if (query.productRef === "this" && context.currentPageProductId) {
    return getProductById(context.currentPageProductId) ?? null;
  }

  if (query.color && context.lastResults.length > 0) {
    const color = query.color.toLowerCase();
    const match = context.lastResults.find((product) => {
      const hay = [
        product.name,
        product.slug,
        ...product.tags,
        ...(product.customization?.variants?.map((v) => v.label) ?? []),
        ...(product.customization?.variants?.map((v) => v.id) ?? []),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(color);
    });
    if (match) return match;
  }

  if (
    (query.productRef === "that" || query.productRef === "it") &&
    context.lastProductId
  ) {
    const fromLast = getProductById(context.lastProductId);
    if (fromLast) return fromLast;
  }

  if (query.searchTerms && context.lastResults.length > 0) {
    const needle = query.searchTerms.toLowerCase();
    const match = context.lastResults.find(
      (product) =>
        product.name.toLowerCase().includes(needle) ||
        product.slug.includes(needle.replace(/\s+/g, "-")) ||
        product.tags.some((tag) => tag.toLowerCase().includes(needle)),
    );
    if (match) return match;
  }

  if (context.lastProductId) {
    return getProductById(context.lastProductId) ?? null;
  }

  if (context.lastResults.length === 1) {
    return context.lastResults[0] ?? null;
  }

  if (context.currentPageProductId) {
    return getProductById(context.currentPageProductId) ?? null;
  }

  return null;
}

export function pickCheapest(products: Product[]): Product | null {
  if (!products.length) return null;
  return [...products].sort((a, b) => a.price - b.price)[0] ?? null;
}

export function pickMostExpensive(products: Product[]): Product | null {
  if (!products.length) return null;
  return [...products].sort((a, b) => b.price - a.price)[0] ?? null;
}
