/**
 * Deterministic cart-line identity for customized products.
 * Extracted so Phase 13A+ can share the same key without product-slug branching.
 */

import type {
  CartCustomization,
  CartHamperContent,
  CartZoneCustomization,
} from "@/types/customization";

function contentsKey(contents: CartHamperContent[] | undefined): string {
  if (!contents?.length) return "";
  return contents
    .map((item) => `${item.productId}:${item.quantity}`)
    .sort()
    .join(",");
}

function zonesKey(zones: CartZoneCustomization[] | undefined): string {
  if (!zones?.length) return "";
  return zones
    .map((zone) =>
      [
        zone.zoneId,
        zone.objectId ?? "",
        zone.type ?? "",
        (zone.text ?? "").trim().toLowerCase(),
        zone.font ?? "",
        zone.color ?? "",
        zone.textOrientation ?? "",
        zone.mediaName ?? "",
        zone.mediaDataUrl
          ? `media:${zone.mediaDataUrl.length}:${zone.mediaDataUrl.slice(0, 32)}`
          : "",
        String(zone.x ?? ""),
        String(zone.y ?? ""),
        String(zone.scale ?? ""),
        String(zone.rotation ?? ""),
      ].join(":"),
    )
    .sort()
    .join(";");
}

/**
 * Stable fingerprint of a cart customization payload.
 * Different variants, surfaces, or element contents must never collide.
 */
export function getCustomizationIdentityKey(
  customization: CartCustomization,
): string {
  const orientation =
    customization.type === "text" || (!customization.type && customization.text)
      ? (customization.textOrientation ?? "horizontal")
      : "";

  return [
    customization.hamper ? "hamper" : "",
    contentsKey(customization.contents),
    customization.variantId ?? "",
    customization.zoneId ?? customization.customizationZone ?? "",
    zonesKey(customization.zoneCustomizations),
    customization.type ?? "text",
    (customization.text ?? "").trim().toLowerCase(),
    customization.font ?? "",
    customization.color ?? "",
    orientation,
    customization.placement ?? "",
    customization.mediaName ?? "",
    customization.mediaDataUrl
      ? `media:${customization.mediaDataUrl.length}:${customization.mediaDataUrl.slice(0, 48)}`
      : "",
    String(customization.x ?? ""),
    String(customization.y ?? ""),
    String(customization.scale ?? ""),
    String(customization.rotation ?? ""),
  ].join("|");
}

/** @deprecated Prefer getCustomizationIdentityKey — kept for call-site clarity. */
export const stableCustomizationKey = getCustomizationIdentityKey;
