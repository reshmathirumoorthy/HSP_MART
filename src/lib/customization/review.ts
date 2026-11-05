/**
 * Phase 14C — final review validation & summary (derived from session).
 * Does not introduce a second customization state model.
 */

import type { Product } from "@/types/product";
import type {
  AdvancedCustomizationState,
  CustomizationLayer,
  PrintableArea,
  ProductCustomizationConfig,
} from "@/types/customization";
import {
  COLOR_VALUES,
  FONT_LABELS,
  TEXT_ORIENTATION_LABELS,
  clampLayerPosition,
  getSurfacePlacementBounds,
  getZoneById,
  layerHasContent,
  resolveTextOrientation,
  toCartCustomization,
  validateAdvancedState,
  withSyncedActiveZone,
} from "@/components/customization/customization.utils";
import { getSurfaceAllowedElements } from "@/lib/customization/surfaces";
import { formatCustomizationSummaryBlock } from "@/lib/customization/summary";

export type ReviewIssue = {
  level: "error" | "warning";
  surfaceId: string;
  surfaceLabel: string;
  message: string;
};

export type ReviewElementSummary = {
  id: string;
  type: "text" | "logo" | "image";
  label: string;
  detail?: string;
};

export type ReviewSurfaceSummary = {
  surfaceId: string;
  surfaceLabel: string;
  elements: ReviewElementSummary[];
};

export type CustomizationReviewModel = {
  productName: string;
  variantLabel: string | null;
  quantity: number;
  surfaces: ReviewSurfaceSummary[];
  issues: ReviewIssue[];
  warnings: ReviewIssue[];
  errors: ReviewIssue[];
  canAddToCart: boolean;
  summaryHeadline: string | null;
  summaryLines: string[];
};

const NEAR_EDGE_PCT = 2.5;

function elementFootprintHalf(scale: number): number {
  return Math.min(8, Math.max(3, 3 + scale * 1.25)) * 0.35;
}

/** True when clamping would move the element centre. */
export function isElementOutsidePrintableBounds(
  layer: CustomizationLayer,
  bounds: PrintableArea | undefined,
): boolean {
  if (
    !Number.isFinite(layer.x) ||
    !Number.isFinite(layer.y) ||
    layer.x < 0 ||
    layer.x > 100 ||
    layer.y < 0 ||
    layer.y > 100
  ) {
    return true;
  }
  const clamped = clampLayerPosition(layer.x, layer.y, layer.scale, bounds);
  return (
    Math.abs(clamped.x - layer.x) > 0.05 ||
    Math.abs(clamped.y - layer.y) > 0.05
  );
}

/** Non-blocking: inside bounds but close to the printable edge. */
export function isElementNearPrintableEdge(
  layer: CustomizationLayer,
  bounds: PrintableArea | undefined,
  threshold = NEAR_EDGE_PCT,
): boolean {
  if (!bounds || isElementOutsidePrintableBounds(layer, bounds)) return false;
  const half = elementFootprintHalf(layer.scale);
  const minX = bounds.x + half;
  const maxX = bounds.x + bounds.width - half;
  const minY = bounds.y + half;
  const maxY = bounds.y + bounds.height - half;
  const dist = Math.min(
    layer.x - minX,
    maxX - layer.x,
    layer.y - minY,
    maxY - layer.y,
  );
  return dist >= 0 && dist < threshold;
}

function elementLabel(layer: CustomizationLayer): string {
  if (layer.type === "text") {
    const text = layer.text?.trim() ?? "";
    return text ? `Text: “${text}”` : "Text";
  }
  if (layer.type === "logo") {
    return layer.mediaName ? `Logo · ${layer.mediaName}` : "Logo uploaded";
  }
  return layer.mediaName ? `Image · ${layer.mediaName}` : "Image uploaded";
}

function elementDetail(layer: CustomizationLayer): string | undefined {
  if (layer.type !== "text") return undefined;
  const orientation = resolveTextOrientation(layer.textOrientation);
  const font = layer.font ? FONT_LABELS[layer.font] : undefined;
  const parts = [
    orientation === "horizontal"
      ? null
      : `Orientation: ${TEXT_ORIENTATION_LABELS[orientation]}`,
    font ? `Font: ${font}` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : undefined;
}

/**
 * Validate session for final review / add-to-cart gate.
 */
export function validateCustomizationForReview(
  state: AdvancedCustomizationState,
  config: ProductCustomizationConfig,
): ReviewIssue[] {
  const issues: ReviewIssue[] = [];
  if (!state.enabled) {
    issues.push({
      level: "error",
      surfaceId: state.activeZoneId,
      surfaceLabel: "Customization",
      message: "Turn on customization and add a design before reviewing.",
    });
    return issues;
  }

  const contentError = validateAdvancedState(state, config, true);
  if (contentError) {
    issues.push({
      level: "error",
      surfaceId: state.activeZoneId,
      surfaceLabel: "Customization",
      message: contentError,
    });
  }

  const synced = withSyncedActiveZone(state);
  let hasContent = false;

  for (const entry of Object.values(synced.zoneLayers)) {
    const surface = getZoneById(config, entry.zoneId);
    const bounds = getSurfacePlacementBounds(config, entry.zoneId);
    const allowed = getSurfaceAllowedElements(surface, config);
    const objects = entry.objects?.length ? entry.objects : [entry.layer];

    for (const layer of objects) {
      if (!layerHasContent(layer)) continue;
      hasContent = true;
      const label = entry.zoneLabel || surface?.label || entry.zoneId;

      if (!allowed.includes(layer.type)) {
        issues.push({
          level: "error",
          surfaceId: entry.zoneId,
          surfaceLabel: label,
          message: `${label}: ${layer.type} is not allowed on this surface.`,
        });
      }

      if (
        (layer.type === "logo" || layer.type === "image") &&
        !layer.mediaDataUrl
      ) {
        issues.push({
          level: "error",
          surfaceId: entry.zoneId,
          surfaceLabel: label,
          message: `${label}: Image preview unavailable. Please replace the image.`,
        });
      }

      if (
        layer.type === "text" &&
        layer.color &&
        !(layer.color in COLOR_VALUES)
      ) {
        issues.push({
          level: "error",
          surfaceId: entry.zoneId,
          surfaceLabel: label,
          message: `${label}: Unsupported text colour.`,
        });
      }

      if (
        layer.type === "text" &&
        layer.font &&
        !config.preview.fonts.includes(layer.font)
      ) {
        issues.push({
          level: "error",
          surfaceId: entry.zoneId,
          surfaceLabel: label,
          message: `${label}: Unsupported font style.`,
        });
      }

      if (!Number.isFinite(layer.scale) || layer.scale <= 0) {
        issues.push({
          level: "error",
          surfaceId: entry.zoneId,
          surfaceLabel: label,
          message: `${label}: Invalid size.`,
        });
      }

      if (!Number.isFinite(layer.rotation ?? 0)) {
        issues.push({
          level: "error",
          surfaceId: entry.zoneId,
          surfaceLabel: label,
          message: `${label}: Invalid rotation.`,
        });
      }

      if (isElementOutsidePrintableBounds(layer, bounds)) {
        issues.push({
          level: "error",
          surfaceId: entry.zoneId,
          surfaceLabel: label,
          message: `${label}: Your design extends outside the printable area.`,
        });
      } else if (isElementNearPrintableEdge(layer, bounds)) {
        issues.push({
          level: "warning",
          surfaceId: entry.zoneId,
          surfaceLabel: label,
          message: `${label}: Your design is close to the printable edge.`,
        });
      }
    }
  }

  if (!hasContent && !contentError) {
    issues.push({
      level: "error",
      surfaceId: state.activeZoneId,
      surfaceLabel: "Customization",
      message: "Add text, a logo or an image before reviewing.",
    });
  }

  return issues;
}

export function buildCustomizationReviewModel(options: {
  product: Product;
  config: ProductCustomizationConfig;
  state: AdvancedCustomizationState;
  quantity: number;
}): CustomizationReviewModel {
  const { product, config, state, quantity } = options;
  const synced = withSyncedActiveZone(state);
  const variant = config.variants?.find((item) => item.id === synced.variantId);
  const surfaces: ReviewSurfaceSummary[] = [];

  for (const entry of Object.values(synced.zoneLayers)) {
    const objects = (entry.objects?.length ? entry.objects : [entry.layer]).filter(
      layerHasContent,
    );
    if (!objects.length) continue;
    surfaces.push({
      surfaceId: entry.zoneId,
      surfaceLabel: entry.zoneLabel || entry.zoneId,
      elements: objects.map((layer) => ({
        id: layer.id,
        type: layer.type,
        label: elementLabel(layer),
        detail: elementDetail(layer),
      })),
    });
  }

  const issues = validateCustomizationForReview(synced, config);
  const errors = issues.filter((issue) => issue.level === "error");
  const warnings = issues.filter((issue) => issue.level === "warning");
  const cart = toCartCustomization(synced);
  if (cart && variant) {
    cart.variantId = variant.id;
    cart.variantLabel = variant.label;
  }
  const block = formatCustomizationSummaryBlock(cart, variant?.label);

  return {
    productName: product.name,
    variantLabel: variant?.label ?? null,
    quantity,
    surfaces,
    issues,
    warnings,
    errors,
    canAddToCart: errors.length === 0 && surfaces.length > 0,
    summaryHeadline: block.headline,
    summaryLines: block.lines,
  };
}
