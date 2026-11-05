/**
 * Phase 13B — resolve studio surfaces from configuration / real views only.
 * Never invent Cap/Left/Right (etc.) without authored config or a real view image.
 */

import {
  PRIMARY_SURFACE_ID,
  type CustomizationElementType,
  type CustomizationSurface,
  type CustomizationZone,
  type ProductCustomizationConfig,
  type ProductViewKey,
  type ProductViews,
} from "@/types/customization";
import {
  createPrimarySurface,
  getAuthoredSurfaces,
  resolveAllowedElements,
} from "@/lib/customization/defaults";

const VIEW_LABELS: Partial<Record<ProductViewKey, string>> = {
  front: "Body",
  back: "Back",
  left: "Left",
  right: "Right",
  top: "Top",
  bottom: "Bottom",
  cap: "Cap",
  spine: "Spine",
  frontRight: "Front right",
  backRight: "Back right",
  backLeft: "Back left",
  frontLeft: "Front left",
  insideLeft: "Inside left",
  insideRight: "Inside right",
};

function viewHasImage(
  views: ProductViews | undefined,
  key: ProductViewKey | undefined,
): boolean {
  if (!key || !views) return false;
  const url = views[key];
  return typeof url === "string" && url.trim().length > 0;
}

function surfacePreviewImage(
  surface: CustomizationZone,
  config: ProductCustomizationConfig,
): string | undefined {
  if (surface.previewImage?.trim()) return surface.previewImage;
  if (surface.viewKey && config.views?.[surface.viewKey]) {
    return config.views[surface.viewKey];
  }
  return undefined;
}

/**
 * Whether a surface has a real product photograph to show.
 * Surfaces without a view image stay in architecture but are not faked visually.
 */
export function surfaceHasViewAsset(
  surface: CustomizationZone,
  config: ProductCustomizationConfig,
): boolean {
  if (surfacePreviewImage(surface, config)) return true;
  // Legacy single-surface / primary: product photo is the view.
  if (surface.id === PRIMARY_SURFACE_ID || !config.views) {
    return true;
  }
  return viewHasImage(config.views, surface.viewKey);
}

export function getSurfaceAllowedElements(
  surface: CustomizationZone | undefined,
  config: ProductCustomizationConfig,
): CustomizationElementType[] {
  const fromSurface =
    surface?.allowedElementTypes ?? surface?.supportedCustomization;
  if (fromSurface?.length) {
    return fromSurface.filter(
      (type): type is CustomizationElementType =>
        type === "text" || type === "logo" || type === "image",
    );
  }
  return resolveAllowedElements(config);
}

function deriveSurfacesFromViews(
  config: ProductCustomizationConfig,
): CustomizationSurface[] {
  if (!config.views) return [];
  const allowed = resolveAllowedElements(config);
  const area = config.printableArea;
  const entries = Object.entries(config.views).filter(
    (entry): entry is [ProductViewKey, string] =>
      typeof entry[1] === "string" && entry[1].trim().length > 0,
  );

  return entries.map(([key, image], index) => ({
    id: key,
    label: VIEW_LABELS[key] ?? key.charAt(0).toUpperCase() + key.slice(1),
    type: "surface" as const,
    customizable: true,
    enabled: true,
    viewKey: key,
    viewIds: [key],
    previewImage: image,
    supportedCustomization: allowed,
    allowedElementTypes: allowed,
    bounds: area,
    printableRegion: area,
    defaultPosition: area
      ? { x: area.x + area.width / 2, y: area.y + area.height / 2 }
      : { x: 50, y: 50 },
    sortHint: index,
  }));
}

/**
 * Surfaces exposed in the studio UI.
 * Priority: authored surfaces → real views → primary fallback.
 * Does not use product-name / preview-type invented zone catalogues.
 */
export function resolveStudioSurfaces(
  config: ProductCustomizationConfig,
): CustomizationSurface[] {
  const authored = getAuthoredSurfaces(config).filter(
    (surface) => surface.customizable !== false && surface.enabled !== false,
  );

  if (authored.length > 0) {
    return authored;
  }

  const fromViews = deriveSurfacesFromViews(config);
  if (fromViews.length > 0) return fromViews;

  return [
    createPrimarySurface(
      config.printableArea,
      resolveAllowedElements(config),
    ),
  ];
}

/**
 * Prefer surfaces that have a real view asset; if none do, keep the list
 * (legacy primary still customizes on the base product photo).
 */
export function resolveVisibleStudioSurfaces(
  config: ProductCustomizationConfig,
): CustomizationSurface[] {
  const surfaces = resolveStudioSurfaces(config);
  const withViews = surfaces.filter((surface) =>
    surfaceHasViewAsset(surface, config),
  );
  return withViews.length > 0 ? withViews : surfaces;
}

export function reconcileActiveSurfaceId(
  config: ProductCustomizationConfig,
  activeSurfaceId: string | undefined,
): string {
  const surfaces = resolveVisibleStudioSurfaces(config);
  if (activeSurfaceId && surfaces.some((s) => s.id === activeSurfaceId)) {
    return activeSurfaceId;
  }
  const preferred =
    config.defaultSurfaceId ?? config.defaultZoneId ?? surfaces[0]?.id;
  if (preferred && surfaces.some((s) => s.id === preferred)) return preferred;
  return surfaces[0]?.id ?? PRIMARY_SURFACE_ID;
}
