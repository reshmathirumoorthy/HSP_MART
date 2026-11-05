/**
 * HSP AI — typed contracts for the frontend-only shopping assistant.
 * No backend / LLM — deterministic local commerce engine.
 */

import type { Product } from "@/types/product";

export type AssistantIntent =
  | "SEARCH_PRODUCTS"
  | "FILTER_PRODUCTS"
  | "SORT_PRODUCTS"
  | "PRODUCT_DETAILS"
  | "SIMILAR_PRODUCTS"
  | "ADD_TO_CART"
  | "REMOVE_FROM_CART"
  | "UPDATE_CART_QUANTITY"
  | "ADD_TO_WISHLIST"
  | "REMOVE_FROM_WISHLIST"
  | "VIEW_CART"
  | "VIEW_WISHLIST"
  | "BUY_NOW"
  | "CUSTOMIZE_PRODUCT"
  | "BULK_PURCHASE"
  | "BULK_QUOTE"
  | "DELIVERY_INFO"
  | "HELP"
  | "GREETING"
  | "UNKNOWN";

export type AssistantSort =
  | "relevance"
  | "price-asc"
  | "price-desc"
  | "name-asc";

export type ParsedQuery = {
  raw: string;
  normalized: string;
  intent: AssistantIntent;
  searchTerms: string;
  categorySlug?: string;
  color?: string;
  priceMin?: number;
  priceMax?: number;
  customizableOnly: boolean;
  bulkOnly: boolean;
  bulkIntent: boolean;
  quantity?: number;
  sort: AssistantSort;
  /** 1-based ordinal into last result set ("first" → 1). */
  ordinal?: number;
  /** Loose product name / color / "this" / "it" reference. */
  productRef?: string;
  /** Prefer resolving against the product page currently open. */
  useCurrentProduct: boolean;
};

export type ConversationContext = {
  lastResults: Product[];
  lastProductId: string | null;
  lastSearch: string;
  lastCategorySlug: string | null;
  lastPriceMax: number | null;
  lastPriceMin: number | null;
  lastQuantity: number | null;
  lastAction:
    | "search"
    | "cart"
    | "wishlist"
    | "customize"
    | "bulk"
    | "checkout"
    | null;
  currentPageProductId: string | null;
};

export type ChatRole = "user" | "assistant";

export type ChatQuickAction = {
  id: string;
  label: string;
  prompt: string;
};

export type ChatMessageAction = {
  id: string;
  label: string;
  kind:
    | "view_product"
    | "add_to_cart"
    | "wishlist"
    | "buy_now"
    | "customize"
    | "bulk_quote"
    | "view_cart"
    | "view_wishlist"
    | "checkout"
    | "navigate"
    | "prompt";
  href?: string;
  productId?: string;
  quantity?: number;
  prompt?: string;
};

export type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  products?: Product[];
  actions?: ChatMessageAction[];
  createdAt: number;
};

/** Structured side-effects the UI executes against real cart/wishlist hooks. */
export type PendingCommerceAction =
  | {
      type: "add_to_cart";
      productId: string;
      quantity: number;
    }
  | {
      type: "remove_from_cart";
      productId: string;
    }
  | {
      type: "update_cart_quantity";
      productId: string;
      quantity: number;
    }
  | {
      type: "add_to_wishlist";
      productId: string;
    }
  | {
      type: "remove_from_wishlist";
      productId: string;
    }
  | {
      type: "buy_now";
      productId: string;
      quantity: number;
    }
  | {
      type: "navigate";
      href: string;
    };

export type AssistantEngineResult = {
  message: Omit<ChatMessage, "id" | "createdAt">;
  nextContext: ConversationContext;
  pendingActions: PendingCommerceAction[];
};

export function createEmptyConversationContext(
  currentPageProductId: string | null = null,
): ConversationContext {
  return {
    lastResults: [],
    lastProductId: null,
    lastSearch: "",
    lastCategorySlug: null,
    lastPriceMax: null,
    lastPriceMin: null,
    lastQuantity: null,
    lastAction: null,
    currentPageProductId,
  };
}
