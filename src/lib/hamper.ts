/**
 * Hamper builder helpers — extends Phase 10B customization utilities.
 */

import { getProductById } from "@/lib/products";
import { isInStock } from "@/lib/productAvailability";
import type { Product } from "@/types/product";
import type {
  AdvancedCustomizationState,
  CartCustomization,
  CartHamperContent,
  CustomizationLayer,
} from "@/types/customization";
import type {
  HamperConfig,
  HamperPreviewLayer,
  HamperStep,
} from "@/types/hamper";
import {
  COLOR_VALUES,
  clampLayerPosition,
  clampRotation,
  clampScale,
  createDefaultLayer,
  resolveTextOrientation,
  sanitizeCustomizationText,
  validateAdvancedState,
} from "@/components/customization/customization.utils";

/** Fallback slot placements when a child product has no preview override. */
const SLOT_LAYOUTS: HamperPreviewLayer[] = [
  { x: 32, y: 38, scale: 0.9, rotation: -4, zIndex: 2 },
  { x: 68, y: 36, scale: 0.85, rotation: 5, zIndex: 3 },
  { x: 28, y: 62, scale: 0.75, rotation: -8, zIndex: 4 },
  { x: 52, y: 58, scale: 0.7, rotation: 2, zIndex: 5 },
  { x: 74, y: 64, scale: 0.72, rotation: 6, zIndex: 6 },
  { x: 50, y: 48, scale: 0.68, rotation: 0, zIndex: 3 },
];

/** Visual-kind biased defaults — keyed by product.visual, not product.name. */
const VISUAL_LAYOUT: Partial<
  Record<Product["visual"], Partial<HamperPreviewLayer>>
> = {
  notebook: { scale: 0.95, zIndex: 2, rotation: -3 },
  tumbler: { scale: 0.88, zIndex: 3, rotation: 0 },
  pen: { scale: 0.7, zIndex: 5, rotation: -18 },
  organizer: { scale: 0.78, zIndex: 4, rotation: 2 },
  folder: { scale: 0.82, zIndex: 3, rotation: -2 },
  kit: { scale: 0.72, zIndex: 4, rotation: 1 },
};

export type HamperBuilderState = {
  step: HamperStep;
  /** Ordered product ids filling slots (unique in slots mode). */
  selectedIds: string[];
  /** Slot index currently being replaced, or null. */
  replacingIndex: number | null;
  brandingEnabled: boolean;
  branding: AdvancedCustomizationState;
  search: string;
  categoryFilter: string;
};

export function createDefaultHamperBranding(
  config: HamperConfig,
  productCustomizationMaxLength = 20,
): AdvancedCustomizationState {
  const mediaType = config.brandingTypes[0] ?? "text";
  const layer: CustomizationLayer = {
    id: "hamper-branding",
    type: mediaType,
    text: "",
    font: "classic",
    color: "green",
    x: 50,
    y: 50,
    scale: 1,
    rotation: 0,
    opacity: 1,
  };
  const resolvedLayer = {
    ...layer,
    text: sanitizeCustomizationText("", productCustomizationMaxLength),
  };
  return {
    enabled: false,
    variantId: "",
    activeZoneId: "front",
    activeObjectId: resolvedLayer.id,
    mediaType,
    layer: resolvedLayer,
    zoneLayers: {
      front: {
        zoneId: "front",
        zoneLabel: "Hamper Front",
        objects: [resolvedLayer],
        activeObjectId: resolvedLayer.id,
        mediaType,
        layer: resolvedLayer,
      },
    },
  };
}

export function createDefaultHamperState(
  config: HamperConfig,
  maxLength = 20,
): HamperBuilderState {
  const defaults = (config.defaultContents ?? [])
    .filter((id) => config.availableProducts.some((item) => item.productId === id))
    .slice(0, config.slots);

  return {
    step: "contents",
    selectedIds: defaults,
    replacingIndex: null,
    brandingEnabled: false,
    branding: createDefaultHamperBranding(config, maxLength),
    search: "",
    categoryFilter: "all",
  };
}

export function resolveHamperProducts(config: HamperConfig): Product[] {
  return config.availableProducts
    .map((entry) => getProductById(entry.productId))
    .filter((product): product is Product => Boolean(product));
}

export function filterHamperProducts(
  products: Product[],
  search: string,
  categoryFilter: string,
): Product[] {
  const q = search.trim().toLowerCase();
  return products.filter((product) => {
    if (categoryFilter !== "all" && product.categorySlug !== categoryFilter) {
      return false;
    }
    if (!q) return true;
    const haystack = [
      product.name,
      product.sku,
      product.category,
      product.shortDescription,
      ...product.tags,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function hamperCategories(products: Product[]): Array<{
  slug: string;
  label: string;
}> {
  const map = new Map<string, string>();
  for (const product of products) {
    map.set(product.categorySlug, product.category);
  }
  return Array.from(map.entries()).map(([slug, label]) => ({ slug, label }));
}

export function canSelectProduct(
  product: Product,
  selectedIds: string[],
  slots: number,
  replacingIndex: number | null,
): { ok: boolean; reason?: string } {
  if (!isInStock(product)) {
    return { ok: false, reason: "Out of stock" };
  }
  if (selectedIds.includes(product.id) && replacingIndex === null) {
    return { ok: false, reason: "Already selected" };
  }
  if (replacingIndex === null && selectedIds.length >= slots) {
    return { ok: false, reason: "All slots filled" };
  }
  return { ok: true };
}

export function toggleOrReplaceSelection(
  selectedIds: string[],
  productId: string,
  slots: number,
  replacingIndex: number | null,
): { selectedIds: string[]; replacingIndex: number | null } {
  const product = getProductById(productId);
  if (!product || !isInStock(product)) {
    return { selectedIds, replacingIndex };
  }

  if (replacingIndex !== null) {
    const next = [...selectedIds];
    if (next.includes(productId) && next[replacingIndex] !== productId) {
      return { selectedIds, replacingIndex };
    }
    next[replacingIndex] = productId;
    return { selectedIds: next, replacingIndex: null };
  }

  if (selectedIds.includes(productId)) {
    return {
      selectedIds: selectedIds.filter((id) => id !== productId),
      replacingIndex: null,
    };
  }

  if (selectedIds.length >= slots) {
    return { selectedIds, replacingIndex };
  }

  return {
    selectedIds: [...selectedIds, productId],
    replacingIndex: null,
  };
}

export function removeHamperSelection(
  selectedIds: string[],
  productId: string,
): string[] {
  return selectedIds.filter((id) => id !== productId);
}

export function resolvePreviewLayer(
  config: HamperConfig,
  product: Product,
  slotIndex: number,
): HamperPreviewLayer {
  const entry = config.availableProducts.find(
    (item) => item.productId === product.id,
  );
  const slot = SLOT_LAYOUTS[slotIndex % SLOT_LAYOUTS.length];
  const visual = VISUAL_LAYOUT[product.visual] ?? {};
  return {
    x: entry?.preview?.x ?? visual.x ?? slot.x,
    y: entry?.preview?.y ?? visual.y ?? slot.y,
    scale: entry?.preview?.scale ?? visual.scale ?? slot.scale,
    rotation: entry?.preview?.rotation ?? visual.rotation ?? slot.rotation,
    zIndex: entry?.preview?.zIndex ?? visual.zIndex ?? slot.zIndex,
  };
}

export function validateHamperContents(
  selectedIds: string[],
  config: HamperConfig,
  required: boolean,
): string | null {
  if (!required) return null;
  if (selectedIds.length === 0) {
    return "Choose at least one product for your hamper.";
  }
  if (selectedIds.length < config.slots) {
    return `Select ${config.slots} products (${selectedIds.length} / ${config.slots}).`;
  }
  return null;
}

export function validateHamperForCart(
  state: HamperBuilderState,
  config: HamperConfig,
  maxLength: number,
): string | null {
  const contentsError = validateHamperContents(state.selectedIds, config, true);
  if (contentsError) return contentsError;

  if (state.brandingEnabled) {
    const brandingConfig = {
      enabled: true,
      supportedTypes: config.brandingTypes,
      printableArea: config.brandingArea,
      preview: {
        type: "box" as const,
        defaultPlacement: "center" as const,
        placements: ["center" as const],
        fonts: ["classic" as const, "modern" as const, "bold" as const, "handwritten" as const],
        colors: ["black" as const, "white" as const, "green" as const, "gold" as const],
        maxLength,
      },
    };
    return validateAdvancedState(state.branding, brandingConfig, true);
  }

  return null;
}

export function toHamperCartCustomization(
  state: HamperBuilderState,
): CartCustomization | undefined {
  if (state.selectedIds.length === 0) return undefined;

  const contents: CartHamperContent[] = state.selectedIds.map((productId) => ({
    productId,
    quantity: 1,
  }));

  const base: CartCustomization = {
    hamper: true,
    contents,
  };

  if (!state.brandingEnabled) {
    return base;
  }

  const branding = state.branding;
  if (branding.mediaType === "text") {
    const text = branding.layer.text?.trim() ?? "";
    if (!text) return base;
    return {
      ...base,
      type: "text",
      text,
      font: branding.layer.font ?? "classic",
      color: branding.layer.color ?? "green",
      colorValue: COLOR_VALUES[branding.layer.color ?? "green"],
      textOrientation: resolveTextOrientation(branding.layer.textOrientation),
      x: branding.layer.x,
      y: branding.layer.y,
      scale: branding.layer.scale,
      rotation: clampRotation(branding.layer.rotation ?? 0),
    };
  }

  if (!branding.layer.mediaDataUrl) return base;

  return {
    ...base,
    type: branding.mediaType,
    text: branding.layer.mediaName || branding.mediaType,
    mediaName: branding.layer.mediaName,
    mediaDataUrl: branding.layer.mediaDataUrl,
    x: branding.layer.x,
    y: branding.layer.y,
    scale: branding.layer.scale,
    rotation: clampRotation(branding.layer.rotation ?? 0),
  };
}

export function updateHamperBrandingLayer(
  branding: AdvancedCustomizationState,
  partial: Partial<CustomizationLayer>,
  maxLength: number,
): AdvancedCustomizationState {
  const nextLayer = { ...branding.layer, ...partial };
  if (typeof partial.text === "string") {
    nextLayer.text = sanitizeCustomizationText(partial.text, maxLength);
  }
  if (typeof partial.scale === "number") {
    nextLayer.scale = clampScale(partial.scale);
  }
  if (typeof partial.rotation === "number") {
    nextLayer.rotation = clampRotation(partial.rotation);
  }
  if (typeof partial.x === "number" || typeof partial.y === "number") {
    const clamped = clampLayerPosition(
      partial.x ?? nextLayer.x,
      partial.y ?? nextLayer.y,
      nextLayer.scale,
    );
    nextLayer.x = clamped.x;
    nextLayer.y = clamped.y;
  }
  return { ...branding, layer: nextLayer };
}

export function createDefaultLayerForHamper(
  mediaType: AdvancedCustomizationState["mediaType"],
): CustomizationLayer {
  return {
    ...createDefaultLayer(
      {
        enabled: true,
        supportedTypes: ["text", "logo", "image"],
        preview: {
          type: "box",
          defaultPlacement: "center",
          placements: ["center"],
          fonts: ["classic", "modern", "bold", "handwritten"],
          colors: ["black", "white", "green", "gold"],
          maxLength: 20,
        },
      },
      mediaType,
    ),
    color: "green",
  };
}
