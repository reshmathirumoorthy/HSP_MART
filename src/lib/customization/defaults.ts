/**
 * Safe default customization configuration pieces.
 * Used when a product is customizable but lacks advanced surface/view authorship.
 * Does not invent product-specific print capabilities.
 */

import type { Product } from "@/types/product";
import {
  PRIMARY_SURFACE_ID,
  PRIMARY_VIEW_ID,
  type CustomizationElementType,
  type CustomizationSurface,
  type CustomizationView,
  type PrintableArea,
  type ProductCustomizationConfig,
} from "@/types/customization";

export const DEFAULT_ALLOWED_ELEMENTS: CustomizationElementType[] = [
  "text",
  "logo",
  "image",
];

export const DEFAULT_PRIMARY_PRINTABLE_AREA: PrintableArea = {
  x: 20,
  y: 20,
  width: 60,
  height: 60,
};

/** Single-surface fallback when no authored surfaces/zones exist. */
export function createPrimarySurface(
  printableArea?: PrintableArea,
  allowed: CustomizationElementType[] = DEFAULT_ALLOWED_ELEMENTS,
): CustomizationSurface {
  const area = printableArea ?? DEFAULT_PRIMARY_PRINTABLE_AREA;
  return {
    id: PRIMARY_SURFACE_ID,
    label: "Primary",
    type: "surface",
    customizable: true,
    enabled: true,
    supportedCustomization: allowed,
    allowedElementTypes: allowed,
    bounds: area,
    printableRegion: area,
    viewIds: [PRIMARY_VIEW_ID],
    viewKey: "front",
    defaultPosition: {
      x: area.x + area.width / 2,
      y: area.y + area.height / 2,
    },
  };
}

/** Single-view fallback from a real product image path only. */
export function createPrimaryView(
  image: string,
  surfaceIds: string[] = [PRIMARY_SURFACE_ID],
): CustomizationView {
  return {
    id: PRIMARY_VIEW_ID,
    label: "Primary",
    image,
    sortOrder: 0,
    surfaceIds,
    viewKey: "front",
  };
}

/**
 * Resolve allowed element types from a config without inventing capabilities.
 */
export function resolveAllowedElements(
  config: ProductCustomizationConfig,
): CustomizationElementType[] {
  const fromAlias = config.allowedElements;
  const fromSupported = config.supportedTypes;
  const fromTypes = config.types;
  const raw = fromAlias ?? fromSupported ?? fromTypes;
  if (!raw?.length) return [...DEFAULT_ALLOWED_ELEMENTS];
  const allowed = new Set<CustomizationElementType>();
  for (const entry of raw) {
    if (entry === "text" || entry === "logo" || entry === "image") {
      allowed.add(entry);
    }
  }
  return allowed.size > 0
    ? Array.from(allowed)
    : [...DEFAULT_ALLOWED_ELEMENTS];
}

/**
 * Collect authored surfaces from any legacy alias without synthesizing
 * product-name heuristics (those stay in resolveProductCustomization).
 */
export function getAuthoredSurfaces(
  config: ProductCustomizationConfig,
): CustomizationSurface[] {
  return (
    config.surfaces ??
    config.customizationZones ??
    config.zones ??
    []
  );
}

/**
 * Build first-class views from authored viewList, views map, rotationFrames,
 * or a single primary product image. Never invents angles.
 */
export function resolveCustomizationViews(
  config: ProductCustomizationConfig,
  productImages: string[] = [],
): CustomizationView[] {
  if (config.viewList?.length) {
    return [...config.viewList].sort((a, b) => a.sortOrder - b.sortOrder);
  }

  const surfaceIds = getAuthoredSurfaces(config).map((surface) => surface.id);
  const fallbackSurfaceIds =
    surfaceIds.length > 0 ? surfaceIds : [PRIMARY_SURFACE_ID];

  if (config.views) {
    const entries = Object.entries(config.views).filter(
      (entry): entry is [string, string] => Boolean(entry[1]),
    );
    if (entries.length > 0) {
      return entries.map(([key, image], index) => ({
        id: key,
        label: key,
        image,
        sortOrder: index,
        surfaceIds: fallbackSurfaceIds,
        viewKey: key as CustomizationView["viewKey"],
      }));
    }
  }

  if (config.rotationFrames?.length) {
    return config.rotationFrames.map((image, index) => ({
      id: `frame-${index}`,
      label: `View ${index + 1}`,
      image,
      sortOrder: index,
      surfaceIds: fallbackSurfaceIds,
    }));
  }

  const primaryImage =
    productImages.find((src) => typeof src === "string" && src.trim()) ??
    "";
  if (!primaryImage) return [];
  return [createPrimaryView(primaryImage, fallbackSurfaceIds)];
}

/**
 * Ensure a resolved config always has at least one surface + default ids.
 * Does not mutate the original product record.
 */
export function withSafeCustomizationDefaults(
  config: ProductCustomizationConfig,
  product?: Pick<Product, "images">,
): ProductCustomizationConfig {
  const allowed = resolveAllowedElements(config);
  let surfaces = getAuthoredSurfaces(config);
  if (surfaces.length === 0) {
    surfaces = [
      createPrimarySurface(config.printableArea, allowed),
    ];
  }

  const defaultSurfaceId =
    config.defaultSurfaceId ??
    config.defaultZoneId ??
    surfaces[0]?.id ??
    PRIMARY_SURFACE_ID;

  const viewList = resolveCustomizationViews(config, product?.images ?? []);
  const defaultViewId =
    config.defaultViewId ?? viewList[0]?.id ?? PRIMARY_VIEW_ID;

  return {
    ...config,
    supportedTypes: allowed,
    allowedElements: allowed,
    surfaces,
    customizationZones: surfaces,
    defaultZoneId: defaultSurfaceId,
    defaultSurfaceId: defaultSurfaceId,
    viewList: viewList.length > 0 ? viewList : config.viewList,
    defaultViewId,
  };
}
