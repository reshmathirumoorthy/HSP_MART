/**
 * Catalogue categories — managed in the admin app (Site content → categories), served by the backend.
 */
import type { ProductCategory } from "@/types/category";
import type { ProductCategorySlug } from "@/types/product";
import { categories, productCategories } from "@/lib/siteData";

export { categories, productCategories };

export function getCategoryBySlug(slug: Exclude<ProductCategorySlug, "all">): ProductCategory | undefined {
  return categories.find((category) => category.slug === slug);
}

export function getCategoryLabel(slug: Exclude<ProductCategorySlug, "all">): string {
  return getCategoryBySlug(slug)?.name ?? slug;
}
