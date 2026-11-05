/**
 * Phase 12A — storefront product helpers over the canonical Product type.
 * Do not invent a second product model; extend accessors around `@/types/product`.
 */

import { products } from "@/data/products";
import type { CartCustomization } from "@/types/customization";
import type { Product } from "@/types/product";
import { isInStock } from "@/lib/productAvailability";
import { createDefaultHamperState, toHamperCartCustomization } from "@/lib/hamper";

/** Alias clarifying that Product is the storefront catalogue record. */
export type StorefrontProduct = Product;

export type CustomizationSurfaceSummary = {
  id: string;
  label: string;
};

export function getActiveStorefrontProducts(
  source: Product[] = products,
): Product[] {
  return source.filter((product) => product.active);
}

export function getPrimaryProductImage(product: Product): string | undefined {
  return product.images[0];
}

export function getProductHref(product: Product): string {
  return `/products/${product.slug}`;
}

/**
 * Universal storefront rule: every active catalogue product is customizable.
 * Prefer this helper over reading `product.customizable` in UI eligibility checks.
 */
export function isProductCustomizable(product: Product): boolean {
  return Boolean(product?.id) && product.active !== false;
}

/**
 * Surfaces available for customization when configured.
 * Reads surfaces / customizationZones / zones aliases (Phase 13A).
 * Returns [] when there is no authored surface config (studio may still synthesize).
 */
export function getCustomizationSurfaces(
  product: Product,
): CustomizationSurfaceSummary[] {
  if (!isProductCustomizable(product) || !product.customization) return [];

  const zones =
    product.customization.surfaces ??
    product.customization.customizationZones ??
    product.customization.zones;
  if (!zones?.length) return [];

  return zones.map((zone) => ({
    id: zone.id,
    label: zone.label,
  }));
}

export function hasVerifiedProductImage(product: Product): boolean {
  return product.images.some(
    (src) => typeof src === "string" && src.trim().length > 0,
  );
}

/**
 * Former interactive hamper/builder gate — kept as a no-op so gift sets
 * shop like catalogue products (default contents) instead of a builder UI.
 */
export function requiresProductBuildFlow(product: Product): boolean {
  void product;
  return false;
}

/** Safe catalogue quick-add for in-stock products, including curated gift sets. */
export function canQuickAdd(product: Product): boolean {
  return isInStock(product);
}

/**
 * Optional cart customization for quick-add:
 * default variant when authored, or curated hamper defaults when present.
 */
export function getQuickAddCustomization(
  product: Product,
): CartCustomization | undefined {
  if (product.hamperConfig?.enabled) {
    const config = product.hamperConfig;
    let state = createDefaultHamperState(config);
    if (state.selectedIds.length === 0) {
      state = {
        ...state,
        selectedIds: config.availableProducts
          .slice(0, config.slots)
          .map((item) => item.productId),
      };
    }
    return toHamperCartCustomization(state);
  }

  const variants = product.customization?.variants;
  if (!variants?.length) return undefined;

  const defaultId = product.customization?.defaultVariantId;
  const variant =
    variants.find((item) => item.id === defaultId) ?? variants[0];
  if (!variant?.id) return undefined;

  return {
    variantId: variant.id,
    variantLabel: variant.label,
  };
}

/** Honest card chips — only surface capabilities present on the product record. */
export function getProductCapabilityLabels(product: Product): string[] {
  const labels: string[] = [];
  if (product.hamperConfig?.enabled) {
    labels.push("Gift set");
  } else if (product.customizable) {
    labels.push("Customizable");
  }
  if (product.bulkAvailable) {
    labels.push("Bulk available");
  }
  return labels;
}
