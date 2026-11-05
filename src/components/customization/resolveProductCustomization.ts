/**
 * Universal customization config resolution.
 * Capability comes from authored Product.customization / views / printableArea —
 * not product-name branching. Surfaces are never invented without real views.
 */

import type { Product } from "@/types/product";
import type {
  CustomizationPreviewType,
  ProductCustomizationConfig,
} from "@/types/customization";
import { resolveCustomizationZones } from "@/components/customization/customization.zones";

function uniqueImages(images: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const url of images) {
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push(url);
  }
  return out;
}

function previewTypeForProduct(product: Product): CustomizationPreviewType {
  switch (product.visual) {
    case "tumbler":
      return "bottle";
    case "notebook":
      return "notebook";
    case "pen":
      return "pen";
    case "folder":
      return "folder";
    case "organizer":
      return "box";
    case "kit":
    default:
      return product.categorySlug === "writing" ? "pen" : "box";
  }
}

function synthesizeConfig(product: Product): ProductCustomizationConfig {
  const previewType = previewTypeForProduct(product);
  const images = uniqueImages(product.images);
  const printableArea = {
    x: 20,
    y: 20,
    width: 60,
    height: 60,
  };

  // Gallery photos are NOT automatic angle views (Phase 13C).
  // Only the primary catalogue image is used unless views are authored.
  const draft: ProductCustomizationConfig = {
    enabled: true,
    types: ["text", "logo", "image"],
    supportedTypes: ["text", "logo", "image"],
    allowedElements: ["text", "logo", "image"],
    printableArea,
    views: images[0] ? { front: images[0] } : undefined,
    preview: {
      type: previewType,
      defaultPlacement:
        previewType === "notebook"
          ? "cover"
          : previewType === "pen"
            ? "side"
            : "front",
      placements:
        previewType === "notebook"
          ? ["cover", "center"]
          : previewType === "pen"
            ? ["side", "front"]
            : ["front", "center"],
      fonts: ["classic", "modern", "bold", "handwritten"],
      colors: ["black", "white", "green", "gold"],
      maxLength:
        previewType === "pen" ? 16 : previewType === "bottle" ? 18 : 24,
      objectPosition: "center",
    },
  };

  const surfaces = resolveCustomizationZones(draft);
  return {
    ...draft,
    surfaces,
    customizationZones: surfaces,
    defaultZoneId: surfaces[0]?.id,
    defaultSurfaceId: surfaces[0]?.id,
  };
}

/**
 * Resolve the studio configuration for any catalogue product.
 *
 * Universal storefront rule: every product can enter the customization studio.
 * Authored Product.customization is preferred; otherwise a safe generic config
 * is synthesized from the product image + visual (never invents extra angles).
 */
export function resolveProductCustomizationConfig(
  product: Product,
): ProductCustomizationConfig {
  if (product.customization?.enabled) {
    const authored = product.customization;
    const surfaces = resolveCustomizationZones(authored);

    return {
      ...authored,
      surfaces,
      customizationZones: surfaces,
      defaultZoneId: authored.defaultZoneId ?? authored.defaultSurfaceId ?? surfaces[0]?.id,
      defaultSurfaceId:
        authored.defaultSurfaceId ?? authored.defaultZoneId ?? surfaces[0]?.id,
      // Keep only authored views / rotationFrames. Never promote gallery
      // photos to angle views — that invents sides Phase 13C forbids.
      rotationFrames: authored.rotationFrames,
      views: authored.views,
      viewList: authored.viewList,
    };
  }

  return synthesizeConfig(product);
}

export function productSupportsCustomizationStudio(product: Product): boolean {
  return Boolean(product?.id) && product.active !== false;
}
