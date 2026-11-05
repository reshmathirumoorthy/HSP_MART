import type { Product, StockStatus } from "@/types/product";

export function isInStock(product: Product): boolean {
  return (
    product.active &&
    (product.stockStatus === "in_stock" || product.stockStatus === "low_stock")
  );
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
