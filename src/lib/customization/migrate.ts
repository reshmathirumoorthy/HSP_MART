/**
 * Legacy cart customization → normalized CartCustomization (Phase 13A).
 * Does not rewrite hsp-mart-cart keys; only normalizes payloads in memory.
 *
 * Identity-critical fields (variant, text, placement, transforms, media) are
 * preserved exactly as `normalizeCustomization` produces them so existing
 * cart lines do not change `getCustomizationIdentityKey`.
 */

import { normalizeCustomization } from "@/lib/cart";
import {
  CUSTOMIZATION_SCHEMA_VERSION,
  type CartCustomization,
  type CustomizationPlacementOption,
} from "@/types/customization";

/** Map legacy placement onto a surface id for session restore only. */
export function legacyPlacementToSurfaceId(
  placement: CustomizationPlacementOption | undefined,
): string | undefined {
  return placement;
}

/**
 * Migrate unknown / legacy customization JSON into the current cart shape.
 * Safe for missing keys, invalid JSON objects, and partial Phase 10 lines.
 */
export function migrateLegacyCustomization(
  value: unknown,
): CartCustomization | undefined {
  const normalized = normalizeCustomization(value);
  if (!normalized) return undefined;

  return {
    ...normalized,
    schemaVersion: normalized.schemaVersion ?? CUSTOMIZATION_SCHEMA_VERSION,
  };
}

/**
 * Ensure a known CartCustomization carries schemaVersion without changing identity fields.
 */
export function ensureCustomizationSchemaVersion(
  customization: CartCustomization,
): CartCustomization {
  if (customization.schemaVersion === CUSTOMIZATION_SCHEMA_VERSION) {
    return customization;
  }
  return {
    ...customization,
    schemaVersion: CUSTOMIZATION_SCHEMA_VERSION,
  };
}
