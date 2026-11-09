import type { Product, StockStatus } from "@/types/product";

export function isInStock(product: Product): boolean {
  return (
    product.active &&
    (product.stockStatus === "in_stock" || product.stockStatus === "low_stock")
  );
}

/**
 * Can this product go into the cart? False for price-on-request items
 * (sold by quote) even when they are in stock.
 */
export function isPurchasable(product: Product): boolean {
  return isInStock(product) && !product.priceOnRequest && product.price > 0;
}

export function stockStatusLabel(status: StockStatus): string {
  switch (status) {
    case "in_stock":
      return "In stock";
    case "low_stock":
      return "Limited availability";
    case "out_of_stock":
      return "Out of stock";
  }
}

export function productAvailabilityLabel(product: Product): string {
  if (!product.active) return "Unavailable";
  return stockStatusLabel(product.stockStatus);
}
