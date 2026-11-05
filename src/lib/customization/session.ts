/**
 * Customization session ↔ cart serialization (Phase 13A foundation).
 * Reuses existing studio helpers — does not invent a second state tree.
 */

import {
  createDefaultAdvancedState,
  toCartCustomization,
  withSyncedActiveZone,
  zoneHasContent,
} from "@/components/customization/customization.utils";
import { getDefaultZoneId } from "@/components/customization/customization.zones";
import { withSafeCustomizationDefaults } from "@/lib/customization/defaults";
import { migrateLegacyCustomization } from "@/lib/customization/migrate";
import type { Product } from "@/types/product";
import {
  CUSTOMIZATION_SCHEMA_VERSION,
  PRIMARY_VIEW_ID,
  type AdvancedCustomizationState,
  type CartCustomization,
  type CartZoneCustomization,
  type CustomizationLayer,
  type CustomizationSession,
  type ProductCustomizationConfig,
  type ZoneLayerState,
} from "@/types/customization";

function layerFromZone(zone: CartZoneCustomization): CustomizationLayer {
  const type = zone.type ?? "text";
  return {
    id: zone.objectId ?? `layer-${zone.zoneId}`,
    type,
    text: zone.text,
    font: zone.font,
    color: zone.color,
    textOrientation: zone.textOrientation,
    mediaDataUrl: zone.mediaDataUrl,
    mediaName: zone.mediaName,
    x: zone.x ?? 50,
    y: zone.y ?? 50,
    scale: zone.scale ?? 1,
    rotation: zone.rotation ?? 0,
    surfaceId: zone.zoneId,
  };
}

function zoneStateFromCartZones(
  zoneId: string,
  zoneLabel: string,
  zones: CartZoneCustomization[],
): ZoneLayerState {
  const objects = zones.map(layerFromZone);
  const active = objects[0];
  return {
    zoneId,
    zoneLabel,
    objects,
    activeObjectId: active.id,
    mediaType: active.type,
    layer: active,
  };
}

/**
 * Build a studio session shell for a product + resolved config.
 */
export function createCustomizationSession(
  product: Product,
  config: ProductCustomizationConfig,
  options?: {
    variantId?: string;
    activeViewId?: string;
  },
): CustomizationSession {
  const safe = withSafeCustomizationDefaults(config, product);
  const base = createDefaultAdvancedState(safe);
  if (options?.variantId) {
    base.variantId = options.variantId;
  }
  const activeSurfaceId = base.activeZoneId || getDefaultZoneId(safe);
  const activeViewId =
    options?.activeViewId ??
    safe.defaultViewId ??
    safe.viewList?.[0]?.id ??
    PRIMARY_VIEW_ID;

  return {
    ...base,
    activeViewId,
    schemaVersion: CUSTOMIZATION_SCHEMA_VERSION,
    productId: product.id,
    activeSurfaceId,
    selectedElementId: base.activeObjectId,
  };
}

export function toCustomizationSession(
  state: AdvancedCustomizationState,
  productId: string,
  activeViewId?: string,
): CustomizationSession {
  const synced = withSyncedActiveZone(state);
  return {
    ...synced,
    activeViewId: activeViewId ?? synced.activeViewId ?? PRIMARY_VIEW_ID,
    schemaVersion: CUSTOMIZATION_SCHEMA_VERSION,
    productId,
    activeSurfaceId: synced.activeZoneId,
    selectedElementId: synced.activeObjectId,
  };
}

/**
 * Persist a session using the existing cart DTO (schemaVersion stamped).
 */
export function sessionToCartCustomization(
  session: AdvancedCustomizationState | CustomizationSession,
): CartCustomization | undefined {
  const cart = toCartCustomization(session);
  if (!cart) return undefined;
  return {
    ...cart,
    schemaVersion: CUSTOMIZATION_SCHEMA_VERSION,
  };
}

/**
 * Restore a session from cart / localStorage without losing multi-surface data.
 * CASE: Body text + Cap logo both survive when zoneCustomizations are present.
 */
export function cartCustomizationToSession(
  product: Product,
  config: ProductCustomizationConfig,
  raw: unknown,
): CustomizationSession {
  const safe = withSafeCustomizationDefaults(config, product);
  const cart = migrateLegacyCustomization(raw);
  const base = createDefaultAdvancedState(safe);
  if (cart?.variantId) {
    base.variantId = cart.variantId;
  }

  if (!cart) {
    return toCustomizationSession(base, product.id, safe.defaultViewId);
  }

  const zoneCustomizations = cart.zoneCustomizations ?? [];
  if (zoneCustomizations.length > 0) {
    const byZone = new Map<string, CartZoneCustomization[]>();
    for (const entry of zoneCustomizations) {
      const list = byZone.get(entry.zoneId) ?? [];
      list.push(entry);
      byZone.set(entry.zoneId, list);
    }

    const zoneLayers: Record<string, ZoneLayerState> = {
      ...base.zoneLayers,
    };
    for (const [zoneId, zones] of byZone) {
      const label = zones[0]?.zoneLabel || zoneId;
      zoneLayers[zoneId] = zoneStateFromCartZones(zoneId, label, zones);
    }

    const activeZoneId =
      cart.zoneId ??
      cart.customizationZone ??
      base.activeZoneId;
    const activeZone =
      zoneLayers[activeZoneId] ??
      zoneLayers[Object.keys(zoneLayers)[0]] ??
      Object.values(base.zoneLayers)[0];

    const restored: AdvancedCustomizationState = {
      ...base,
      enabled: Object.values(zoneLayers).some((entry) => zoneHasContent(entry)),
      variantId: cart.variantId ?? base.variantId,
      activeZoneId: activeZone.zoneId,
      activeObjectId: activeZone.activeObjectId,
      mediaType: activeZone.mediaType,
      layer: activeZone.layer,
      zoneLayers,
      activeViewId: safe.defaultViewId,
    };

    return toCustomizationSession(restored, product.id, safe.defaultViewId);
  }

  // Single-layer legacy / primary fields → active surface only.
  const activeZoneId =
    cart.zoneId ??
    cart.customizationZone ??
    cart.placement ??
    base.activeZoneId;
  const surface = base.zoneLayers[activeZoneId] ?? Object.values(base.zoneLayers)[0];
  if (!surface) {
    return toCustomizationSession(base, product.id, safe.defaultViewId);
  }

  const layer: CustomizationLayer = {
    ...surface.layer,
    type: cart.type ?? surface.layer.type,
    text: cart.text ?? surface.layer.text,
    font: cart.font ?? surface.layer.font,
    color: cart.color ?? surface.layer.color,
    textOrientation: cart.textOrientation ?? surface.layer.textOrientation,
    mediaDataUrl: cart.mediaDataUrl ?? surface.layer.mediaDataUrl,
    mediaName: cart.mediaName ?? surface.layer.mediaName,
    x: cart.x ?? surface.layer.x,
    y: cart.y ?? surface.layer.y,
    scale: cart.scale ?? surface.layer.scale,
    rotation: cart.rotation ?? surface.layer.rotation ?? 0,
    surfaceId: activeZoneId,
  };

  const restored: AdvancedCustomizationState = {
    ...base,
    enabled: true,
    variantId: cart.variantId ?? base.variantId,
    activeZoneId,
    activeObjectId: layer.id,
    mediaType: layer.type,
    layer,
    zoneLayers: {
      ...base.zoneLayers,
      [activeZoneId]: {
        ...surface,
        zoneId: activeZoneId,
        objects: [layer],
        activeObjectId: layer.id,
        mediaType: layer.type,
        layer,
      },
    },
    activeViewId: safe.defaultViewId,
  };

  return toCustomizationSession(restored, product.id, safe.defaultViewId);
}

/** Flatten session elements for inspection / future multi-surface UI. */
export function listSessionElements(
  session: AdvancedCustomizationState | CustomizationSession,
): CustomizationLayer[] {
  return Object.values(session.zoneLayers).flatMap((zone) =>
    (zone.objects?.length ? zone.objects : [zone.layer]).map((layer) => ({
      ...layer,
      surfaceId: layer.surfaceId ?? zone.zoneId,
    })),
  );
}
