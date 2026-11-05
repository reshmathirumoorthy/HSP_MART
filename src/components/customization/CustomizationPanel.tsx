"use client";

import { useEffect, useMemo } from "react";
import type { Product } from "@/types/product";
import type {
  AdvancedCustomizationState,
  CustomizationMediaType,
} from "@/types/customization";
import { ProductCustomizationStudio } from "@/components/customization/ProductCustomizationStudio";
import { useCustomizationHistory } from "@/components/customization/useCustomizationHistory";
import { resolveProductCustomizationConfig } from "@/components/customization/resolveProductCustomization";
import {
  addSurfaceObject,
  clampLayerPosition,
  clampRotation,
  clampScale,
  clearSurfaceCustomization,
  createDefaultAdvancedState,
  getSurfacePlacementBounds,
  removeSurfaceObject,
  resetElementPlacement,
  sanitizeCustomizationText,
  selectSurfaceObject,
  switchActiveZone,
  toCartCustomization,
  validateAdvancedState,
  withSyncedActiveZone,
} from "@/components/customization/customization.utils";

type Props = {
  product: Product;
  onStateChange?: (state: AdvancedCustomizationState) => void;
};

const EMPTY_STATE: AdvancedCustomizationState = {
  enabled: false,
  variantId: "",
  activeZoneId: "front",
  activeObjectId: "layer-1",
  mediaType: "text",
  layer: {
    id: "layer-1",
    type: "text",
    text: "",
    font: "classic",
    color: "black",
    x: 50,
    y: 50,
    scale: 1,
  },
  zoneLayers: {},
};

function layerCoalesceKey(
  partial: Partial<AdvancedCustomizationState["layer"]>,
): string | undefined {
  const keys = Object.keys(partial);
  if (keys.every((key) => key === "x" || key === "y")) return "drag";
  if (keys.length === 1 && keys[0] === "scale") return "scale";
  if (keys.length === 1 && keys[0] === "rotation") return "rotate";
  if (keys.length === 1 && keys[0] === "text") return "text";
  return undefined;
}

export function CustomizationPanel({ product, onStateChange }: Props) {
  const config = useMemo(
    () => resolveProductCustomizationConfig(product),
    [product],
  );
  const initial = useMemo(
    () => (config ? createDefaultAdvancedState(config) : EMPTY_STATE),
    [config],
  );
  const {
    state,
    commit,
    replacePresent,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useCustomizationHistory(initial);

  useEffect(() => {
    replacePresent(config ? createDefaultAdvancedState(config) : EMPTY_STATE);
  }, [product.id, config, replacePresent]);

  useEffect(() => {
    onStateChange?.(state);
  }, [onStateChange, state]);

  const error = useMemo(() => {
    if (!config || !state.enabled) return null;
    return validateAdvancedState(state, config, false);
  }, [config, state]);

  if (!config?.enabled) return null;

  const update = (partial: Partial<AdvancedCustomizationState>) => {
    commit(withSyncedActiveZone({ ...state, ...partial }));
  };

  const changeZone = (zoneId: string) => {
    commit(switchActiveZone(state, config, zoneId));
  };

  const selectObject = (objectId: string) => {
    commit(selectSurfaceObject(state, objectId));
  };

  const addObject = (mediaType: CustomizationMediaType) => {
    commit(addSurfaceObject(state, config, mediaType));
  };

  const removeObject = (objectId: string) => {
    commit(removeSurfaceObject(state, config, objectId));
  };

  const updateLayer = (
    partial: Partial<AdvancedCustomizationState["layer"]>,
    objectId?: string,
  ) => {
    const base =
      objectId && objectId !== state.activeObjectId
        ? selectSurfaceObject(state, objectId)
        : state;
    const nextLayer = { ...base.layer, ...partial };
    if (typeof partial.text === "string") {
      nextLayer.text = sanitizeCustomizationText(
        partial.text,
        config.preview.maxLength,
      );
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
        getSurfacePlacementBounds(config, base.activeZoneId),
      );
      nextLayer.x = clamped.x;
      nextLayer.y = clamped.y;
    }
    commit(withSyncedActiveZone({ ...base, layer: nextLayer }), {
      coalesceKey: layerCoalesceKey(partial),
    });
  };

  const nudge = (dx: number, dy: number) => {
    const next = clampLayerPosition(
      state.layer.x + dx,
      state.layer.y + dy,
      state.layer.scale,
      getSurfacePlacementBounds(config, state.activeZoneId),
    );
    updateLayer({ x: next.x, y: next.y });
  };

  const reset = () => {
    replacePresent(createDefaultAdvancedState(config));
  };

  return (
    <ProductCustomizationStudio
      product={product}
      config={config}
      state={state}
      error={error}
      onChange={update}
      onLayerChange={updateLayer}
      onZoneChange={changeZone}
      onSelectObject={selectObject}
      onAddObject={addObject}
      onRemoveObject={removeObject}
      onClearSurface={(surfaceId) =>
        commit(clearSurfaceCustomization(state, config, surfaceId))
      }
      onReset={reset}
      onResetElement={() => commit(resetElementPlacement(state, config))}
      onNudge={nudge}
      onLayerMove={(x, y, objectId) => updateLayer({ x, y }, objectId)}
      onUndo={undo}
      onRedo={redo}
      canUndo={canUndo}
      canRedo={canRedo}
    />
  );
}

export function getCustomizationForCart(
  state: AdvancedCustomizationState | null | undefined,
) {
  if (!state) return undefined;
  return toCartCustomization(state);
}
