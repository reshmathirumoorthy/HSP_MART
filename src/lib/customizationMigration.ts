/**
 * Phase 13A — public migration entrypoint (stable import path).
 * Prefer `@/lib/customization` for new code.
 */

export {
  ensureCustomizationSchemaVersion,
  migrateLegacyCustomization,
} from "@/lib/customization/migrate";

export {
  cartCustomizationToSession,
  sessionToCartCustomization,
} from "@/lib/customization/session";

export { getCustomizationIdentityKey } from "@/lib/customization/identity";
