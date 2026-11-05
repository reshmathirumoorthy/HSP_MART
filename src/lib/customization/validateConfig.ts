/**
 * Structural validation for authored ProductCustomizationConfig.
 * Keeps legacy products lenient; reports clear issues for malformed advanced configs.
 */

import type { Product } from "@/types/product";
import type {
  CustomizationSurface,
  ProductCustomizationConfig,
} from "@/types/customization";
import { isValidPrintableArea } from "@/lib/customization/coordinates";
import { getAuthoredSurfaces } from "@/lib/customization/defaults";

export type CustomizationConfigIssue = {
  level: "error" | "warning";
  code:
    | "duplicate-surface-id"
    | "duplicate-view-id"
    | "duplicate-frame-order"
    | "invalid-orbit-sequence"
    | "invalid-surface-ref"
    | "invalid-view-ref"
    | "invalid-element-type"
    | "invalid-coordinates"
    | "invalid-variant-ref"
    | "invalid-image-path"
    | "malformed-customization-config";
  message: string;
  productId?: string;
};

const MEDIA_TYPES = new Set(["text", "logo", "image"]);

function validateSurfaceList(
  surfaces: CustomizationSurface[],
  productId: string,
  issues: CustomizationConfigIssue[],
) {
  const seen = new Set<string>();
  for (const surface of surfaces) {
    if (!surface.id?.trim()) {
      issues.push({
        level: "error",
        code: "malformed-customization-config",
        message: `${productId}: surface missing id`,
        productId,
      });
      continue;
    }
    if (seen.has(surface.id)) {
      issues.push({
        level: "error",
        code: "duplicate-surface-id",
        message: `${productId}: duplicate surface id "${surface.id}"`,
        productId,
      });
    }
    seen.add(surface.id);

    const allowed =
      surface.allowedElementTypes ?? surface.supportedCustomization;
    if (allowed) {
      for (const type of allowed) {
        if (!MEDIA_TYPES.has(type)) {
          issues.push({
            level: "error",
            code: "invalid-element-type",
            message: `${productId}: surface "${surface.id}" has invalid element type "${String(type)}"`,
            productId,
          });
        }
      }
    }

    if (surface.bounds && !isValidPrintableArea(surface.bounds)) {
      issues.push({
        level: "error",
        code: "invalid-coordinates",
        message: `${productId}: surface "${surface.id}" has invalid bounds`,
        productId,
      });
    }
    if (
      surface.printableRegion &&
      !isValidPrintableArea(surface.printableRegion)
    ) {
      issues.push({
        level: "error",
        code: "invalid-coordinates",
        message: `${productId}: surface "${surface.id}" has invalid printableRegion`,
        productId,
      });
    }
  }
}

/**
 * Validate an authored customization config on a product.
 * Returns [] when customization is absent (the missing-config warning is separate).
 */
export function validateProductCustomizationConfig(
  product: Product,
): CustomizationConfigIssue[] {
  const config = product.customization;
  if (!config) return [];

  const productId = product.id || "(unknown)";
  const issues: CustomizationConfigIssue[] = [];

  if (typeof config.enabled !== "boolean") {
    issues.push({
      level: "error",
      code: "malformed-customization-config",
      message: `${productId}: customization.enabled must be boolean`,
      productId,
    });
    return issues;
  }

  if (!config.preview || typeof config.preview !== "object") {
    issues.push({
      level: "error",
      code: "malformed-customization-config",
      message: `${productId}: customization.preview is required when config is present`,
      productId,
    });
    return issues;
  }

  if (
    config.printableArea &&
    !isValidPrintableArea(config.printableArea)
  ) {
    issues.push({
      level: "error",
      code: "invalid-coordinates",
      message: `${productId}: invalid printableArea coordinates`,
      productId,
    });
  }

  const elementSources = [
    ...(config.allowedElements ?? []),
    ...(config.supportedTypes ?? []),
    ...(config.types ?? []),
  ];
  for (const type of elementSources) {
    if (!MEDIA_TYPES.has(type)) {
      issues.push({
        level: "error",
        code: "invalid-element-type",
        message: `${productId}: invalid customization element type "${String(type)}"`,
        productId,
      });
    }
  }

  const surfaces = getAuthoredSurfaces(config);
  validateSurfaceList(surfaces, productId, issues);

  const surfaceIds = new Set(surfaces.map((surface) => surface.id));

  if (config.viewList?.length) {
    const viewIds = new Set<string>();
    const sortOrders = new Set<number>();
    for (const view of config.viewList) {
      if (!view.id?.trim()) {
        issues.push({
          level: "error",
          code: "malformed-customization-config",
          message: `${productId}: viewList entry missing id`,
          productId,
        });
        continue;
      }
      if (viewIds.has(view.id)) {
        issues.push({
          level: "error",
          code: "duplicate-view-id",
          message: `${productId}: duplicate view id "${view.id}"`,
          productId,
        });
      }
      viewIds.add(view.id);

      const image = (view.imageSrc || view.image || "").trim();
      if (!image) {
        issues.push({
          level: "error",
          code: "invalid-view-ref",
          message: `${productId}: view "${view.id}" missing image`,
          productId,
        });
      } else if (!image.startsWith("/") && !image.startsWith("data:")) {
        issues.push({
          level: "warning",
          code: "invalid-image-path",
          message: `${productId}: view "${view.id}" image path should be a local asset ("${image}")`,
          productId,
        });
      }

      if (typeof view.sortOrder === "number") {
        if (sortOrders.has(view.sortOrder)) {
          issues.push({
            level: "error",
            code: "duplicate-frame-order",
            message: `${productId}: duplicate view sortOrder ${view.sortOrder}`,
            productId,
          });
        }
        sortOrders.add(view.sortOrder);
      }

      for (const surfaceId of view.surfaceIds ?? []) {
        if (surfaceIds.size > 0 && !surfaceIds.has(surfaceId)) {
          issues.push({
            level: "error",
            code: "invalid-surface-ref",
            message: `${productId}: view "${view.id}" references unknown surface "${surfaceId}"`,
            productId,
          });
        }
      }
    }

    if (
      config.defaultViewId &&
      !viewIds.has(config.defaultViewId)
    ) {
      issues.push({
        level: "error",
        code: "invalid-view-ref",
        message: `${productId}: defaultViewId "${config.defaultViewId}" not in viewList`,
        productId,
      });
    }

    const orbitTagged = config.viewList.filter((view) => view.isOrbitFrame);
    if (orbitTagged.length > 0 && orbitTagged.length < 8) {
      issues.push({
        level: "warning",
        code: "invalid-orbit-sequence",
        message: `${productId}: ${orbitTagged.length} orbit-tagged views is below the 8-frame orbit threshold — orbit mode will not enable`,
        productId,
      });
    }
  }

  if (config.rotationFrames?.length) {
    const seenFrames = new Set<string>();
    let emptyFrames = 0;
    let duplicateFrames = 0;
    for (const frame of config.rotationFrames) {
      const src = typeof frame === "string" ? frame.trim() : "";
      if (!src) {
        emptyFrames += 1;
        continue;
      }
      if (seenFrames.has(src)) duplicateFrames += 1;
      seenFrames.add(src);
    }
    if (emptyFrames > 0) {
      issues.push({
        level: "error",
        code: "invalid-orbit-sequence",
        message: `${productId}: rotationFrames contains ${emptyFrames} empty image path(s)`,
        productId,
      });
    }
    if (duplicateFrames > 0) {
      issues.push({
        level: "error",
        code: "invalid-orbit-sequence",
        message: `${productId}: rotationFrames contains ${duplicateFrames} duplicate image path(s) — fake orbit frames are not allowed`,
        productId,
      });
    }
    if (
      config.rotationFrames.length >= 8 &&
      seenFrames.size < 8
    ) {
      issues.push({
        level: "error",
        code: "invalid-orbit-sequence",
        message: `${productId}: rotationFrames claims orbit length but fewer than 8 unique photographs`,
        productId,
      });
    }
  }

  for (const surface of surfaces) {
    for (const viewId of surface.viewIds ?? []) {
      if (
        config.viewList?.length &&
        !config.viewList.some((view) => view.id === viewId)
      ) {
        issues.push({
          level: "error",
          code: "invalid-view-ref",
          message: `${productId}: surface "${surface.id}" references unknown view "${viewId}"`,
          productId,
        });
      }
    }
  }

  if (config.defaultSurfaceId && surfaceIds.size > 0) {
    if (!surfaceIds.has(config.defaultSurfaceId)) {
      issues.push({
        level: "error",
        code: "invalid-surface-ref",
        message: `${productId}: defaultSurfaceId "${config.defaultSurfaceId}" not in surfaces`,
        productId,
      });
    }
  }

  if (config.defaultZoneId && surfaceIds.size > 0) {
    if (!surfaceIds.has(config.defaultZoneId)) {
      issues.push({
        level: "error",
        code: "invalid-surface-ref",
        message: `${productId}: defaultZoneId "${config.defaultZoneId}" not in surfaces`,
        productId,
      });
    }
  }

  if (config.variants?.length) {
    const variantIds = new Set<string>();
    for (const variant of config.variants) {
      if (!variant.id?.trim()) {
        issues.push({
          level: "error",
          code: "invalid-variant-ref",
          message: `${productId}: variant missing id`,
          productId,
        });
        continue;
      }
      if (variantIds.has(variant.id)) {
        issues.push({
          level: "error",
          code: "invalid-variant-ref",
          message: `${productId}: duplicate variant id "${variant.id}"`,
          productId,
        });
      }
      variantIds.add(variant.id);
      if (!Array.isArray(variant.images) || variant.images.length === 0) {
        issues.push({
          level: "warning",
          code: "invalid-variant-ref",
          message: `${productId}: variant "${variant.id}" has no images`,
          productId,
        });
      }
    }
    if (
      config.defaultVariantId &&
      !variantIds.has(config.defaultVariantId)
    ) {
      issues.push({
        level: "error",
        code: "invalid-variant-ref",
        message: `${productId}: defaultVariantId "${config.defaultVariantId}" not in variants`,
        productId,
      });
    }
  }

  return issues;
}

export function assertCustomizationConfigShape(
  config: ProductCustomizationConfig,
  productId = "(config)",
): CustomizationConfigIssue[] {
  return validateProductCustomizationConfig({
    id: productId,
    customization: config,
  } as Product);
}
