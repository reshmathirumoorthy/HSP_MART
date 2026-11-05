import type { ProductCategorySlug } from "@/types/product";

/**
 * Structured category model for catalogue + future ERPNext Item Group mapping.
 * DEMO / MOCK FRONTEND DATA
 */

export type ProductCategory = {
  id: string;
  slug: Exclude<ProductCategorySlug, "all">;
  name: string;
  description: string;
  featured?: boolean;
  image?: string;
  /** Homepage grid sizing hint only. */
  size?: "featured" | "medium" | "small" | "wide";
};

export type CatalogueNavCategory = {
  slug: ProductCategorySlug;
  label: string;
};
