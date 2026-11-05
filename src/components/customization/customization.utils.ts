import { getProductById } from "@/lib/products";
import type {
  AdvancedCustomizationState,
  CartCustomization,
  CartZoneCustomization,
  CustomizationColorOption,
  CustomizationFontOption,
  CustomizationLayer,
  CustomizationMediaType,
  CustomizationOverlayTransform,
  CustomizationPlacementOption,
  CustomizationPreviewType,
  CustomizationState,
  CustomizationZone,
  PrintableArea,
  ProductCustomizationConfig,
  ProductVariantOption,
  TextOrientation,
  ZoneLayerState,
} from "@/types/customization";
import {
  getDefaultZoneId,
  getZoneById,
  resolveCustomizationZones,
} from "@/components/customization/customization.zones";

export {
  resolveCustomizationZones,
  getDefaultZoneId,
  getZoneById,
  resolveViewerFrames,
  resolveZoneFrameIndex,
  resolveConfiguredRotationFrames,
  DEFAULT_ZONES_BY_TYPE,
} from "@/components/customization/customization.zones";

export const FONT_LABELS: Record<CustomizationFontOption, string> = {
  classic: "Classic",
  modern: "Modern",
  bold: "Bold",
  handwritten: "Handwritten",
};

export const TEXT_ORIENTATION_LABELS: Record<TextOrientation, string> = {
  horizontal: "Horizontal",
  vertical: "Vertical",
  "vertical-reverse": "Vertical Reverse",
  "horizontal-reverse": "Reverse",
};

export const TEXT_ORIENTATION_OPTIONS: Array<{
  id: TextOrientation;
  label: string;
  ariaLabel: string;
}> = [
  {
    id: "horizontal",
    label: TEXT_ORIENTATION_LABELS.horizontal,
    ariaLabel: "Horizontal text, left to right",
  },
  {
    id: "vertical",
    label: TEXT_ORIENTATION_LABELS.vertical,
    ariaLabel: "Vertical text, top to bottom",
  },
  {
    id: "vertical-reverse",
    label: TEXT_ORIENTATION_LABELS["vertical-reverse"],
    ariaLabel: "Vertical text, bottom to top",
  },
  {
    id: "horizontal-reverse",
    label: TEXT_ORIENTATION_LABELS["horizontal-reverse"],
    ariaLabel: "Horizontal text, right to left",
  },
];

/**
 * Configurable gap between upright characters in vertical text mode (px).
 * Kept as a constant — not exposed as a customer control.
 */
export const VERTICAL_TEXT_CHAR_GAP_PX = 4;

export function resolveTextOrientation(
  value: TextOrientation | undefined | null,
): TextOrientation {
  if (
    value === "vertical" ||
    value === "vertical-reverse" ||
    value === "horizontal-reverse"
  ) {
    return value;
  }
  return "horizontal";
}

export function isVerticalTextOrientation(
  value: TextOrientation | undefined | null,
): boolean {
  const orientation = resolveTextOrientation(value);
  return orientation === "vertical" || orientation === "vertical-reverse";
}

export const COLOR_LABELS: Record<CustomizationColorOption, string> = {
  black: "Black",
  white: "White",
  green: "Green",
  gold: "Gold",
};

export const PLACEMENT_LABELS: Record<CustomizationPlacementOption, string> = {
  front: "Front",
  center: "Center",
  side: "Side",
  cover: "Cover",
};

export const MEDIA_TYPE_LABELS: Record<CustomizationMediaType, string> = {
  text: "Text",
  logo: "Logo",
  image: "Image",
};

export const COLOR_VALUES: Record<CustomizationColorOption, string> = {
  black: "#1c211d",
  white: "#f6f2e9",
  green: "#015c31",
  gold: "#c4a35a",
};

export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
export const MAX_UPLOAD_DIMENSION = 4000;
export const ACCEPTED_UPLOAD_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
] as const;

export const DEFAULT_PRINTABLE_AREAS: Record<
  CustomizationPreviewType,
  PrintableArea
> = {
  bottle: { x: 36, y: 38, width: 28, height: 32 },
  notebook: { x: 28, y: 28, width: 44, height: 40 },
  pen: { x: 28, y: 40, width: 48, height: 18 },
  folder: { x: 24, y: 32, width: 52, height: 36 },
  box: { x: 26, y: 36, width: 48, height: 32 },
  flat: { x: 20, y: 25, width: 60, height: 50 },
};

export function getSupportedTypes(
  config: ProductCustomizationConfig,
): CustomizationMediaType[] {
  if (config.allowedElements?.length) return config.allowedElements;
  if (config.supportedTypes?.length) return config.supportedTypes;
  if (config.types?.length) {
    return config.types.filter(
      (type): type is CustomizationMediaType =>
        type === "text" || type === "logo" || type === "image",
    );
  }
  return ["text"];
}

/** Allowed element types for the active surface (Phase 13B). */
export function getSurfaceSupportedTypes(
  config: ProductCustomizationConfig,
  surfaceId: string,
): CustomizationMediaType[] {
  const zone = getZoneById(config, surfaceId);
  if (zone?.allowedElementTypes?.length) return zone.allowedElementTypes;
  if (zone?.supportedCustomization?.length) return zone.supportedCustomization;
  return getSupportedTypes(config);
}

export function getPrintableArea(
  config: ProductCustomizationConfig,
): PrintableArea {
  return config.printableArea ?? DEFAULT_PRINTABLE_AREAS[config.preview.type];
}

export function getVariants(
  config: ProductCustomizationConfig,
): ProductVariantOption[] {
  return config.variants ?? [];
}

export function getDefaultVariantId(
  config: ProductCustomizationConfig,
): string {
  if (config.defaultVariantId) return config.defaultVariantId;
  return config.variants?.[0]?.id ?? "";
}

export function resolveVariantImage(
  config: ProductCustomizationConfig,
  variantId: string,
  fallbackImages: string[],
): string | undefined {
  const variant = config.variants?.find((item) => item.id === variantId);
  if (variant?.images?.[0]) return variant.images[0];
  return fallbackImages[0];
}

function defaultPositionForZone(zone: CustomizationZone): { x: number; y: number } {
  if (zone.defaultPosition) return zone.defaultPosition;
  if (zone.bounds) {
    return {
      x: zone.bounds.x + zone.bounds.width / 2,
      y: zone.bounds.y + zone.bounds.height / 2,
    };
  }
  return { x: 50, y: 50 };
}

export function createDefaultLayer(
  config: ProductCustomizationConfig,
  type: CustomizationMediaType = "text",
  zone?: CustomizationZone,
): CustomizationLayer {
  const position = zone ? defaultPositionForZone(zone) : { x: 50, y: 50 };
  return {
    id: `layer-${zone?.id ?? "main"}-1`,
    type,
    text: "",
    font: config.preview.fonts[0] ?? "classic",
    color: config.preview.colors[0] ?? "black",
    textOrientation: "horizontal",
    mediaDataUrl: undefined,
    mediaName: undefined,
    x: position.x,
    y: position.y,
    scale: 1,
    rotation: 0,
    opacity: 1,
  };
}

function createZoneLayerState(
  config: ProductCustomizationConfig,
  zone: CustomizationZone,
  mediaType?: CustomizationMediaType,
): ZoneLayerState {
  const supported = zone.supportedCustomization?.length
    ? zone.supportedCustomization
    : getSupportedTypes(config);
  const type = mediaType && supported.includes(mediaType) ? mediaType : supported[0] ?? "text";
  const layer = createDefaultLayer(config, type, zone);
  return {
    zoneId: zone.id,
    zoneLabel: zone.label,
    objects: [layer],
    activeObjectId: layer.id,
    mediaType: type,
    layer,
  };
}

function ensureZoneObjects(entry: ZoneLayerState): ZoneLayerState {
  if (entry.objects?.length) {
    const active =
      entry.objects.find((obj) => obj.id === entry.activeObjectId) ??
      entry.objects[0];
    return {
      ...entry,
      activeObjectId: active.id,
      mediaType: active.type,
      layer: active,
    };
  }
  return {
    ...entry,
    objects: [entry.layer],
    activeObjectId: entry.layer.id,
    mediaType: entry.layer.type,
  };
}

export function createDefaultAdvancedState(
  config: ProductCustomizationConfig,
): AdvancedCustomizationState {
  const zones = resolveCustomizationZones(config);
  const activeZoneId = getDefaultZoneId(config);
  const activeZone =
    zones.find((z) => z.id === activeZoneId) ?? zones[0] ?? {
      id: "front",
      label: "Front",
      type: "surface" as const,
    };

  // Seed every configured surface so switching never drops sibling state.
  const zoneLayers: Record<string, ZoneLayerState> = {};
  for (const zone of zones) {
    zoneLayers[zone.id] = createZoneLayerState(config, zone);
  }
  if (!zoneLayers[activeZone.id]) {
    zoneLayers[activeZone.id] = createZoneLayerState(config, activeZone);
  }
  const active = zoneLayers[activeZone.id];

  return {
    enabled: false,
    variantId: getDefaultVariantId(config),
    activeZoneId: active.zoneId,
    activeObjectId: active.activeObjectId,
    mediaType: active.mediaType,
    layer: active.layer,
    zoneLayers,
    activeViewId: activeZone.viewKey ?? activeZone.viewIds?.[0],
  };
}

/** Clear all elements on one surface without affecting others. */
export function clearSurfaceCustomization(
  state: AdvancedCustomizationState,
  config: ProductCustomizationConfig,
  surfaceId: string,
): AdvancedCustomizationState {
  const zone = getZoneById(config, surfaceId);
  if (!zone) return state;
  const reset = createZoneLayerState(config, zone);
  const synced = withSyncedActiveZone(state);
  const nextLayers = {
    ...synced.zoneLayers,
    [surfaceId]: reset,
  };
  if (synced.activeZoneId !== surfaceId) {
    return {
      ...synced,
      zoneLayers: nextLayers,
    };
  }
  return {
    ...synced,
    activeObjectId: reset.activeObjectId,
    mediaType: reset.mediaType,
    layer: reset.layer,
    zoneLayers: nextLayers,
  };
}

/** Persist the active layer into the active surface’s object list. */
export function withSyncedActiveZone(
  state: AdvancedCustomizationState,
): AdvancedCustomizationState {
  const current = ensureZoneObjects(
    state.zoneLayers[state.activeZoneId] ?? {
      zoneId: state.activeZoneId,
      zoneLabel: state.activeZoneId,
      objects: [state.layer],
      activeObjectId: state.layer.id,
      mediaType: state.mediaType,
      layer: state.layer,
    },
  );
  const activeId = state.activeObjectId || current.activeObjectId;
  const objects = current.objects.map((obj) =>
    obj.id === activeId
      ? { ...state.layer, id: activeId, type: state.mediaType }
      : obj,
  );
  const hasActive = objects.some((obj) => obj.id === activeId);
  const nextObjects = hasActive
    ? objects
    : [...objects, { ...state.layer, id: activeId, type: state.mediaType }];
  const activeLayer =
    nextObjects.find((obj) => obj.id === activeId) ?? nextObjects[0];

  return {
    ...state,
    activeObjectId: activeLayer.id,
    mediaType: activeLayer.type,
    layer: activeLayer,
    zoneLayers: {
      ...state.zoneLayers,
      [state.activeZoneId]: {
        zoneId: state.activeZoneId,
        zoneLabel: current.zoneLabel,
        objects: nextObjects,
        activeObjectId: activeLayer.id,
        mediaType: activeLayer.type,
        layer: activeLayer,
      },
    },
  };
}

/** Switch surface while keeping each surface’s objects independent. */
export function switchActiveZone(
  state: AdvancedCustomizationState,
  config: ProductCustomizationConfig,
  nextZoneId: string,
): AdvancedCustomizationState {
  if (state.activeZoneId === nextZoneId) return state;
  const nextZone = getZoneById(config, nextZoneId);
  if (!nextZone) return state;

  const synced = withSyncedActiveZone(state);
  const existing = synced.zoneLayers[nextZone.id]
    ? ensureZoneObjects(synced.zoneLayers[nextZone.id])
    : null;
  if (existing) {
    return {
      ...synced,
      activeZoneId: nextZone.id,
      activeObjectId: existing.activeObjectId,
      mediaType: existing.mediaType,
      layer: existing.layer,
      activeViewId: nextZone.viewKey ?? nextZone.viewIds?.[0],
      zoneLayers: {
        ...synced.zoneLayers,
        [nextZone.id]: existing,
      },
    };
  }

  const created = createZoneLayerState(config, nextZone, synced.mediaType);
  return {
    ...synced,
    activeZoneId: nextZone.id,
    activeObjectId: created.activeObjectId,
    mediaType: created.mediaType,
    layer: created.layer,
    activeViewId: nextZone.viewKey ?? nextZone.viewIds?.[0],
    zoneLayers: {
      ...synced.zoneLayers,
      [nextZone.id]: created,
    },
  };
}

export function selectSurfaceObject(
  state: AdvancedCustomizationState,
  objectId: string,
): AdvancedCustomizationState {
  const synced = withSyncedActiveZone(state);
  const surface = ensureZoneObjects(synced.zoneLayers[synced.activeZoneId]);
  const next = surface.objects.find((obj) => obj.id === objectId);
  if (!next) return synced;
  return {
    ...synced,
    activeObjectId: next.id,
    mediaType: next.type,
    layer: next,
    zoneLayers: {
      ...synced.zoneLayers,
      [synced.activeZoneId]: {
        ...surface,
        activeObjectId: next.id,
        mediaType: next.type,
        layer: next,
      },
    },
  };
}

/**
 * Reset placement/transform of the active (or specified) element only.
 * Keeps text/media content; does not clear the surface or other elements.
 */
export function resetElementPlacement(
  state: AdvancedCustomizationState,
  config: ProductCustomizationConfig,
  objectId?: string,
): AdvancedCustomizationState {
  const targetId = objectId ?? state.activeObjectId;
  const base =
    targetId !== state.activeObjectId
      ? selectSurfaceObject(state, targetId)
      : state;
  const zone = getZoneById(config, base.activeZoneId);
  const position = zone ? defaultPositionForZone(zone) : { x: 50, y: 50 };
  const nextLayer = {
    ...base.layer,
    x: position.x,
    y: position.y,
    scale: 1,
    rotation: 0,
    textOrientation:
      base.layer.type === "text"
        ? ("horizontal" as const)
        : base.layer.textOrientation,
  };
  return withSyncedActiveZone({ ...base, layer: nextLayer });
}

export function addSurfaceObject(
  state: AdvancedCustomizationState,
  config: ProductCustomizationConfig,
  mediaType: CustomizationMediaType,
): AdvancedCustomizationState {
  const synced = withSyncedActiveZone(state);
  const zone = getZoneById(config, synced.activeZoneId);
  const surface = ensureZoneObjects(synced.zoneLayers[synced.activeZoneId]);
  const layer = createDefaultLayer(config, mediaType, zone);
  layer.id = `layer-${synced.activeZoneId}-${Date.now().toString(36)}`;
  // Offset slightly so stacked objects are visible.
  layer.x = Math.min(90, layer.x + surface.objects.length * 3);
  layer.y = Math.min(90, layer.y + surface.objects.length * 3);
  const objects = [...surface.objects, layer];
  return {
    ...synced,
    enabled: true,
    activeObjectId: layer.id,
    mediaType,
    layer,
    zoneLayers: {
      ...synced.zoneLayers,
      [synced.activeZoneId]: {
        ...surface,
        objects,
        activeObjectId: layer.id,
        mediaType,
        layer,
      },
    },
  };
}

export function removeSurfaceObject(
  state: AdvancedCustomizationState,
  config: ProductCustomizationConfig,
  objectId: string,
): AdvancedCustomizationState {
  const synced = withSyncedActiveZone(state);
  const surface = ensureZoneObjects(synced.zoneLayers[synced.activeZoneId]);
  if (surface.objects.length <= 1) {
    const zone = getZoneById(config, synced.activeZoneId);
    const reset = createZoneLayerState(config, zone ?? {
      id: synced.activeZoneId,
      label: surface.zoneLabel,
      type: "surface",
    });
    return {
      ...synced,
      activeObjectId: reset.activeObjectId,
      mediaType: reset.mediaType,
      layer: reset.layer,
      zoneLayers: {
        ...synced.zoneLayers,
        [synced.activeZoneId]: reset,
      },
    };
  }
  const objects = surface.objects.filter((obj) => obj.id !== objectId);
  const active =
    objects.find((obj) => obj.id === surface.activeObjectId) ?? objects[0];
  return {
    ...synced,
    activeObjectId: active.id,
    mediaType: active.type,
    layer: active,
    zoneLayers: {
      ...synced.zoneLayers,
      [synced.activeZoneId]: {
        ...surface,
        objects,
        activeObjectId: active.id,
        mediaType: active.type,
        layer: active,
      },
    },
  };
}

export function layerHasContent(layer: CustomizationLayer): boolean {
  if (layer.type === "text") {
    return Boolean(layer.text?.trim());
  }
  return Boolean(layer.mediaDataUrl);
}

export function zoneHasContent(entry: {
  mediaType: CustomizationMediaType;
  layer: CustomizationLayer;
  objects?: CustomizationLayer[];
}): boolean {
  if (entry.objects?.length) {
    return entry.objects.some((obj) => layerHasContent(obj));
  }
  if (entry.mediaType === "text") {
    return Boolean(entry.layer.text?.trim());
  }
  return Boolean(entry.layer.mediaDataUrl);
}

/** Bounds used to keep objects on the selected physical surface. */
export function getSurfacePlacementBounds(
  config: ProductCustomizationConfig,
  surfaceId: string,
): PrintableArea | undefined {
  const surface = getZoneById(config, surfaceId);
  return surface?.printableRegion ?? surface?.bounds;
}

/** @deprecated Phase 10 compatibility */
export function createDefaultCustomizationState(
  config: ProductCustomizationConfig,
): CustomizationState {
  return {
    enabled: false,
    text: "",
    font: config.preview.fonts[0] ?? "classic",
    color: config.preview.colors[0] ?? "black",
    placement: config.preview.defaultPlacement,
    textOrientation: "horizontal",
  };
}

export function sanitizeCustomizationText(
  value: string,
  maxLength: number,
): string {
  return value
    .replace(/[^\w\s&.'\-]/g, "")
    .replace(/\s+/g, " ")
    .slice(0, maxLength);
}

export function validateCustomizationText(
  text: string,
  maxLength: number,
  required: boolean,
): string | null {
  const trimmed = text.trim();
  if (required && !trimmed) {
    return "Enter text to preview your customization.";
  }
  if (trimmed.length > maxLength) {
    return `Use up to ${maxLength} characters.`;
  }
  return null;
}

export function validateUploadFile(file: File): string | null {
  const type = file.type.toLowerCase();
  if (
    !ACCEPTED_UPLOAD_TYPES.includes(
      type as (typeof ACCEPTED_UPLOAD_TYPES)[number],
    )
  ) {
    return "Use PNG, JPG, JPEG or WEBP.";
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return "Image must be under 2 MB.";
  }
  return null;
}

export function readImageFile(file: File): Promise<{
  dataUrl: string;
  width: number;
  height: number;
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result ?? "");
      const image = new Image();
      image.onload = () => {
        if (
          image.width > MAX_UPLOAD_DIMENSION ||
          image.height > MAX_UPLOAD_DIMENSION
        ) {
          reject(new Error("Image dimensions are too large (max 4000px)."));
          return;
        }
        resolve({
          dataUrl,
          width: image.width,
          height: image.height,
        });
      };
      image.onerror = () => reject(new Error("Could not read that image."));
      image.src = dataUrl;
    };
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.readAsDataURL(file);
  });
}

/**
 * Keep the layer centre on the selected surface.
 * Uses surface-specific bounds when provided; otherwise the full canvas.
 */
export function clampLayerPosition(
  x: number,
  y: number,
  scale: number,
  bounds?: PrintableArea,
): { x: number; y: number } {
  const margin = Math.min(8, Math.max(3, 3 + scale * 1.25));
  if (!bounds) {
    return {
      x: Math.min(100 - margin, Math.max(margin, x)),
      y: Math.min(100 - margin, Math.max(margin, y)),
    };
  }
  const minX = bounds.x + margin * 0.35;
  const maxX = bounds.x + bounds.width - margin * 0.35;
  const minY = bounds.y + margin * 0.35;
  const maxY = bounds.y + bounds.height - margin * 0.35;
  return {
    x: Math.min(Math.max(minX, maxX), Math.max(Math.min(minX, maxX), x)),
    y: Math.min(Math.max(minY, maxY), Math.max(Math.min(minY, maxY), y)),
  };
}

export function clampScale(scale: number): number {
  return Math.min(2.2, Math.max(0.4, Number(scale.toFixed(2))));
}

/** Normalize degrees into −180…180. */
export function clampRotation(rotation: number): number {
  if (!Number.isFinite(rotation)) return 0;
  let value = ((rotation % 360) + 360) % 360;
  if (value > 180) value -= 360;
  return Math.round(value);
}

function validateZoneContent(
  mediaType: CustomizationMediaType,
  layer: CustomizationLayer,
  config: ProductCustomizationConfig,
  required: boolean,
): string | null {
  if (mediaType === "text") {
    return validateCustomizationText(
      layer.text ?? "",
      config.preview.maxLength,
      required,
    );
  }
  if (required && !layer.mediaDataUrl) {
    return mediaType === "logo"
      ? "Upload a logo to continue."
      : "Upload an image to continue.";
  }
  return null;
}

export function validateAdvancedState(
  state: AdvancedCustomizationState,
  config: ProductCustomizationConfig,
  required: boolean,
): string | null {
  if (!state.enabled) return null;

  const synced = withSyncedActiveZone(state);
  const contentObjects = Object.values(synced.zoneLayers).flatMap((entry) => {
    const surface = ensureZoneObjects(entry);
    return surface.objects
      .filter((obj) => layerHasContent(obj))
      .map((obj) => ({ zoneLabel: surface.zoneLabel, obj }));
  });

  if (!required) {
    if (!layerHasContent({ ...state.layer, type: state.mediaType })) {
      return null;
    }
    return validateZoneContent(state.mediaType, state.layer, config, false);
  }

  if (contentObjects.length === 0) {
    return validateZoneContent(state.mediaType, state.layer, config, true);
  }

  for (const item of contentObjects) {
    const error = validateZoneContent(item.obj.type, item.obj, config, true);
    if (error) return `${item.zoneLabel}: ${error}`;
  }
  return null;
}

function serializeLayerToCart(
  zoneId: string,
  zoneLabel: string,
  layer: CustomizationLayer,
): CartZoneCustomization | null {
  if (!layerHasContent(layer)) return null;

  if (layer.type === "text") {
    const text = layer.text?.trim() ?? "";
    if (!text) return null;
    return {
      zoneId,
      zoneLabel,
      objectId: layer.id,
      type: "text",
      text,
      font: layer.font ?? "classic",
      color: layer.color ?? "black",
      colorValue: COLOR_VALUES[layer.color ?? "black"],
      textOrientation: resolveTextOrientation(layer.textOrientation),
      x: layer.x,
      y: layer.y,
      scale: layer.scale,
      rotation: clampRotation(layer.rotation ?? 0),
    };
  }

  if (!layer.mediaDataUrl) return null;
  return {
    zoneId,
    zoneLabel,
    objectId: layer.id,
    type: layer.type,
    text: layer.mediaName || layer.type,
    mediaName: layer.mediaName,
    mediaDataUrl: layer.mediaDataUrl,
    x: layer.x,
    y: layer.y,
    scale: layer.scale,
    rotation: clampRotation(layer.rotation ?? 0),
  };
}

function serializeZoneToCart(entry: ZoneLayerState): CartZoneCustomization[] {
  const surface = ensureZoneObjects(entry);
  return surface.objects
    .map((layer) =>
      serializeLayerToCart(surface.zoneId, surface.zoneLabel, layer),
    )
    .filter((item): item is CartZoneCustomization => Boolean(item));
}

function cartFromZone(
  zone: CartZoneCustomization,
  variantId?: string,
): CartCustomization {
  return {
    variantId: variantId || undefined,
    type: zone.type,
    text: zone.text,
    font: zone.font,
    color: zone.color,
    colorValue: zone.colorValue,
    textOrientation: zone.textOrientation,
    x: zone.x,
    y: zone.y,
    scale: zone.scale,
    rotation: zone.rotation,
    mediaName: zone.mediaName,
    mediaDataUrl: zone.mediaDataUrl,
    zoneId: zone.zoneId,
    zoneLabel: zone.zoneLabel,
    customizationZone: zone.zoneId,
  };
}

export function toCartCustomization(
  state: AdvancedCustomizationState | CustomizationState,
): CartCustomization | undefined {
  // Phase 10 legacy shape
  if ("placement" in state && !("mediaType" in state)) {
    const legacy = state as CustomizationState;
    const text = legacy.text.trim();
    if (!legacy.enabled || !text) return undefined;
    return {
      type: "text",
      text,
      font: legacy.font,
      color: legacy.color,
      colorValue: COLOR_VALUES[legacy.color],
      textOrientation: resolveTextOrientation(legacy.textOrientation),
      placement: legacy.placement,
      x: 50,
      y: 50,
      scale: 1,
      rotation: 0,
    };
  }

  const advanced = state as AdvancedCustomizationState;
  if (!advanced.enabled) return undefined;

  const synced = withSyncedActiveZone(advanced);
  const zoneCustomizations = Object.values(synced.zoneLayers).flatMap(
    serializeZoneToCart,
  );

  if (zoneCustomizations.length === 0) return undefined;

  const primary =
    zoneCustomizations.find(
      (z) =>
        z.zoneId === synced.activeZoneId &&
        z.objectId === synced.activeObjectId,
    ) ??
    zoneCustomizations.find((z) => z.zoneId === synced.activeZoneId) ??
    zoneCustomizations[0];

  return {
    ...cartFromZone(primary, synced.variantId),
    zoneCustomizations,
  };
}

export function formatCustomizationSummary(
  customization: CartCustomization | undefined,
): string | null {
  if (!customization) return null;

  if (customization.contents?.length) {
    const count = customization.contents.length;
    const branding =
      customization.type === "logo"
        ? "Logo"
        : customization.type === "image"
          ? "Image"
          : customization.text?.trim()
            ? `"${customization.text.trim()}"`
            : null;
    return branding
      ? `${count} items · ${branding}`
      : `${count} items`;
  }

  if (customization.zoneCustomizations?.length) {
    const bySurface = new Map<string, CartZoneCustomization[]>();
    for (const zone of customization.zoneCustomizations) {
      const list = bySurface.get(zone.zoneLabel) ?? [];
      list.push(zone);
      bySurface.set(zone.zoneLabel, list);
    }
    const parts = [...bySurface.entries()].map(([label, items]) => {
      const detail = items
        .map((item) => {
          if (item.type === "logo") return item.mediaName ? `Logo · ${item.mediaName}` : "Logo";
          if (item.type === "image") return item.mediaName ? `Image · ${item.mediaName}` : "Image";
          return item.text?.trim() ? `“${item.text.trim()}”` : "Text";
        })
        .join(" + ");
      return `${label} — ${detail}`;
    });
    return `Customized · ${parts.join(" · ")}`;
  }

  const zonePrefix = customization.zoneLabel
    ? `Customized · ${customization.zoneLabel} · `
    : "";

  if (customization.type === "logo") {
    return customization.mediaName
      ? `${zonePrefix}Logo · ${customization.mediaName}`
      : `${zonePrefix}Logo upload`;
  }
  if (customization.type === "image") {
    return customization.mediaName
      ? `${zonePrefix}Image · ${customization.mediaName}`
      : `${zonePrefix}Image upload`;
  }
  if (customization.text?.trim()) {
    const orientation = resolveTextOrientation(customization.textOrientation);
    return `${zonePrefix}"${customization.text.trim()}" · ${TEXT_ORIENTATION_LABELS[orientation]}`;
  }
  return null;
}

export function hamperContentLabels(
  customization: CartCustomization | undefined,
): string[] {
  if (!customization?.contents?.length) return [];
  return customization.contents.map((item) => {
    const product = getProductById(item.productId);
    const name = product?.name ?? item.productId;
    return item.quantity > 1 ? `${name} × ${item.quantity}` : name;
  });
}

export function customizationDetails(
  customization: CartCustomization | undefined,
  variantLabel?: string,
): string[] {
  if (!customization) return [];
  const lines: string[] = [];

  const contentNames = hamperContentLabels(customization);
  if (contentNames.length > 0) {
    lines.push(`Contents: ${contentNames.join(", ")}`);
  }

  const resolvedVariant =
    variantLabel ||
    customization.variantLabel ||
    (customization.variantId
      ? customization.variantId.replace(/^\w/, (c) => c.toUpperCase())
      : "");

  if (resolvedVariant) {
    lines.push(`Color: ${resolvedVariant}`);
  }

  if (customization.zoneCustomizations?.length) {
    for (const zone of customization.zoneCustomizations) {
      if (zone.type === "logo" || zone.type === "image") {
        lines.push(
          `${zone.zoneLabel}: ${
            zone.type === "logo" ? "Logo" : "Image"
          }${zone.mediaName ? ` · ${zone.mediaName}` : ""}`,
        );
      } else if (zone.text?.trim()) {
        lines.push(`${zone.zoneLabel}: “${zone.text.trim()}”`);
        lines.push(
          `Orientation (${zone.zoneLabel}): ${
            TEXT_ORIENTATION_LABELS[resolveTextOrientation(zone.textOrientation)]
          }`,
        );
        if (zone.font) {
          lines.push(`Font (${zone.zoneLabel}): ${FONT_LABELS[zone.font]}`);
        }
        if (zone.color) {
          lines.push(
            `Text color (${zone.zoneLabel}): ${COLOR_LABELS[zone.color]}`,
          );
        }
      }
    }
    return lines;
  }

  if (customization.zoneLabel) {
    lines.push(`Surface: ${customization.zoneLabel}`);
  }

  if (customization.type === "logo" || customization.type === "image") {
    lines.push(
      `Branding: ${
        customization.type === "logo" ? "Logo" : "Image"
      }${customization.mediaName ? ` · ${customization.mediaName}` : ""}`,
    );
    return lines;
  }

  if (customization.text?.trim()) {
    lines.push(
      contentNames.length > 0
        ? `Branding: “${customization.text.trim()}”`
        : `Customization: “${customization.text.trim()}”`,
    );
    lines.push(
      `Orientation: ${TEXT_ORIENTATION_LABELS[resolveTextOrientation(customization.textOrientation)]}`,
    );
  }
  if (customization.font && customization.text?.trim()) {
    lines.push(`Font: ${FONT_LABELS[customization.font]}`);
  }
  if (customization.color && customization.text?.trim()) {
    lines.push(`Text color: ${COLOR_LABELS[customization.color]}`);
  } else if (customization.placement && !contentNames.length) {
    lines.push(`Placement: ${PLACEMENT_LABELS[customization.placement]}`);
  }

  return lines;
}

const DEFAULT_OVERLAYS: Record<
  CustomizationPreviewType,
  Partial<Record<CustomizationPlacementOption, CustomizationOverlayTransform>>
> = {
  bottle: {
    center: { x: 50, y: 52, scale: 1, rotation: 0, maxWidthPct: 28 },
    front: { x: 50, y: 44, scale: 1.05, rotation: 0, maxWidthPct: 30 },
    side: { x: 62, y: 50, scale: 0.85, rotation: 90, maxWidthPct: 18 },
  },
  notebook: {
    cover: { x: 54, y: 42, scale: 1.15, rotation: -2, maxWidthPct: 42 },
    center: { x: 54, y: 52, scale: 1.1, rotation: -2, maxWidthPct: 42 },
  },
  pen: {
    side: { x: 52, y: 48, scale: 0.72, rotation: -18, maxWidthPct: 48 },
    front: { x: 50, y: 45, scale: 0.78, rotation: -18, maxWidthPct: 46 },
  },
  box: {
    center: { x: 50, y: 54, scale: 1.05, rotation: 0, maxWidthPct: 40 },
    front: { x: 50, y: 48, scale: 1, rotation: 0, maxWidthPct: 40 },
  },
  folder: {
    front: { x: 52, y: 46, scale: 1, rotation: -4, maxWidthPct: 38 },
    center: { x: 52, y: 52, scale: 1, rotation: -4, maxWidthPct: 38 },
  },
  flat: {
    center: { x: 50, y: 50, scale: 1, rotation: 0, maxWidthPct: 50 },
    front: { x: 50, y: 45, scale: 1, rotation: 0, maxWidthPct: 50 },
  },
};

export function resolveOverlayTransform(
  config: ProductCustomizationConfig,
  placement: CustomizationPlacementOption,
): CustomizationOverlayTransform {
  const configured = config.preview.overlays?.[placement];
  if (configured) return configured;

  const typeDefaults = DEFAULT_OVERLAYS[config.preview.type];
  return (
    typeDefaults[placement] ??
    typeDefaults[config.preview.defaultPlacement] ??
    typeDefaults.center ?? {
      x: 50,
      y: 50,
      scale: 1,
      rotation: 0,
      maxWidthPct: 40,
    }
  );
}
