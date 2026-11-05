/**
 * Product customization-zone defaults and frame resolution.
 * Zones are configurable per product; these are safe fallbacks by preview type.
 */

import type {
  CustomizationMediaType,
  CustomizationPreviewType,
  CustomizationZone,
  ProductCustomizationConfig,
  ProductViewKey,
  ProductViews,
} from "@/types/customization";

const ALL_MEDIA: CustomizationMediaType[] = ["text", "logo", "image"];

function zone(
  id: string,
  label: string,
  extras: Partial<CustomizationZone> = {},
): CustomizationZone {
  return {
    id,
    label,
    type: "surface",
    supportedCustomization: ALL_MEDIA,
    ...extras,
  };
}

/** Sensible surfaces by product category / preview type. */
export const DEFAULT_ZONES_BY_TYPE: Record<
  CustomizationPreviewType,
  CustomizationZone[]
> = {
  bottle: [
    zone("front", "Front body", {
      viewKey: "front",
      defaultPosition: { x: 50, y: 48 },
      bounds: { x: 30, y: 28, width: 40, height: 48 },
    }),
    zone("back", "Back body", {
      viewKey: "back",
      defaultPosition: { x: 50, y: 48 },
      bounds: { x: 30, y: 28, width: 40, height: 48 },
    }),
    zone("left", "Left body", {
      viewKey: "left",
      defaultPosition: { x: 38, y: 50 },
      bounds: { x: 20, y: 30, width: 32, height: 44 },
    }),
    zone("right", "Right body", {
      viewKey: "right",
      defaultPosition: { x: 62, y: 50 },
      bounds: { x: 48, y: 30, width: 32, height: 44 },
    }),
    zone("cap", "Cap", {
      viewKey: "cap",
      defaultPosition: { x: 50, y: 14 },
      bounds: { x: 36, y: 4, width: 28, height: 18 },
    }),
    zone("top", "Top", {
      viewKey: "top",
      defaultPosition: { x: 50, y: 10 },
      bounds: { x: 36, y: 2, width: 28, height: 14 },
    }),
    zone("bottom", "Bottom", {
      viewKey: "bottom",
      defaultPosition: { x: 50, y: 88 },
      bounds: { x: 34, y: 80, width: 32, height: 14 },
    }),
  ],
  notebook: [
    zone("front", "Front Cover", {
      viewKey: "front",
      defaultPosition: { x: 54, y: 46 },
      bounds: { x: 28, y: 22, width: 48, height: 52 },
    }),
    zone("back", "Back Cover", {
      viewKey: "back",
      defaultPosition: { x: 50, y: 46 },
      bounds: { x: 26, y: 22, width: 48, height: 52 },
    }),
    zone("spine", "Spine", {
      viewKey: "spine",
      defaultPosition: { x: 18, y: 50 },
      bounds: { x: 10, y: 20, width: 14, height: 60 },
    }),
  ],
  pen: [
    zone("barrel", "Barrel", {
      viewKey: "front",
      defaultPosition: { x: 50, y: 48 },
      bounds: { x: 22, y: 40, width: 56, height: 20 },
    }),
    zone("clip", "Clip", {
      viewKey: "top",
      defaultPosition: { x: 58, y: 28 },
      bounds: { x: 48, y: 18, width: 22, height: 18 },
    }),
    zone("cap", "Cap", {
      viewKey: "cap",
      defaultPosition: { x: 32, y: 36 },
      bounds: { x: 20, y: 28, width: 24, height: 20 },
    }),
  ],
  folder: [
    zone("front", "Front Cover", {
      viewKey: "front",
      defaultPosition: { x: 52, y: 46 },
    }),
    zone("back", "Back Cover", {
      viewKey: "back",
      defaultPosition: { x: 50, y: 46 },
    }),
    zone("spine", "Spine", {
      viewKey: "spine",
      defaultPosition: { x: 18, y: 50 },
    }),
    zone("inside-left", "Inside Left", {
      viewKey: "insideLeft",
      defaultPosition: { x: 32, y: 50 },
    }),
    zone("inside-right", "Inside Right", {
      viewKey: "insideRight",
      defaultPosition: { x: 68, y: 50 },
    }),
  ],
  box: [
    zone("front", "Front", {
      viewKey: "front",
      defaultPosition: { x: 50, y: 48 },
    }),
    zone("back", "Back", {
      viewKey: "back",
      defaultPosition: { x: 50, y: 48 },
    }),
    zone("left", "Left Side", {
      viewKey: "left",
      defaultPosition: { x: 30, y: 50 },
    }),
    zone("right", "Right Side", {
      viewKey: "right",
      defaultPosition: { x: 70, y: 50 },
    }),
    zone("top", "Top", {
      viewKey: "top",
      defaultPosition: { x: 50, y: 28 },
    }),
    zone("bottom", "Bottom", {
      viewKey: "bottom",
      defaultPosition: { x: 50, y: 78 },
    }),
  ],
  flat: [
    zone("front", "Front", {
      viewKey: "front",
      defaultPosition: { x: 50, y: 48 },
    }),
    zone("back", "Back / Packaging", {
      viewKey: "back",
      defaultPosition: { x: 50, y: 48 },
    }),
  ],
};

/** Desk organiser / pen holder style surfaces (box-like). */
export const DESK_ORGANISER_ZONES: CustomizationZone[] = [
  zone("front", "Front", { viewKey: "front", defaultPosition: { x: 50, y: 52 } }),
  zone("back", "Back", { viewKey: "back", defaultPosition: { x: 50, y: 52 } }),
  zone("left", "Left", { viewKey: "left", defaultPosition: { x: 30, y: 50 } }),
  zone("right", "Right", { viewKey: "right", defaultPosition: { x: 70, y: 50 } }),
  zone("top", "Top", { viewKey: "top", defaultPosition: { x: 50, y: 28 } }),
];

export const PEN_HOLDER_ZONES: CustomizationZone[] = [
  zone("front", "Front", { viewKey: "front", defaultPosition: { x: 50, y: 50 } }),
  zone("back", "Back", { viewKey: "back", defaultPosition: { x: 50, y: 50 } }),
  zone("left", "Left", { viewKey: "left", defaultPosition: { x: 32, y: 50 } }),
  zone("right", "Right", { viewKey: "right", defaultPosition: { x: 68, y: 50 } }),
  zone("top", "Top", { viewKey: "top", defaultPosition: { x: 50, y: 24 } }),
];

export const PENCIL_ZONES: CustomizationZone[] = [
  zone("barrel", "Barrel", {
    viewKey: "front",
    defaultPosition: { x: 50, y: 48 },
  }),
  zone("case", "Box / Case", {
    viewKey: "back",
    defaultPosition: { x: 50, y: 56 },
  }),
];

export const STICKY_NOTE_ZONES: CustomizationZone[] = [
  zone("front", "Front", { viewKey: "front", defaultPosition: { x: 50, y: 48 } }),
  zone("back", "Back / Packaging", {
    viewKey: "back",
    defaultPosition: { x: 50, y: 48 },
  }),
];

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

/**
 * Surfaces for the studio.
 * Uses authored config or real view-backed surfaces / primary fallback.
 * Does NOT invent Cap/Left/Right catalogues from preview type alone.
 */
export function resolveCustomizationZones(
  config: ProductCustomizationConfig,
): CustomizationZone[] {
  // Lazy import avoided — keep resolution local + aligned with Phase 13B rules.
  const configured =
    config.surfaces ?? config.customizationZones ?? config.zones;
  if (configured?.length) {
    return configured.filter(
      (surface) =>
        surface.customizable !== false && surface.enabled !== false,
    );
  }

  if (config.views) {
    const allowed =
      config.allowedElements ??
      config.supportedTypes ??
      config.types?.filter(
        (t): t is CustomizationMediaType =>
          t === "text" || t === "logo" || t === "image",
      ) ??
      ALL_MEDIA;
    const area = config.printableArea;
    const fromViews = (
      Object.entries(config.views) as Array<[ProductViewKey, string | undefined]>
    )
      .filter((entry): entry is [ProductViewKey, string] => Boolean(entry[1]))
      .map(([key, image]) =>
        zone(key, key.charAt(0).toUpperCase() + key.slice(1), {
          viewKey: key,
          previewImage: image,
          supportedCustomization: allowed,
          allowedElementTypes: allowed,
          bounds: area,
          printableRegion: area,
          defaultPosition: area
            ? { x: area.x + area.width / 2, y: area.y + area.height / 2 }
            : { x: 50, y: 50 },
        }),
      );
    if (fromViews.length > 0) {
      // Prefer friendlier Body label for the front view when present.
      return fromViews.map((surface) =>
        surface.id === "front" ? { ...surface, label: "Body" } : surface,
      );
    }
  }

  const area = config.printableArea ?? {
    x: 20,
    y: 20,
    width: 60,
    height: 60,
  };
  const allowed =
    config.allowedElements ?? config.supportedTypes ?? ALL_MEDIA;
  return [
    zone("primary", "Primary", {
      viewKey: "front",
      supportedCustomization: allowed,
      allowedElementTypes: allowed,
      bounds: area,
      printableRegion: area,
      defaultPosition: {
        x: area.x + area.width / 2,
        y: area.y + area.height / 2,
      },
    }),
  ];
}

/** @alias resolveCustomizationZones */
export const resolveCustomizationSurfaces = resolveCustomizationZones;

export function getDefaultZoneId(config: ProductCustomizationConfig): string {
  const preferred = config.defaultSurfaceId ?? config.defaultZoneId;
  if (preferred) {
    const zones = resolveCustomizationZones(config);
    if (zones.some((z) => z.id === preferred)) {
      return preferred;
    }
  }
  return resolveCustomizationZones(config)[0]?.id ?? "front";
}

export function getZoneById(
  config: ProductCustomizationConfig,
  zoneId: string,
): CustomizationZone | undefined {
  return resolveCustomizationZones(config).find((z) => z.id === zoneId);
}

export function framesFromViews(views: ProductViews | undefined): string[] {
  if (!views) return [];
  return uniqueUrls(
    VIEW_ORDER.map((key) => views[key]).filter(
      (url): url is string => Boolean(url),
    ),
  );
}

/** Explicit orbit frames only — never invent angles from unrelated gallery shots. */
export function resolveConfiguredRotationFrames(
  config: ProductCustomizationConfig,
): string[] {
  if (config.rotationFrames?.length) {
    return uniqueUrls(config.rotationFrames);
  }
  return framesFromViews(config.views);
}

export type ViewerFrameResolution = {
  frames: string[];
  /** True only when authored sequential frames meet the orbit threshold. */
  orbitEnabled: boolean;
  unavailableReason: string | null;
  mode?: "single" | "multi" | "orbit";
  statusLabel?: string;
  primaryIndex?: number;
};

export {
  resolveViewerFrames,
  resolveProductViewerState,
  getAvailableProductViews,
  ORBIT_MIN_FRAMES,
  VIEWER_DRAG,
} from "@/lib/customization/viewer";

export function resolveZoneFrameIndex(
  zone: CustomizationZone,
  frames: string[],
  views?: ProductViews,
): number {
  if (!frames.length) return 0;
  if (zone.viewKey && views?.[zone.viewKey]) {
    const idx = frames.indexOf(views[zone.viewKey]!);
    if (idx >= 0) return idx;
  }
  if (
    typeof zone.frameIndex === "number" &&
    zone.frameIndex >= 0 &&
    zone.frameIndex < frames.length
  ) {
    return zone.frameIndex;
  }
  return 0;
}

export function zoneSupportsMedia(
  zone: CustomizationZone,
  mediaType: CustomizationMediaType,
  config: ProductCustomizationConfig,
): boolean {
  const supported =
    zone.allowedElementTypes ??
    zone.supportedCustomization ??
    config.allowedElements ??
    config.supportedTypes ??
    (config.types?.filter(
      (t): t is CustomizationMediaType =>
        t === "text" || t === "logo" || t === "image",
    ) as CustomizationMediaType[] | undefined) ??
    ALL_MEDIA;
  return supported.includes(mediaType);
}
