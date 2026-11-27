/**
 * Canonical product types for HSP Mart frontend.
 * DEMO / MOCK FRONTEND DATA — intended for future ERPNext Item mapping.
 */

import type { ProductCustomizationConfig } from "@/types/customization";
import type { HamperConfig } from "@/types/hamper";

export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";

export type CustomizationType =
  | "printing"
  | "branding"
  | "packaging"
  | "logo"
  | "color"
  | "text"
  | "other";

export type PackagingOption = "individual" | "bulk" | "gift" | "custom";

export type ProductSourceType = "manufactured" | "imported" | "mixed";

/** Frontend-only visual presentation (not an ERP Item field). */
export type ProductTone =
  | "sand"
  | "stone"
  | "clay"
  | "olive"
  | "charcoal"
  | "taupe";

/** Frontend-only placeholder visual kind until real images exist. */
export type ProductVisualKind =
  | "organizer"
  | "notebook"
  | "folder"
  | "tumbler"
  | "kit"
  | "pen";

export type ProductCategorySlug =
  | "all"
  | "stationery"
  | "office"
  | "desk"
  | "writing"
  | "presentation"
  | "gifts"
  | "custom";

export type SortOption = "featured" | "price-asc" | "price-desc" | "name-asc";

export type PriceRangeKey =
  | "all"
  | "under-500"
  | "500-1000"
  | "1000-2000"
  | "2000-plus";

export type FilterState = {
  category: ProductCategorySlug;
  /** Exact subcategory label from catalogue data; empty = any. */
  subcategory: string;
  search: string;
  priceRange: PriceRangeKey;
  inStockOnly: boolean;
  customizableOnly: boolean;
  bulkOnly: boolean;
  sort: SortOption;
};

export type ProductSpecifications = {
  material?: string;
  size?: string;
  color?: string;
  pages?: string;
  [key: string]: string | undefined;
};

export type Product = {
  /** Stable frontend id (also used in localStorage). */
  id: string;
  /** URL slug — keep stable for routes and deep links. */
  slug: string;
  /** Sample SKU for demo mapping to ERPNext item_code. Not live ERP codes. */
  sku: string;
  name: string;
  shortDescription: string;
  description: string;
  /** Display category label (derived from category model). */
  category: string;
  categorySlug: Exclude<ProductCategorySlug, "all">;
  subcategory?: string;
  brand?: string;
  manufacturer?: string;
  origin?: string;
  sourceType?: ProductSourceType;
  /** Image paths; empty uses branded visual fallback. */
  images: string[];
  price: number;
  /**
   * Optional compare-at / strikethrough price when a promotion is defined.
   * Not populated in the current demo catalogue — do not invent values.
   */
  compareAtPrice?: number;
  currency: "INR";
  unit: string;
  stockStatus: StockStatus;
  /** Optional exact qty — omitted for customer-facing demos unless needed. */
  stockQuantity?: number;
  minOrderQuantity?: number;
  bulkAvailable: boolean;
  bulkNotes?: string;
  customizable: boolean;
  customizationTypes?: CustomizationType[];
  /** Visualizer configuration — present only when live preview is supported. */
  customization?: ProductCustomizationConfig;
  /** Outer size (inner size for a hamper box), integer mm, L × B × H (ISO 3394 order). Null until entered. */
  dimensions?: ProductDimensions | null;
  /** Weight in grams; empty (tare) weight for a hamper box. */
  weightG?: number | null;
  /** Hamper boxes only: maximum content weight in grams. */
  maxLoadG?: number | null;
  packingKind?: "item" | "hamper_box";
  /** ISO 780 "this way up" when "upright". */
  orientation?: "any" | "upright";
  fragile?: boolean;
  /** 3D model for the hamper preview: an uploaded .glb or photos of every side (step 6). */
  model3d?: import("@/lib/product3d").Model3d;
  /** Server-computed: size, weight and a complete 3D model are all present. */
  hamperReady?: boolean;
  /** Clean photo of the product alone (transparent PNG, front view) used in the hamper previews. */
  hamperImage?: string;
  /** Hamper boxes only: packing allowances and 3D look (stored in product content). */
  hamperBox?: HamperBoxSettings;
  /** Composite “build your own hamper” configuration (Phase 10C). */
  hamperConfig?: HamperConfig;
  packagingOptions?: PackagingOption[];
  tags: string[];
  featured: boolean;
  active: boolean;
  badge?: string;
  specifications?: ProductSpecifications;
  /**
   * Sold by enquiry only (premium hampers). `price` is 0; the storefront shows
   * "Price on request" and routes buyers to a quote instead of the cart.
   */
  priceOnRequest?: boolean;
  /** Canonical page on the production storefront (imported products only). */
  sourceUrl?: string;
  /** Frontend-only presentation fields. */
  tone: ProductTone;
  visual: ProductVisualKind;
  /** Homepage preview placement — catalogue ignores this. */
  layout?: "featured" | "support" | "rail";
};

export type ProductDimensions = { lengthMm: number; breadthMm: number; heightMm: number };

export type HamperBoxSettings = {
  /** Filler allowance per side, mm (default 10). */
  paddingMm?: number;
  /** Largest share of usable volume contents may take (default 85). */
  maxFillPercent?: number;
  /** Wall thickness for the 3D render, mm (default 6). */
  wallThicknessMm?: number;
  boxStyle?: "kraft" | "rigid" | "basket";
  /** What the box ships with around the products (shown in the preview). */
  filler?: "shred" | "none";
};
