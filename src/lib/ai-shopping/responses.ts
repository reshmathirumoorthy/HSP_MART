/**
 * Natural-language response templates for HSP AI.
 */

import { formatPrice } from "@/data/products";
import type { Product } from "@/types/product";
import { isProductCustomizable } from "@/lib/productModel";
import { productAvailabilityLabel } from "@/lib/productAvailability";

export function greetingResponse(): string {
  return "Hi — I'm HSP AI. Ask me to find stationery, gifts, or customizable products, or tell me what to add to your cart.";
}

export function helpResponse(): string {
  return "I can search the HSP Mart catalogue, filter by price or category, compare options from our last results, add items to cart or wishlist, open customization, and help with bulk quotes. Try “show notebooks under ₹500” or “add the first one to my cart.”";
}

export function deliveryResponse(): string {
  return "HSP Mart offers free delivery on orders above ₹499. The storefront does not publish delivery timelines or charges for every pincode, so I don't want to guess. For the exact delivery details for your order or pincode, call +91 99996 98694 or email info@hspmart.com.";
}

export function unknownResponse(): string {
  return "I'm not sure what you're looking for yet. Try asking me to find a product, filter by price, compare options, or add something to your cart.";
}

export function searchSuccessResponse(
  products: Product[],
  subject: string,
): string {
  const label = subject.trim() || "matching products";
  if (products.length === 1) {
    return `I found 1 ${label}: ${products[0].name} at ${formatPrice(products[0].price)}.`;
  }
  return `I found ${products.length} ${label} that match your request.`;
}

export function searchEmptyResponse(subject: string): string {
  const label = subject.trim() || "that";
  return `I couldn't find a matching ${label} in the current HSP Mart catalogue.`;
}

export function alternativesResponse(products: Product[]): string {
  if (!products.length) {
    return "I couldn't find close alternatives in the catalogue right now.";
  }
  return `I couldn't find an exact match, but here are ${products.length} close options from the catalogue.`;
}

export function cheapestResponse(product: Product): string {
  return `Based on the products we just looked at, the most affordable option is ${product.name} at ${formatPrice(product.price)}.`;
}

export function detailsResponse(product: Product): string {
  const custom = isProductCustomizable(product)
    ? "Customization is available."
    : "Customization is not highlighted for this item.";
  const bulk = product.bulkAvailable
    ? product.minOrderQuantity
      ? `Bulk supply is available (min. ${product.minOrderQuantity} units).`
      : "Bulk supply is available."
    : "";
  return [
    `${product.name} — ${formatPrice(product.price)}.`,
    product.shortDescription,
    `${productAvailabilityLabel(product)}.`,
    custom,
    bulk,
  ]
    .filter(Boolean)
    .join(" ");
}

export function customizeYesResponse(product: Product): string {
  return `Yes — ${product.name} supports customization. Open the customization studio to add text, a logo, or an image. Nothing is applied until you confirm there.`;
}

export function customizeNoResponse(product: Product): string {
  return `${product.name} does not currently expose a customization configuration in the catalogue. I can show customizable alternatives if you'd like.`;
}

export function cartEmptyResponse(): string {
  return "Your cart is empty right now. Ask me to find a product and I can add it for you.";
}

export function cartSummaryResponse(
  lines: { name: string; quantity: number; lineTotal: number }[],
  subtotal: number,
): string {
  if (!lines.length) return cartEmptyResponse();
  const preview = lines
    .slice(0, 4)
    .map((line) => `${line.name} × ${line.quantity}`)
    .join("; ");
  const more =
    lines.length > 4 ? ` and ${lines.length - 4} more line${lines.length - 4 === 1 ? "" : "s"}` : "";
  return `You have ${lines.length} line${lines.length === 1 ? "" : "s"} in your cart: ${preview}${more}. Subtotal ${formatPrice(subtotal)}.`;
}

export function wishlistSummaryResponse(names: string[]): string {
  if (!names.length) {
    return "Your wishlist is empty. Say “save the first one” after a search to add something.";
  }
  const preview = names.slice(0, 4).join(", ");
  const more =
    names.length > 4 ? ` and ${names.length - 4} more` : "";
  return `You have ${names.length} saved item${names.length === 1 ? "" : "s"}: ${preview}${more}.`;
}

export function bulkGuidanceResponse(
  products: Product[],
  quantity: number,
): string {
  const count = products.length;
  return `I found ${count} suitable product${count === 1 ? "" : "s"}. Since you need about ${quantity} units, you may want to request a bulk quote for pricing confirmation.`;
}

export function similarIntroResponse(baseName: string, count: number): string {
  if (!count) {
    return `I couldn't find similar products to ${baseName} in the current catalogue.`;
  }
  return `Based on the available catalogue information, here are ${count} products close to ${baseName}.`;
}

export function missingProductRefResponse(): string {
  return "I need a product to work with. Search first, then say “the first one,” or open a product page and say “this.”";
}
