import { products, type Product } from "@/data/products";
import {
  getRelatedProducts as resolveRelatedProducts,
  getSimilarProducts as resolveSimilarProducts,
} from "@/lib/discovery";

export function getProductById(productId: string): Product | undefined {
  return products.find((product) => product.id === productId);
}

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((product) => product.slug === slug);
}

export function getProductBySku(sku: string): Product | undefined {
  const normalized = sku.trim().toLowerCase();
  return products.find((product) => product.sku.toLowerCase() === normalized);
}

export function getRelatedProducts(
  product: Product,
  catalogue: Product[] = products,
  limit = 4,
): Product[] {
  return resolveRelatedProducts(product, catalogue, limit);
}

export function getSimilarProducts(
  product: Product,
  catalogue: Product[] = products,
  limit = 4,
  excludeIds: string[] = [],
): Product[] {
  return resolveSimilarProducts(product, catalogue, limit, excludeIds);
}
