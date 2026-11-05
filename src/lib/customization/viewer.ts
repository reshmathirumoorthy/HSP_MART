/**
 * Phase 13C — real multi-view / orbit frame resolution.
 *
 * Rules:
 * - Never invent angles or duplicate one photo as another side.
 * - Gallery images are NOT automatic views (may be details / packaging).
 * - Orbit only when authored sequential frames >= ORBIT_MIN_FRAMES.
 */

import type { Product } from "@/types/product";
import type {
  CustomizationView,
  ProductCustomizationConfig,
  ProductViewKey,
  ProductViews,
} from "@/types/customization";
import { PRIMARY_VIEW_ID } from "@/types/customization";

/** Minimum distinct authored sequential frames required for orbit interaction. */
export const ORBIT_MIN_FRAMES = 8;

export const VIEWER_DRAG = {
  desktopPixelsPerFrame: 28,
  mobilePixelsPerFrame: 22,
} as const;

export type ViewerMode = "single" | "multi" | "orbit";

export type ResolvedProductView = {
  id: string;
  label: string;
  image: string;
  angle?: number;
  sortOrder: number;
  viewKey?: ProductViewKey;
  surfaceIds?: string[];
  isOrbitFrame?: boolean;
  variantId?: string;
};

export type ProductViewerResolution = {
  mode: ViewerMode;
  views: ResolvedProductView[];
  /** Image paths in display order (same length as views). */
  frames: string[];
  orbitEnabled: boolean;
  /** Accurate UI label — never "360°" unless orbit is enabled. */
  statusLabel: string;
  unavailableReason: string | null;
  primaryIndex: number;
};

const VIEW_LABELS: Partial<Record<string, string>> = {
  front: "Front",
  back: "Back",
  left: "Left",
  right: "Right",
  top: "Top",
  bottom: "Bottom",
  cap: "Cap",
  spine: "Spine",
  frontRight: "Front right",
  frontLeft: "Front left",
  backRight: "Back right",
  backLeft: "Back left",
  insideLeft: "Inside left",
  insideRight: "Inside right",
  primary: "Primary",
};

const VIEW_ORDER: ProductViewKey[] = [
  "front",
  "frontRight",
  "right",
  "backRight",
  "back",
  "backLeft",
  "left",
  "frontLeft",
  "top",
  "bottom",
  "cap",
  "spine",
  "insideLeft",
  "insideRight",
];

function uniqueUrls(urls: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const url of urls) {
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push(url);
  }
  return out;
}

function viewImage(view: CustomizationView): string {
  return (view.imageSrc || view.image || "").trim();
}

function labelForId(id: string): string {
  return VIEW_LABELS[id] ?? id.charAt(0).toUpperCase() + id.slice(1);
}

function fromViewList(list: CustomizationView[]): ResolvedProductView[] {
  const resolved: ResolvedProductView[] = [];
  [...list].forEach((view, index) => {
    const image = viewImage(view);
    if (!image) return;
    resolved.push({
      id: view.id || `view-${index}`,
      label: view.label || labelForId(view.id || `view-${index}`),
      image,
      angle: view.angle,
      sortOrder: view.sortOrder ?? index,
      viewKey: view.viewKey,
      surfaceIds: view.surfaceIds,
      isOrbitFrame: view.isOrbitFrame,
      variantId: view.variantId,
    });
  });
  return resolved.sort((a, b) => a.sortOrder - b.sortOrder);
}

function fromViewsMap(views: ProductViews): ResolvedProductView[] {
  return VIEW_ORDER.filter((key) => Boolean(views[key])).map((key, index) => ({
    id: key,
    label: labelForId(key),
    image: views[key] as string,
    sortOrder: index,
    viewKey: key,
    isOrbitFrame: false,
  }));
}

function fromOrbitFrames(frames: string[]): ResolvedProductView[] {
  return uniqueUrls(frames).map((image, index) => ({
    id: `orbit-${index}`,
    label: `View ${index + 1}`,
    image,
    angle: frames.length > 1 ? (index * 360) / frames.length : 0,
    sortOrder: index,
    isOrbitFrame: true,
  }));
}

/**
 * Resolve discrete product views from authored configuration only.
 * Does not treat arbitrary gallery photos as angles.
 */
export function getAvailableProductViews(
  product: Product,
  config: ProductCustomizationConfig,
  variantId?: string,
): ResolvedProductView[] {
  let views: ResolvedProductView[] = [];

  if (config.viewList?.length) {
    views = fromViewList(config.viewList);
  } else if (config.views && Object.keys(config.views).length > 0) {
    views = fromViewsMap(config.views);
  } else if (
    config.rotationFrames?.length &&
    config.rotationFrames.length >= ORBIT_MIN_FRAMES
  ) {
    // Only treat rotationFrames as views when they form an orbit-eligible set.
    views = fromOrbitFrames(config.rotationFrames);
  } else if (config.rotationFrames?.length === 2 || config.rotationFrames?.length === 3) {
    // Short authored rotationFrames (e.g. front/back) may be discrete multi-view.
    views = uniqueUrls(config.rotationFrames).map((image, index) => ({
      id: index === 0 ? "front" : index === 1 ? "back" : `view-${index}`,
      label:
        index === 0 ? "Front" : index === 1 ? "Back" : `View ${index + 1}`,
      image,
      sortOrder: index,
      viewKey: (index === 0
        ? "front"
        : index === 1
          ? "back"
          : undefined) as ProductViewKey | undefined,
      isOrbitFrame: false,
    }));
  }

  if (views.length === 0) {
    const primary =
      product.images.find((src) => typeof src === "string" && src.trim()) ?? "";
    if (!primary) return [];
    views = [
      {
        id: PRIMARY_VIEW_ID,
        label: "Primary",
        image: primary,
        sortOrder: 0,
        viewKey: "front",
        isOrbitFrame: false,
      },
    ];
  }

  return applyVariantImages(views, config, variantId);
}

function applyVariantImages(
  views: ResolvedProductView[],
  config: ProductCustomizationConfig,
  variantId?: string,
): ResolvedProductView[] {
  if (!variantId) return views;
  const variant = config.variants?.find((item) => item.id === variantId);
  if (!variant?.images?.length) return views;

  // Variant-specific viewList entries already tagged — keep them.
  if (views.some((view) => view.variantId === variantId)) {
    return views.filter(
      (view) => !view.variantId || view.variantId === variantId,
    );
  }

  const variantImages = uniqueUrls(variant.images);

  // One variant photo: replace primary/front only — never borrow other colours.
  if (variantImages.length === 1) {
    return views.map((view) => {
      if (view.viewKey === "front" || view.id === "front" || view.id === PRIMARY_VIEW_ID) {
        return { ...view, image: variantImages[0], variantId };
      }
      // First view fallback when no front key
      if (view.sortOrder === 0 && !views.some((v) => v.viewKey === "front")) {
        return { ...view, image: variantImages[0], variantId };
      }
      return view;
    });
  }

  // Multiple variant photos: map by index onto existing view slots only.
  return views.map((view, index) => {
    const image = variantImages[index];
    if (!image) return view;
    return { ...view, image, variantId };
  });
}

export function clampFrameIndex(index: number, frameCount: number): number {
  if (frameCount <= 0) return 0;
  if (!Number.isFinite(index)) return 0;
  return Math.min(frameCount - 1, Math.max(0, Math.trunc(index)));
}

export function wrapFrameIndex(index: number, frameCount: number): number {
  if (frameCount <= 0) return 0;
  return ((Math.trunc(index) % frameCount) + frameCount) % frameCount;
}

export function frameIndexFromDrag(options: {
  originIndex: number;
  deltaX: number;
  frameCount: number;
  pixelsPerFrame?: number;
  /** Invert so dragging right shows "rotating" product naturally. */
  invert?: boolean;
}): number {
  const {
    originIndex,
    deltaX,
    frameCount,
    pixelsPerFrame = VIEWER_DRAG.desktopPixelsPerFrame,
    invert = true,
  } = options;
  if (frameCount <= 1) return 0;
  const steps = Math.trunc(deltaX / Math.max(1, pixelsPerFrame));
  const signed = invert ? -steps : steps;
  return wrapFrameIndex(originIndex + signed, frameCount);
}

export function resolvePrimaryViewIndex(
  views: ResolvedProductView[],
  preferredViewId?: string,
): number {
  if (!views.length) return 0;
  if (preferredViewId) {
    const idx = views.findIndex((view) => view.id === preferredViewId);
    if (idx >= 0) return idx;
  }
  const front = views.findIndex(
    (view) => view.viewKey === "front" || view.id === "front",
  );
  return front >= 0 ? front : 0;
}

export function findViewIndexForSurface(
  views: ResolvedProductView[],
  surface: {
    viewKey?: ProductViewKey;
    viewIds?: string[];
    previewImage?: string;
    frameIndex?: number;
  },
): number {
  if (!views.length) return 0;
  if (surface.viewIds?.length) {
    for (const id of surface.viewIds) {
      const idx = views.findIndex((view) => view.id === id);
      if (idx >= 0) return idx;
    }
  }
  if (surface.viewKey) {
    const idx = views.findIndex(
      (view) => view.viewKey === surface.viewKey || view.id === surface.viewKey,
    );
    if (idx >= 0) return idx;
  }
  if (surface.previewImage) {
    const idx = views.findIndex((view) => view.image === surface.previewImage);
    if (idx >= 0) return idx;
  }
  if (
    typeof surface.frameIndex === "number" &&
    surface.frameIndex >= 0 &&
    surface.frameIndex < views.length
  ) {
    return surface.frameIndex;
  }
  return resolvePrimaryViewIndex(views);
}

/**
 * Full viewer resolution for a product + variant.
 * Gallery photos are never promoted to multi-view/orbit without authorship.
 */
export function resolveProductViewerState(
  product: Product,
  config: ProductCustomizationConfig,
  variantId?: string,
): ProductViewerResolution {
  const views = getAvailableProductViews(product, config, variantId);
  const frames = views.map((view) => view.image);
  const primaryIndex = resolvePrimaryViewIndex(views, config.defaultViewId);

  const authoredOrbitFrames = uniqueUrls(config.rotationFrames ?? []);
  const orbitCandidate =
    authoredOrbitFrames.length >= ORBIT_MIN_FRAMES
      ? authoredOrbitFrames
      : views.every((view) => view.isOrbitFrame) &&
          views.length >= ORBIT_MIN_FRAMES
        ? frames
        : [];

  // Variant photo outside the orbit sequence → single-view for that colour.
  const variant = config.variants?.find((item) => item.id === variantId);
  const variantPhoto = variant?.images?.[0];
  if (
    orbitCandidate.length >= ORBIT_MIN_FRAMES &&
    variantPhoto &&
    !orbitCandidate.includes(variantPhoto)
  ) {
    return {
      mode: "single",
      views: [
        {
          id: "variant-primary",
          label: variant?.label ?? "Primary",
          image: variantPhoto,
          sortOrder: 0,
          variantId,
        },
      ],
      frames: [variantPhoto],
      orbitEnabled: false,
      statusLabel: "Single product view",
      unavailableReason:
        "Orbit unavailable for this colour because a verified multi-angle sequence is not present for the variant.",
      primaryIndex: 0,
    };
  }

  if (orbitCandidate.length >= ORBIT_MIN_FRAMES) {
    const orbitViews =
      views.length === orbitCandidate.length &&
      views.every((view) => view.isOrbitFrame)
        ? views
        : fromOrbitFrames(orbitCandidate);
    return {
      mode: "orbit",
      views: orbitViews,
      frames: orbitViews.map((view) => view.image),
      orbitEnabled: true,
      statusLabel: `Orbit · ${orbitViews.length} frames`,
      unavailableReason: null,
      primaryIndex: 0,
    };
  }

  if (views.length >= 2) {
    return {
      mode: "multi",
      views,
      frames,
      orbitEnabled: false,
      statusLabel: `${views.length} views`,
      unavailableReason:
        "Drag-to-rotate orbit needs 8+ sequential product-angle photographs. Use the view controls to switch available sides.",
      primaryIndex,
    };
  }

  return {
    mode: "single",
    views,
    frames,
    orbitEnabled: false,
    statusLabel: "Single product view",
    unavailableReason:
      "Additional verified product-angle photography is not present for this product.",
    primaryIndex,
  };
}

/** @deprecated Prefer resolveProductViewerState — kept for existing call sites. */
export function resolveViewerFrames(
  product: Product,
  config: ProductCustomizationConfig,
  variantId: string,
): {
  frames: string[];
  orbitEnabled: boolean;
  unavailableReason: string | null;
  mode: ViewerMode;
  views: ResolvedProductView[];
  statusLabel: string;
  primaryIndex: number;
} {
  const resolved = resolveProductViewerState(product, config, variantId);
  return {
    frames: resolved.frames,
    orbitEnabled: resolved.orbitEnabled,
    unavailableReason: resolved.unavailableReason,
    mode: resolved.mode,
    views: resolved.views,
    statusLabel: resolved.statusLabel,
    primaryIndex: resolved.primaryIndex,
  };
}
