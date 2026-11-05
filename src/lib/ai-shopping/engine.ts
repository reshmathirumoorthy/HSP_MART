/**
 * HSP AI engine — deterministic local conversational commerce.
 * Executes against real catalogue data; UI applies cart/wishlist side-effects.
 */

import { formatPrice } from "@/data/products";
import {
  getProductById,
  getRelatedProducts,
  getSimilarProducts,
} from "@/lib/products";
import { isProductCustomizable } from "@/lib/productModel";
import type { Product } from "@/types/product";
import {
  pickCheapest,
  pickMostExpensive,
  resolveProductFromContext,
} from "./context";
import { parseAssistantQuery } from "./parser";
import {
  findAlternativeProducts,
  searchCatalogueForAssistant,
} from "./productSearch";
import * as say from "./responses";
import type {
  AssistantEngineResult,
  ChatMessageAction,
  ConversationContext,
  PendingCommerceAction,
} from "./types";

export type EngineRuntime = {
  /** Current cart lines for VIEW_CART / remove resolution. */
  cartLines: {
    productId: string;
    name: string;
    quantity: number;
    lineTotal: number;
    lineKey: string;
  }[];
  cartSubtotal: number;
  wishlistNames: string[];
  wishlistIds: string[];
};

function productActions(
  product: Product,
  opts: { quantity?: number; bulk?: boolean } = {},
): ChatMessageAction[] {
  const actions: ChatMessageAction[] = [
    {
      id: `view-${product.id}`,
      label: "View product",
      kind: "view_product",
      href: `/products/${product.slug}`,
      productId: product.id,
    },
    {
      id: `cart-${product.id}`,
      label: "Add to cart",
      kind: "add_to_cart",
      productId: product.id,
      quantity: opts.quantity ?? 1,
    },
    {
      id: `wish-${product.id}`,
      label: "Wishlist",
      kind: "wishlist",
      productId: product.id,
    },
    {
      id: `buy-${product.id}`,
      label: "Buy now",
      kind: "buy_now",
      productId: product.id,
      quantity: opts.quantity ?? 1,
    },
  ];

  if (isProductCustomizable(product)) {
    actions.push({
      id: `custom-${product.id}`,
      label: "Customize",
      kind: "customize",
      href: `/products/${product.slug}#customize`,
      productId: product.id,
    });
  }

  if (opts.bulk || product.bulkAvailable) {
    actions.push({
      id: `bulk-${product.id}`,
      label: "Request bulk quote",
      kind: "bulk_quote",
      href: `/bulk-quote?product=${product.slug}`,
      productId: product.id,
    });
  }

  return actions;
}

function resultCardActions(
  products: Product[],
  opts: { quantity?: number; bulk?: boolean } = {},
): ChatMessageAction[] {
  if (products.length === 1 && products[0]) {
    return productActions(products[0], opts);
  }
  return [];
}

function withResults(
  context: ConversationContext,
  products: Product[],
  patch: Partial<ConversationContext> = {},
): ConversationContext {
  return {
    ...context,
    lastResults: products,
    lastProductId: products[0]?.id ?? context.lastProductId,
    lastAction: "search",
    ...patch,
  };
}

function subjectFromQuery(searchTerms: string, categorySlug?: string): string {
  if (searchTerms.trim()) return searchTerms.trim();
  if (categorySlug) return categorySlug.replace(/-/g, " ");
  return "products";
}

export function runAssistantEngine(
  rawInput: string,
  context: ConversationContext,
  runtime: EngineRuntime,
): AssistantEngineResult {
  const query = parseAssistantQuery(rawInput);
  const pendingActions: PendingCommerceAction[] = [];
  let nextContext: ConversationContext = {
    ...context,
    lastQuantity: query.quantity ?? context.lastQuantity,
  };

  const qty = query.quantity ?? 1;

  switch (query.intent) {
    case "GREETING":
      return {
        message: {
          role: "assistant",
          text: say.greetingResponse(),
          actions: [
            {
              id: "qa-stationery",
              label: "Show stationery",
              kind: "prompt",
              prompt: "Show stationery",
            },
            {
              id: "qa-custom",
              label: "Customizable products",
              kind: "prompt",
              prompt: "Show customizable products",
            },
          ],
        },
        nextContext,
        pendingActions,
      };

    case "DELIVERY_INFO":
      return {
        message: {
          role: "assistant",
          text: say.deliveryResponse(),
          actions: [
            {
              id: "delivery-contact",
              label: "Contact HSP Mart",
              kind: "navigate",
              href: "/contact",
            },
            {
              id: "delivery-faq",
              label: "Read FAQ",
              kind: "navigate",
              href: "/faq",
            },
          ],
        },
        nextContext,
        pendingActions,
      };

    case "HELP":
      return {
        message: { role: "assistant", text: say.helpResponse() },
        nextContext,
        pendingActions,
      };

    case "VIEW_CART": {
      const lines = runtime.cartLines.map((line) => ({
        name: line.name,
        quantity: line.quantity,
        lineTotal: line.lineTotal,
      }));
      return {
        message: {
          role: "assistant",
          text: say.cartSummaryResponse(lines, runtime.cartSubtotal),
          actions: [
            {
              id: "open-cart",
              label: "View cart",
              kind: "view_cart",
            },
            ...(lines.length
              ? [
                  {
                    id: "go-checkout",
                    label: "Checkout",
                    kind: "checkout" as const,
                    href: "/checkout",
                  },
                ]
              : []),
          ],
        },
        nextContext: { ...nextContext, lastAction: "cart" },
        pendingActions,
      };
    }

    case "VIEW_WISHLIST":
      return {
        message: {
          role: "assistant",
          text: say.wishlistSummaryResponse(runtime.wishlistNames),
          actions: [
            {
              id: "open-wishlist",
              label: "View wishlist",
              kind: "view_wishlist",
              href: "/wishlist",
            },
          ],
        },
        nextContext: { ...nextContext, lastAction: "wishlist" },
        pendingActions,
      };

    case "SORT_PRODUCTS": {
      const pool =
        context.lastResults.length > 0
          ? context.lastResults
          : searchCatalogueForAssistant(query);
      if (!pool.length) {
        return {
          message: {
            role: "assistant",
            text: say.searchEmptyResponse(subjectFromQuery(query.searchTerms)),
          },
          nextContext,
          pendingActions,
        };
      }
      const cheapest = pickCheapest(pool);
      const expensive = pickMostExpensive(pool);
      const sorted =
        query.sort === "price-desc"
          ? [...pool].sort((a, b) => b.price - a.price)
          : [...pool].sort((a, b) => a.price - b.price);
      const focus =
        query.sort === "price-desc" ? expensive : cheapest;
      nextContext = withResults(nextContext, sorted, {
        lastProductId: focus?.id ?? null,
        lastAction: "search",
      });
      return {
        message: {
          role: "assistant",
          text: focus
            ? query.sort === "price-desc"
              ? `Among these options, ${focus.name} is the highest priced at ${formatPrice(focus.price)}.`
              : say.cheapestResponse(focus)
            : say.unknownResponse(),
          products: sorted.slice(0, 6),
          actions: focus ? productActions(focus) : undefined,
        },
        nextContext,
        pendingActions,
      };
    }

    case "SIMILAR_PRODUCTS": {
      const base =
        resolveProductFromContext(query, context) ??
        (context.lastProductId
          ? getProductById(context.lastProductId)
          : undefined) ??
        context.lastResults[0];
      if (!base) {
        return {
          message: {
            role: "assistant",
            text: say.missingProductRefResponse(),
          },
          nextContext,
          pendingActions,
        };
      }
      const similarCandidates = getSimilarProducts(base);
      const similar =
        similarCandidates.length >= 2
          ? similarCandidates
          : getRelatedProducts(base);
      nextContext = withResults(nextContext, similar, {
        lastProductId: base.id,
      });
      return {
        message: {
          role: "assistant",
          text: say.similarIntroResponse(base.name, similar.length),
          products: similar,
        },
        nextContext,
        pendingActions,
      };
    }

    case "PRODUCT_DETAILS": {
      const product = resolveProductFromContext(query, context);
      if (!product) {
        return {
          message: {
            role: "assistant",
            text: say.missingProductRefResponse(),
          },
          nextContext,
          pendingActions,
        };
      }
      nextContext = {
        ...nextContext,
        lastProductId: product.id,
        lastResults: [product],
        lastAction: "search",
      };
      return {
        message: {
          role: "assistant",
          text: say.detailsResponse(product),
          products: [product],
          actions: productActions(product),
        },
        nextContext,
        pendingActions,
      };
    }

    case "CUSTOMIZE_PRODUCT": {
      const product = resolveProductFromContext(query, context);
      if (!product) {
        return {
          message: {
            role: "assistant",
            text: say.missingProductRefResponse(),
          },
          nextContext,
          pendingActions,
        };
      }
      const canCustom = isProductCustomizable(product);
      nextContext = {
        ...nextContext,
        lastProductId: product.id,
        lastAction: "customize",
      };
      return {
        message: {
          role: "assistant",
          text: canCustom
            ? say.customizeYesResponse(product)
            : say.customizeNoResponse(product),
          products: [product],
          actions: canCustom
            ? [
                {
                  id: `custom-${product.id}`,
                  label: "Customize product",
                  kind: "customize",
                  href: `/products/${product.slug}#customize`,
                  productId: product.id,
                },
              ]
            : [
                {
                  id: "show-custom",
                  label: "Show customizable products",
                  kind: "prompt",
                  prompt: "Show customizable products",
                },
              ],
        },
        nextContext,
        pendingActions: [],
      };
    }

    case "ADD_TO_CART": {
      const product = resolveProductFromContext(query, context);
      if (!product) {
        return {
          message: {
            role: "assistant",
            text: say.missingProductRefResponse(),
          },
          nextContext,
          pendingActions,
        };
      }
      pendingActions.push({
        type: "add_to_cart",
        productId: product.id,
        quantity: qty,
      });
      nextContext = {
        ...nextContext,
        lastProductId: product.id,
        lastQuantity: qty,
        lastAction: "cart",
      };
      return {
        message: {
          role: "assistant",
          text: `Adding ${product.name}${qty > 1 ? ` × ${qty}` : ""} to your cart…`,
          products: [product],
          actions: (
            [
              {
                id: "open-cart",
                label: "View cart",
                kind: "view_cart",
              },
              ...(isProductCustomizable(product)
                ? [
                    {
                      id: `custom-${product.id}`,
                      label: "Customize",
                      kind: "customize" as const,
                      href: `/products/${product.slug}#customize`,
                      productId: product.id,
                    },
                  ]
                : []),
            ] satisfies ChatMessageAction[]
          ),
        },
        nextContext,
        pendingActions,
      };
    }

    case "REMOVE_FROM_CART": {
      const product = resolveProductFromContext(query, context);
      const fromCart =
        product ??
        (runtime.cartLines[0]
          ? getProductById(runtime.cartLines[0].productId)
          : null);
      if (!fromCart) {
        return {
          message: {
            role: "assistant",
            text: "I couldn't tell which cart item to remove. Open your cart or name the product.",
          },
          nextContext,
          pendingActions,
        };
      }
      pendingActions.push({
        type: "remove_from_cart",
        productId: fromCart.id,
      });
      nextContext = {
        ...nextContext,
        lastProductId: fromCart.id,
        lastAction: "cart",
      };
      return {
        message: {
          role: "assistant",
          text: `Removing ${fromCart.name} from your cart…`,
          products: [fromCart],
        },
        nextContext,
        pendingActions,
      };
    }

    case "UPDATE_CART_QUANTITY": {
      const product = resolveProductFromContext(query, context);
      if (!product || !query.quantity) {
        return {
          message: {
            role: "assistant",
            text: "Tell me which product and the new quantity — for example, “set the first one to 3.”",
          },
          nextContext,
          pendingActions,
        };
      }
      pendingActions.push({
        type: "update_cart_quantity",
        productId: product.id,
        quantity: query.quantity,
      });
      return {
        message: {
          role: "assistant",
          text: `Updating ${product.name} to quantity ${query.quantity}…`,
          products: [product],
        },
        nextContext: {
          ...nextContext,
          lastProductId: product.id,
          lastQuantity: query.quantity,
          lastAction: "cart",
        },
        pendingActions,
      };
    }

    case "ADD_TO_WISHLIST": {
      const product = resolveProductFromContext(query, context);
      if (!product) {
        return {
          message: {
            role: "assistant",
            text: say.missingProductRefResponse(),
          },
          nextContext,
          pendingActions,
        };
      }
      pendingActions.push({ type: "add_to_wishlist", productId: product.id });
      return {
        message: {
          role: "assistant",
          text: `Saving ${product.name} to your wishlist…`,
          products: [product],
          actions: [
            {
              id: "open-wishlist",
              label: "View wishlist",
              kind: "view_wishlist",
              href: "/wishlist",
            },
          ],
        },
        nextContext: {
          ...nextContext,
          lastProductId: product.id,
          lastAction: "wishlist",
        },
        pendingActions,
      };
    }

    case "REMOVE_FROM_WISHLIST": {
      const product = resolveProductFromContext(query, context);
      if (!product) {
        return {
          message: {
            role: "assistant",
            text: say.missingProductRefResponse(),
          },
          nextContext,
          pendingActions,
        };
      }
      pendingActions.push({
        type: "remove_from_wishlist",
        productId: product.id,
      });
      return {
        message: {
          role: "assistant",
          text: `Removing ${product.name} from your wishlist…`,
          products: [product],
        },
        nextContext: {
          ...nextContext,
          lastProductId: product.id,
          lastAction: "wishlist",
        },
        pendingActions,
      };
    }

    case "BUY_NOW": {
      const product = resolveProductFromContext(query, context);
      if (!product) {
        return {
          message: {
            role: "assistant",
            text: say.missingProductRefResponse(),
          },
          nextContext,
          pendingActions,
        };
      }
      pendingActions.push({
        type: "buy_now",
        productId: product.id,
        quantity: qty,
      });
      return {
        message: {
          role: "assistant",
          text: `I'll add ${product.name} to your cart and take you to checkout.`,
          products: [product],
          actions: [
            {
              id: "checkout",
              label: "Go to checkout",
              kind: "checkout",
              href: "/checkout",
            },
          ],
        },
        nextContext: {
          ...nextContext,
          lastProductId: product.id,
          lastAction: "checkout",
        },
        pendingActions,
      };
    }

    case "BULK_QUOTE":
    case "BULK_PURCHASE": {
      const productsFound =
        context.lastResults.length > 0
          ? context.lastResults
          : searchCatalogueForAssistant({
              ...query,
              intent: "SEARCH_PRODUCTS",
            });
      const quantity = query.quantity ?? context.lastQuantity ?? 50;
      const focus = productsFound[0];
      nextContext = withResults(nextContext, productsFound, {
        lastQuantity: quantity,
        lastAction: "bulk",
      });
      const actions: ChatMessageAction[] = [];
      if (focus) {
        actions.push({
          id: `bulk-${focus.id}`,
          label: "Request bulk quote",
          kind: "bulk_quote",
          href: `/bulk-quote?product=${focus.slug}`,
          productId: focus.id,
        });
      } else {
        actions.push({
          id: "bulk-page",
          label: "Open bulk quote",
          kind: "bulk_quote",
          href: "/bulk-quote",
        });
      }
      return {
        message: {
          role: "assistant",
          text: productsFound.length
            ? say.bulkGuidanceResponse(productsFound, quantity)
            : "I can help with bulk orders. Search for a product first, then request a bulk quote for pricing confirmation.",
          products: productsFound.slice(0, 5),
          actions,
        },
        nextContext,
        pendingActions,
      };
    }

    case "FILTER_PRODUCTS":
    case "SEARCH_PRODUCTS": {
      const hits = searchCatalogueForAssistant(query);
      const subject = subjectFromQuery(query.searchTerms, query.categorySlug);

      if (!hits.length) {
        const alternatives = findAlternativeProducts(query);
        nextContext = withResults(nextContext, alternatives, {
          lastSearch: query.searchTerms,
          lastCategorySlug: query.categorySlug ?? null,
          lastPriceMax: query.priceMax ?? null,
          lastPriceMin: query.priceMin ?? null,
        });
        return {
          message: {
            role: "assistant",
            text: `${say.searchEmptyResponse(subject)} ${alternatives.length ? say.alternativesResponse(alternatives) : ""}`.trim(),
            products: alternatives.length ? alternatives : undefined,
            actions: alternatives[0]
              ? resultCardActions([alternatives[0]])
              : [
                  {
                    id: "show-stationery",
                    label: "Show stationery",
                    kind: "prompt",
                    prompt: "Show stationery",
                  },
                ],
          },
          nextContext,
          pendingActions,
        };
      }

      nextContext = withResults(nextContext, hits, {
        lastSearch: query.searchTerms,
        lastCategorySlug: query.categorySlug ?? null,
        lastPriceMax: query.priceMax ?? null,
        lastPriceMin: query.priceMin ?? null,
        lastQuantity: query.quantity ?? context.lastQuantity,
      });

      const bulkNote =
        query.bulkIntent && query.quantity && query.quantity >= 25
          ? ` Since you need about ${query.quantity} units, a bulk quote may help confirm pricing.`
          : "";

      const actions: ChatMessageAction[] = [];
      if (query.bulkIntent && hits[0]) {
        actions.push({
          id: `bulk-${hits[0].id}`,
          label: "Request bulk quote",
          kind: "bulk_quote",
          href: `/bulk-quote?product=${hits[0].slug}`,
          productId: hits[0].id,
        });
      }

      return {
        message: {
          role: "assistant",
          text: `${say.searchSuccessResponse(hits, subject)}${bulkNote}`,
          products: hits,
          actions: actions.length ? actions : undefined,
        },
        nextContext,
        pendingActions,
      };
    }

    default:
      return {
        message: { role: "assistant", text: say.unknownResponse() },
        nextContext,
        pendingActions,
      };
  }
}

export { parseAssistantQuery };
