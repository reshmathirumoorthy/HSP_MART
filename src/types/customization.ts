/**
 * Advanced frontend customization types.
 * DEMO / MOCK — browser-only personalization, not a print-production engine.
 *
 * Phase 13A — Customization Engine 2.0 foundation:
 * Product → surfaces → views → variants → elements → placement → cart.
 * Capability is configuration-driven (`ProductCustomizationConfig`), not
 * product-slug branching. Views are backed only by real image assets —
 * never fake CSS “360°” rotation of a single flat photo.
 */

/** Persisted cart/session payload version for future migrations. */
export const CUSTOMIZATION_SCHEMA_VERSION = 2 as const;

export type CustomizationPreviewType =
  | "bottle"
  | "notebook"
  | "pen"
  | "box"
  | "folder"
  | "flat";

export type CustomizationFontOption =
  | "classic"
  | "modern"
  | "bold"
  | "handwritten";

export type CustomizationColorOption = "black" | "white" | "green" | "gold";

export type CustomizationPlacementOption =
  | "front"
  | "center"
  | "side"
  | "cover";

export type CustomizationMediaType = "text" | "logo" | "image";

/** Phase 13A alias — element capability comes from config, not product name. */
export type CustomizationElementType = CustomizationMediaType;

/**
 * Text layout direction for TEXT customization.
 * Vertical modes use upright characters (writing-mode), not a 90° word spin.
 */
export type TextOrientation =
  | "horizontal"
  | "vertical"
  | "vertical-reverse"
  | "horizontal-reverse";

/**
 * Percentage / normalized box relative to the product image frame (0–100).
 * Prefer these over pixel coordinates so placement survives resize.
 */
export type PrintableArea = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/** Normalized placement of an element centre / transform (0–100 + degrees). */
export type NormalizedPlacement = {
  x: number;
  y: number;
  /** Relative scale (typically 0.4–2), not a percentage width. */
  scale: number;
  /** Degrees, typically −180–180. */
  rotation: number;
  width?: number;
  height?: number;
};

/** Named product surface the customer can customize. */
export type CustomizationZoneType = "surface";

export type ProductViewKey =
  | "front"
  | "frontRight"
  | "right"
  | "backRight"
  | "back"
  | "backLeft"
  | "left"
  | "frontLeft"
  | "top"
  | "bottom"
  | "cap"
  | "spine"
  | "insideLeft"
  | "insideRight";

export type ProductViews = Partial<Record<ProductViewKey, string>>;

/**
 * First-class product view descriptor (Phase 13A).
 * Only include views that have a real image asset — never invent angles.
 * Optional `angle` documents a real supplied yaw when multi-view photography exists.
 */
export type CustomizationView = {
  id: string;
  label: string;
  /** Real catalogue / photography asset path. */
  image: string;
  /** Alias for image — some configs may use imageSrc. */
  imageSrc?: string;
  /** Optional documented yaw in degrees when the asset is an angle frame. */
  angle?: number;
  sortOrder: number;
  /** Surfaces visible / editable on this view. */
  surfaceIds?: string[];
  /** Optional map into legacy ProductViewKey when used. */
  viewKey?: ProductViewKey;
  /** True when this entry is part of an authored sequential orbit sequence. */
  isOrbitFrame?: boolean;
  /** Optional variant this photograph belongs to. */
  variantId?: string;
  /** Optional axis hint for future vertical sequences. */
  axis?: "yaw" | "pitch";
};

export type CustomizationZone = {
  id: string;
  label: string;
  type: CustomizationZoneType;
  /** Alias used in surface-based studio APIs. */
  customizable?: boolean;
  /** Human-readable surface description for future UI (optional). */
  description?: string;
  supportedCustomization?: CustomizationMediaType[];
  /** Phase 13A alias of supportedCustomization. */
  allowedElementTypes?: CustomizationElementType[];
  /**
   * Valid visual surface for free placement (product/surface-specific).
   * Objects are clamped to this region — not a global product printable box.
   */
  bounds?: PrintableArea;
  /**
   * Optional manufacturer printable region for this surface only.
   * When absent, the full valid surface (`bounds` or full canvas) is used.
   */
  printableRegion?: PrintableArea;
  /** Preferred named view when this surface is selected. */
  viewKey?: ProductViewKey;
  /** Explicit view ids from CustomizationView[] when authored. */
  viewIds?: string[];
  /** Optional index into rotationFrames when views are not used. */
  frameIndex?: number;
  /** Optional dedicated preview image for this surface. */
  previewImage?: string;
  defaultPosition?: { x: number; y: number };
  /** When false, surface is listed but not editable. Default true. */
  enabled?: boolean;
};

/** @alias CustomizationZone — surface-first naming for the studio. */
export type CustomizationSurface = CustomizationZone;

/** Stable fallback surface/view ids when a product has no authored multi-surface config. */
export const PRIMARY_SURFACE_ID = "primary";
export const PRIMARY_VIEW_ID = "primary";

export type ProductVariantOption = {
  id: string;
  label: string;
  /** CSS color for swatch UI. */
  color?: string;
  images: string[];
  /** Optional focus hint when framing a crop of a group photo. */
  objectPosition?: string;
};

/** Percentage-based overlay transform calibrated to the product image. */
export type CustomizationOverlayTransform = {
  x: number;
  y: number;
  scale: number;
  rotation: number;
  maxWidthPct?: number;
};

/**
 * Canonical product customization capability (Phase 13A CustomizationConfig).
 * Authored on `Product.customization` — never inferred from product slug in new code.
 */
export type ProductCustomizationConfig = {
  enabled: boolean;
  /** @deprecated Prefer supportedTypes — kept for Phase 10 compatibility. */
  types?: Array<"text" | "logo" | "image">;
  supportedTypes?: CustomizationMediaType[];
  /** Phase 13A alias of supportedTypes. */
  allowedElements?: CustomizationElementType[];
  variants?: ProductVariantOption[];
  defaultVariantId?: string;
  /** @deprecated Soft legacy hint — zones replace fixed printable-area UX. */
  printableArea?: PrintableArea;
  /** Physical surfaces available for this product (preferred name). */
  surfaces?: CustomizationZone[];
  /** Alias for surfaces. */
  customizationZones?: CustomizationZone[];
  /** @deprecated Prefer surfaces. */
  zones?: CustomizationZone[];
  defaultZoneId?: string;
  defaultSurfaceId?: string;
  /**
   * Named angle / surface photographs when available.
   * Keys map to real image paths only — never synthetic rotations.
   */
  views?: ProductViews;
  /**
   * Ordered first-class view list (Phase 13A). When absent, derive from
   * `views` / `rotationFrames` / primary product image — never invent frames.
   */
  viewList?: CustomizationView[];
  defaultViewId?: string;
  /**
   * Ordered real-photo frames for a future multi-view orbit.
   * Only real assets — CSS transform of one image is never a substitute.
   */
  rotationFrames?: string[];
  /** Optional vertical-angle frames keyed by yaw frame index. */
  verticalFrames?: {
    up?: string[];
    down?: string[];
  };
  preview: {
    type: CustomizationPreviewType;
    defaultPlacement: CustomizationPlacementOption;
    placements: CustomizationPlacementOption[];
    fonts: CustomizationFontOption[];
    colors: CustomizationColorOption[];
    maxLength: number;
    objectPosition?: string;
    overlays?: Partial<
      Record<CustomizationPlacementOption, CustomizationOverlayTransform>
    >;
  };
};

/** @alias ProductCustomizationConfig — Phase 13A naming. */
export type CustomizationConfig = ProductCustomizationConfig;

/** Interactive layer on the product preview canvas (session state). */
export type CustomizationLayer = {
  id: string;
  type: CustomizationMediaType;
  text?: string;
  font?: CustomizationFontOption;
  color?: CustomizationColorOption;
  /**
   * Text direction. Defaults to "horizontal" when missing (backward compatible).
   */
  textOrientation?: TextOrientation;
  /** Object URL or data URL for uploaded logo/image — session only. */
  mediaDataUrl?: string;
  mediaName?: string;
  /** Position of layer centre within the full product preview, 0–100. */
  x: number;
  y: number;
  /** Relative scale, typically 0.4–2. */
  scale: number;
  /** Degrees, typically −180–180. */
  rotation?: number;
  opacity?: number;
  /** Owning surface when serialized into a multi-surface session. */
  surfaceId?: string;
  /** Owning view when an element is view-specific. */
  viewId?: string;
};

/**
 * Phase 13A element model — same runtime shape as CustomizationLayer,
 * with explicit surface/view ownership for multi-surface sessions.
 */
export type CustomizationElement = CustomizationLayer;

/** Per-surface working state (independent multi-object customizations). */
export type ZoneLayerState = {
  zoneId: string;
  zoneLabel: string;
  /** All customization objects on this surface. */
  objects: CustomizationLayer[];
  activeObjectId: string;
  /** Mirrors the active object for control bindings. */
  mediaType: CustomizationMediaType;
  layer: CustomizationLayer;
};

export type AdvancedCustomizationState = {
  enabled: boolean;
  variantId: string;
  /** Currently selected physical surface. */
  activeZoneId: string;
  /** Active object id within the selected surface. */
  activeObjectId: string;
  mediaType: CustomizationMediaType;
  layer: CustomizationLayer;
  /** Independent customizations keyed by surface / zone id. */
  zoneLayers: Record<string, ZoneLayerState>;
  /**
   * Active product view id (Phase 13A). Switching views must not wipe
   * `zoneLayers` — surfaces keep their elements independently.
   */
  activeViewId?: string;
};

/**
 * Serializable studio session (Phase 13A).
 * UI-only drag handles stay out of cart persistence; elements go through
 * `toCartCustomization` / migration helpers.
 */
export type CustomizationSession = AdvancedCustomizationState & {
  schemaVersion: typeof CUSTOMIZATION_SCHEMA_VERSION;
  productId: string;
  /** Alias of activeZoneId for surface-first APIs. */
  activeSurfaceId: string;
  /** Selected element id (alias of activeObjectId). */
  selectedElementId: string;
  metadata?: Record<string, string | number | boolean | null>;
};

/** Phase 10C — selected child products inside a composite hamper. */
export type CartHamperContent = {
  productId: string;
  quantity: number;
};

/** One surface object’s persisted customization on a cart line. */
export type CartZoneCustomization = {
  zoneId: string;
  zoneLabel: string;
  /** Stable object id within the surface (optional for legacy lines). */
  objectId?: string;
  type?: CustomizationMediaType;
  text?: string;
  font?: CustomizationFontOption;
  color?: CustomizationColorOption;
  colorValue?: string;
  textOrientation?: TextOrientation;
  x?: number;
  y?: number;
  scale?: number;
  rotation?: number;
  mediaName?: string;
  mediaDataUrl?: string;
};

/**
 * Cart-persisted customization.
 * Supports Phase 10 legacy, Phase 10B advanced, Phase 10C hamper, Phase 11D zones,
 * Phase 13A schemaVersion for forward migration.
 *
 * Must remain JSON-safe: no File/Blob/DOM/React refs.
 */
export type CartCustomization = {
  /** Phase 13A — optional; missing values migrate as legacy v1. */
  schemaVersion?: number;
  /** Phase 10B */
  variantId?: string;
  variantLabel?: string;
  type?: CustomizationMediaType;
  text?: string;
  font?: CustomizationFontOption;
  color?: CustomizationColorOption;
  /** Hex or token for display */
  colorValue?: string;
  /** Defaults to "horizontal" when missing (backward compatible). */
  textOrientation?: TextOrientation;
  x?: number;
  y?: number;
  scale?: number;
  rotation?: number;
  mediaName?: string;
  /** Data URL for small logos/images — session localStorage only, no upload. */
  mediaDataUrl?: string;
  /** Active / primary zone id. */
  zoneId?: string;
  /** Active / primary zone label. */
  zoneLabel?: string;
  /** Alias used in cart payloads (`customizationZone`). */
  customizationZone?: string;
  /** All zone customizations on this line. */
  zoneCustomizations?: CartZoneCustomization[];
  /** Phase 10 legacy */
  placement?: CustomizationPlacementOption;
  /** Phase 10C — composite hamper contents */
  contents?: CartHamperContent[];
  /** True when this line is a built hamper (even before branding). */
  hamper?: boolean;
};

/** @deprecated Use AdvancedCustomizationState for new UI. */
export type CustomizationState = {
  enabled: boolean;
  text: string;
  font: CustomizationFontOption;
  color: CustomizationColorOption;
  placement: CustomizationPlacementOption;
  /** Defaults to "horizontal" when missing (backward compatible). */
  textOrientation?: TextOrientation;
};
