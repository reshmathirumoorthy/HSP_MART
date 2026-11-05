/**
 * Central category dataset for HSP Mart online catalogue.
 * DEMO / MOCK FRONTEND DATA — maps conceptually to ERPNext Item Groups.
 */

import type { CatalogueNavCategory, ProductCategory } from "@/types/category";
import type { ProductCategorySlug } from "@/types/product";

export const categories: ProductCategory[] = [
  {
    id: "cat-stationery",
    slug: "stationery",
    name: "Stationery",
    description: "Notebooks, paper and everyday writing essentials.",
    featured: true,
    size: "featured",
  },
  {
    id: "cat-office",
    slug: "office",
    name: "Office Essentials",
    description: "Practical supplies for home and workplace desks.",
    featured: true,
    size: "medium",
  },
  {
    id: "cat-desk",
    slug: "desk",
    name: "Desk & Accessories",
    description: "Organizers and tools that keep your space clear.",
    featured: true,
    size: "medium",
  },
  {
    id: "cat-writing",
    slug: "writing",
    name: "Writing Instruments",
    description: "Pens and sets for daily notes and signing.",
    size: "small",
  },
  {
    id: "cat-presentation",
    slug: "presentation",
    name: "Presentation",
    description: "Folders and materials for meetings and pitches.",
    size: "small",
  },
  {
    id: "cat-gifts",
    slug: "gifts",
    name: "Gifting",
    description: "Thoughtful gifts for personal and team moments.",
    featured: true,
    size: "wide",
  },
  {
    id: "cat-custom",
    slug: "custom",
    name: "Custom Products",
    description: "Add a name, logo or packaging when you need it.",
    featured: true,
    size: "wide",
  },
];

/** Filter / nav list including the “all” option. */
export const productCategories: CatalogueNavCategory[] = [
  { slug: "all", label: "All Products" },
  ...categories.map((category) => ({
    slug: category.slug as ProductCategorySlug,
    label: category.name,
  })),
];

export function getCategoryBySlug(
  slug: Exclude<ProductCategorySlug, "all">,
): ProductCategory | undefined {
  return categories.find((category) => category.slug === slug);
}

export function getCategoryLabel(
  slug: Exclude<ProductCategorySlug, "all">,
): string {
  return getCategoryBySlug(slug)?.name ?? slug;
}
