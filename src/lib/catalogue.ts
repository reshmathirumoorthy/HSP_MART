import {
  productCategories,
  products,
  type FilterState,
  type PriceRangeKey,
  type Product,
  type ProductCategorySlug,
  type SortOption,
} from "@/data/products";
import { isInStock } from "@/lib/productAvailability";
import { isProductCustomizable } from "@/lib/productModel";
import { productMatchesSearch } from "@/lib/productSearch";

export const defaultFilterState: FilterState = {
  category: "all",
  subcategory: "",
  search: "",
  priceRange: "all",
  inStockOnly: false,
  customizableOnly: false,
  bulkOnly: false,
  sort: "featured",
};

function matchesPrice(price: number, range: PriceRangeKey): boolean {
  switch (range) {
    case "under-500":
      return price < 500;
    case "500-1000":
      return price >= 500 && price <= 1000;
    case "1000-2000":
      return price > 1000 && price <= 2000;
    case "2000-plus":
      return price > 2000;
    default:
      return true;
  }
}

function isCustomizableProduct(product: Product): boolean {
  return isProductCustomizable(product);
}

function isTruthyParam(value: string | null): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

export function filterProducts(
  source: Product[] = products,
  filters: FilterState = defaultFilterState,
): Product[] {
  const subcategory = filters.subcategory.trim().toLowerCase();

  const filtered = source.filter((product) => {
    if (!product.active) return false;
    if (filters.category !== "all" && product.categorySlug !== filters.category) {
      return false;
    }
    if (
      subcategory &&
      (product.subcategory ?? "").trim().toLowerCase() !== subcategory
    ) {
      return false;
    }
    if (!productMatchesSearch(product, filters.search)) return false;
    if (!matchesPrice(product.price, filters.priceRange)) return false;
    if (filters.inStockOnly && !isInStock(product)) return false;
    if (filters.customizableOnly && !isCustomizableProduct(product)) return false;
    if (filters.bulkOnly && !product.bulkAvailable) return false;
    return true;
  });

  return sortProducts(filtered, filters.sort);
}

export function sortProducts(list: Product[], sort: SortOption): Product[] {
  const next = [...list];

  switch (sort) {
    case "price-asc":
      return next.sort((a, b) => a.price - b.price || a.name.localeCompare(b.name));
    case "price-desc":
      return next.sort((a, b) => b.price - a.price || a.name.localeCompare(b.name));
    case "name-asc":
      return next.sort((a, b) => a.name.localeCompare(b.name));
    case "featured":
    default:
      return next.sort((a, b) => {
        if (a.featured !== b.featured) return a.featured ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
  }
}

export function parseCategory(value: string | null): ProductCategorySlug {
  const allowed: ProductCategorySlug[] = [
    "all",
    "stationery",
    "office",
    "desk",
    "writing",
    "presentation",
    "gifts",
    "custom",
  ];
  if (value && allowed.includes(value as ProductCategorySlug)) {
    return value as ProductCategorySlug;
  }
  return "all";
}

export function parsePriceRange(value: string | null): PriceRangeKey {
  const allowed: PriceRangeKey[] = [
    "all",
    "under-500",
    "500-1000",
    "1000-2000",
    "2000-plus",
  ];
  if (value && allowed.includes(value as PriceRangeKey)) {
    return value as PriceRangeKey;
  }
  return "all";
}

export function parseSort(value: string | null): SortOption {
  const allowed: SortOption[] = ["featured", "price-asc", "price-desc", "name-asc"];
  if (value && allowed.includes(value as SortOption)) {
    return value as SortOption;
  }
  return "featured";
}

/** Resolve a subcategory param against real catalogue labels for a category. */
export function parseSubcategory(
  value: string | null,
  category: ProductCategorySlug,
  source: Product[] = products,
): string {
  if (!value?.trim() || category === "all") return "";
  const needle = value.trim().toLowerCase();
  const match = getSubcategoriesForCategory(category, source).find(
    (label) => label.toLowerCase() === needle,
  );
  return match ?? "";
}

export function getSubcategoriesForCategory(
  category: ProductCategorySlug,
  source: Product[] = products,
): string[] {
  if (category === "all") return [];

  const labels = new Set<string>();
  for (const product of source) {
    if (!product.active || product.categorySlug !== category) continue;
    const label = product.subcategory?.trim();
    if (label) labels.add(label);
  }

  return [...labels].sort((a, b) => a.localeCompare(b));
}

export function filtersFromSearchParams(params: URLSearchParams): FilterState {
  const category = parseCategory(params.get("category"));
  return {
    category,
    subcategory: parseSubcategory(params.get("subcategory"), category),
    search: params.get("search") ?? params.get("q") ?? "",
    priceRange: parsePriceRange(params.get("price")),
    inStockOnly: params.get("stock") === "in-stock",
    customizableOnly: isTruthyParam(params.get("customizable")),
    bulkOnly: isTruthyParam(params.get("bulk")),
    sort: parseSort(params.get("sort")),
  };
}

export function searchParamsFromFilters(filters: FilterState): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.category !== "all") params.set("category", filters.category);
  if (filters.subcategory.trim()) {
    params.set("subcategory", filters.subcategory.trim());
  }
  if (filters.search.trim()) params.set("search", filters.search.trim());
  if (filters.priceRange !== "all") params.set("price", filters.priceRange);
  if (filters.inStockOnly) params.set("stock", "in-stock");
  if (filters.customizableOnly) params.set("customizable", "true");
  if (filters.bulkOnly) params.set("bulk", "true");
  if (filters.sort !== "featured") params.set("sort", filters.sort);
  return params;
}

export function filtersEqual(a: FilterState, b: FilterState): boolean {
  return (
    a.category === b.category &&
    a.subcategory === b.subcategory &&
    a.search === b.search &&
    a.priceRange === b.priceRange &&
    a.inStockOnly === b.inStockOnly &&
    a.customizableOnly === b.customizableOnly &&
    a.bulkOnly === b.bulkOnly &&
    a.sort === b.sort
  );
}

export type ActiveChip = {
  key: string;
  label: string;
};

export function getActiveFilterChips(filters: FilterState): ActiveChip[] {
  const chips: ActiveChip[] = [];

  if (filters.category !== "all") {
    const categoryLabel =
      productCategories.find((item) => item.slug === filters.category)?.label ??
      filters.category;
    chips.push({
      key: "category",
      label: categoryLabel,
    });
  }
  if (filters.subcategory.trim()) {
    chips.push({ key: "subcategory", label: filters.subcategory.trim() });
  }
  if (filters.search.trim()) {
    chips.push({ key: "search", label: `“${filters.search.trim()}”` });
  }
  if (filters.priceRange !== "all") {
    const labels: Record<Exclude<PriceRangeKey, "all">, string> = {
      "under-500": "Under ₹500",
      "500-1000": "₹500–₹1,000",
      "1000-2000": "₹1,000–₹2,000",
      "2000-plus": "₹2,000+",
    };
    chips.push({ key: "price", label: labels[filters.priceRange] });
  }
  if (filters.inStockOnly) chips.push({ key: "stock", label: "In stock" });
  if (filters.customizableOnly) {
    chips.push({ key: "customizable", label: "Customizable" });
  }
  if (filters.bulkOnly) chips.push({ key: "bulk", label: "Bulk available" });

  return chips;
}
