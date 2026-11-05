/**
 * Ranking helpers for HSP AI result sets.
 */

import type { Product } from "@/types/product";
import { sortProducts } from "@/lib/catalogue";
import type { AssistantSort } from "./types";

export function rankProducts(
  products: Product[],
  sort: AssistantSort,
): Product[] {
  switch (sort) {
    case "price-asc":
      return sortProducts(products, "price-asc");
    case "price-desc":
      return sortProducts(products, "price-desc");
    case "name-asc":
      return sortProducts(products, "name-asc");
    default:
      return products;
  }
}

export { pickCheapest, pickMostExpensive } from "./context";
