"use client";

import Link from "next/link";
import { formatPrice, type Product } from "@/data/products";
import { productAvailabilityLabel } from "@/lib/productAvailability";
import { ProductCustomizationStudio } from "@/components/customization/ProductCustomizationStudio";
import { useCustomizationHistory } from "@/components/customization/useCustomizationHistory";
import { resolveProductCustomizationConfig } from "@/components/customization/resolveProductCustomization";
import {
  createDefaultAdvancedState,
  getVariants,
  resolveVariantImage,
  toCartCustomization,
  validateAdvancedState,
  withSyncedActiveZone,
} from "@/components/customization/customization.utils";
import {
  addSurfaceObject,
  clampLayerPosition,
  clampRotation,
  clampScale,
  clearSurfaceCustomization,
  getSurfacePlacementBounds,
  removeSurfaceObject,
  resetElementPlacement,
  sanitizeCustomizationText,
  selectSurfaceObject,
  switchActiveZone,
} from "@/components/customization/customization.utils";
import { validateCustomizationForReview } from "@/lib/customization/review";
import { useCart } from "@/context/CartContext";
import { QuantitySelector } from "@/components/QuantitySelector";
import { WishlistButton } from "@/components/discovery/WishlistButton";
import { CompareButton } from "@/components/discovery/CompareButton";
import { ProductGallery } from "@/components/ProductGallery";
import type { AdvancedCustomizationState, CustomizationMediaType } from "@/types/customization";
import type { CartCustomization } from "@/types/customization";
import type { CSSProperties } from "react";
import styles from "./ProductCustomizer.module.css";
import purchaseStyles from "./ProductPurchasePanel.module.css";

const EMPTY_CUSTOM_STATE: AdvancedCustomizationState = {
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

type Props = {
  product: Product;
  quantity: number;
  setQuantity: (value: number) => void;
  maxQuantity: number;
  disabled: boolean;
  onAddToCart: (customization?: CartCustomization) => void;
  added: boolean;
  adding: boolean;
  cartError: string | null;
  setCartError: (error: string | null) => void;
  primaryLabel: string;
};

export function ProductCustomizer({
  product,
  quantity,
  setQuantity,
  maxQuantity,
  disabled,
  onAddToCart,
  added,
  adding,
  cartError,
  setCartError,
  primaryLabel,
}: Props) {
  const config = resolveProductCustomizationConfig(product);
  const hamperConfig = product.hamperConfig;
  const isHamper = Boolean(hamperConfig?.enabled);

  const initialCustom = createDefaultAdvancedState(
    config ?? EMPTY_CUSTOM_STATE,
  );

  const {
    state: customState,
    commit,
    replacePresent,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useCustomizationHistory(initialCustom);

  const variants = config ? getVariants(config) : [];
  const selectedVariant =
    variants.find((variant) => variant.id === customState.variantId) ??
    variants[0];

  const gallerySrc =
    config && selectedVariant
      ? resolveVariantImage(config, selectedVariant.id, product.images)
      : undefined;

  const configurableLabels = (
    config?.supportedTypes ??
    config?.types ??
    product.customizationTypes ??
    []
  ).filter(
    (type): type is "text" | "logo" | "image" =>
      type === "text" || type === "logo" || type === "image",
  );

  const showCompareAt =
    typeof product.compareAtPrice === "number" &&
    product.compareAtPrice > product.price;

  const validationError =
    config && customState.enabled
      ? validateAdvancedState(customState, config, false)
      : null;

  const handleConfirmCustomizedAdd = () => {
    if (!config) return;

    const reviewIssues = validateCustomizationForReview(customState, config);
    const blocking = reviewIssues.find((issue) => issue.level === "error");
    if (blocking) {
      setCartError(blocking.message);
      return;
    }

    const requiredError = validateAdvancedState(customState, config, true);
    if (requiredError) {
      setCartError(requiredError);
      return;
    }

    const customization = toCartCustomization(customState);
    if (customization) {
      const variant = config.variants?.find(
        (item) => item.id === customState.variantId,
      );
      if (variant) {
        customization.variantId = variant.id;
        customization.variantLabel = variant.label;
      }
    }

    setCartError(null);
    onAddToCart(customization);
  };

  const updateCustom = (partial: Partial<AdvancedCustomizationState>) => {
    commit(withSyncedActiveZone({ ...customState, ...partial }));
    setCartError(null);
  };

  const changeZone = (zoneId: string) => {
    if (!config) return;
    commit(switchActiveZone(customState, config, zoneId));
    setCartError(null);
  };

  const clearSurface = (surfaceId: string) => {
    if (!config) return;
    commit(clearSurfaceCustomization(customState, config, surfaceId));
    setCartError(null);
  };

  const selectObject = (objectId: string) => {
    commit(selectSurfaceObject(customState, objectId));
    setCartError(null);
  };

  const addObject = (mediaType: CustomizationMediaType) => {
    if (!config) return;
    commit(addSurfaceObject(customState, config, mediaType));
    setCartError(null);
  };

  const removeObject = (objectId: string) => {
    if (!config) return;
    commit(removeSurfaceObject(customState, config, objectId));
    setCartError(null);
  };

  const updateLayer = (
    partial: Partial<AdvancedCustomizationState["layer"]>,
    objectId?: string,
  ) => {
    const base =
      objectId && objectId !== customState.activeObjectId
        ? selectSurfaceObject(customState, objectId)
        : customState;
    const nextLayer = { ...base.layer, ...partial };
    if (typeof partial.text === "string" && config) {
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
      const bounds = config
        ? getSurfacePlacementBounds(config, base.activeZoneId)
        : undefined;
      const clamped = clampLayerPosition(
        partial.x ?? nextLayer.x,
        partial.y ?? nextLayer.y,
        nextLayer.scale,
        bounds,
      );
      nextLayer.x = clamped.x;
      nextLayer.y = clamped.y;
    }
    commit(withSyncedActiveZone({ ...base, layer: nextLayer }), {
      coalesceKey: layerCoalesceKey(partial),
    });
    setCartError(null);
  };

  const nudgeLayer = (dx: number, dy: number) => {
    const bounds = config
      ? getSurfacePlacementBounds(config, customState.activeZoneId)
      : undefined;
    const next = clampLayerPosition(
      customState.layer.x + dx,
      customState.layer.y + dy,
      customState.layer.scale,
      bounds,
    );
    commit(
      withSyncedActiveZone({
        ...customState,
        layer: { ...customState.layer, x: next.x, y: next.y },
      }),
      { coalesceKey: "nudge" },
    );
  };

  const resetCustom = () => {
    if (!config) return;
    replacePresent(createDefaultAdvancedState(config));
    setCartError(null);
  };

  const resetElement = () => {
    if (!config) return;
    commit(resetElementPlacement(customState, config));
    setCartError(null);
  };

  const showCustomizer = Boolean(config && !isHamper);

  return (
    <section className={styles.customizer} id="personalise">
      {showCustomizer ? (
        <>
          <div className={styles.customizerHeader}>
            <div className={styles.customizerIntro}>
              <p className={styles.customizerEyebrow}>
                Personalise Your Product
              </p>
              <h2 className={styles.customizerTitle}>Make it yours</h2>
              <p className={styles.customizerCopy}>
                Add your name, logo, or image to this product before you order.
              </p>
            </div>
            <button
              type="button"
              className={styles.resetBtn}
              onClick={() => {
                replacePresent(createDefaultAdvancedState(config));
                setCartError(null);
              }}
              disabled={!customState.enabled}
            >
              Reset
            </button>
          </div>

          <ProductCustomizationStudio
            product={product}
            config={config}
            state={customState}
            error={validationError}
            quantity={quantity}
            added={added}
            onChange={updateCustom}
            onLayerChange={(partial, objectId) =>
              updateLayer(partial, objectId)
            }
            onZoneChange={changeZone}
            onSelectObject={selectObject}
            onAddObject={addObject}
            onRemoveObject={removeObject}
            onClearSurface={clearSurface}
            onReset={resetCustom}
            onResetElement={resetElement}
            onNudge={nudgeLayer}
            onLayerMove={(x, y, objectId) =>
              updateLayer({ x, y }, objectId)
            }
            onUndo={undo}
            onRedo={redo}
            canUndo={canUndo}
            canRedo={canRedo}
            onConfirmAddToCart={handleConfirmCustomizedAdd}
            onDismissAdded={() => {}}
          />
        </>
      ) : null}
    </section>
  );
}
