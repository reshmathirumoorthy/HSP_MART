"use client";

import Link from "next/link";
import { useState } from "react";
import type { Product } from "@/types/product";
import { isInStock } from "@/lib/productAvailability";
import { trackEvent } from "@/lib/analytics";
import { useCart } from "@/context/CartContext";
import { ProductCustomizationStudio } from "@/components/customization/ProductCustomizationStudio";
import { useCustomizationHistory } from "@/components/customization/useCustomizationHistory";
import { resolveProductCustomizationConfig } from "@/components/customization/resolveProductCustomization";
import {
  addSurfaceObject,
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
  clampLayerPosition,
  clampRotation,
  clampScale,
} from "@/components/customization/customization.utils";
import { validateCustomizationForReview } from "@/lib/customization/review";
import type {
  AdvancedCustomizationState,
  CustomizationMediaType,
} from "@/types/customization";
import studioStyles from "./customization.module.css";
import pageStyles from "./ProductCustomizationStudioPage.module.css";

type Props = {
  product: Product;
  initialQuantity?: number;
};

export function ProductCustomizationStudioPage({
  product,
  initialQuantity = 1,
}: Props) {
  const config = resolveProductCustomizationConfig(product);
  const isHamper = Boolean(product.hamperConfig?.enabled);
  const { addToCart, openCart } = useCart();

  const inStock = isInStock(product);
  const maxQuantity =
    typeof product.stockQuantity === "number" && product.stockQuantity > 0
      ? Math.min(999, product.stockQuantity)
      : 999;
  const safeQuantity = Math.min(
    Math.max(1, initialQuantity || 1),
    maxQuantity,
  );

  const initialCustom = createDefaultAdvancedState(config);
  const initialCustomizationState: AdvancedCustomizationState = {
    ...initialCustom,
    enabled: true,
  };

  const {
    state: customState,
    commit,
    replacePresent,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useCustomizationHistory(initialCustomizationState);

  const [added, setAdded] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validationError = validateAdvancedState(customState, config, false);

  const handleConfirmAddToCart = () => {
    if (adding) return;
    setAdding(true);
    const reviewIssues = validateCustomizationForReview(customState, config);
    const blocking = reviewIssues.find((issue) => issue.level === "error");
    if (blocking) {
      setError(blocking.message);
      return;
    }

    const requiredError = validateAdvancedState(customState, config, true);
    if (requiredError) {
      setError(requiredError);
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

    setError(null);
    setAdded(true);
    const ok = addToCart(product.id, safeQuantity, customization);
    if (!ok) {
      setAdded(false);
      return;
    }
    trackEvent("customized_product_added_to_cart", {
      productId: product.id,
      productSlug: product.slug,
      quantity: safeQuantity,
      customizationTextLength: customization?.text?.length,
      font: customization?.font,
      color: customization?.color,
      placement: customization?.placement,
    });
    openCart();
    setAdding(false);
  };

  const handleDismissAdded = () => {
    setAdded(false);
  };

  const updateCustom = (partial: Partial<AdvancedCustomizationState>) => {
    commit(withSyncedActiveZone({ ...customState, ...partial }));
    setError(null);
  };

  const changeZone = (zoneId: string) => {
    commit(switchActiveZone(customState, config, zoneId));
    setError(null);
  };

  const clearSurface = (surfaceId: string) => {
    commit(clearSurfaceCustomization(customState, config, surfaceId));
    setError(null);
  };

  const selectObject = (objectId: string) => {
    commit(selectSurfaceObject(customState, objectId));
    setError(null);
  };

  const addObject = (mediaType: CustomizationMediaType) => {
    commit(addSurfaceObject(customState, config, mediaType));
    setError(null);
  };

  const removeObject = (objectId: string) => {
    commit(removeSurfaceObject(customState, config, objectId));
    setError(null);
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
      coalesceKey:
        typeof partial.x === "number" || typeof partial.y === "number"
          ? "drag"
          : typeof partial.scale === "number"
            ? "scale"
            : typeof partial.rotation === "number"
              ? "rotate"
              : typeof partial.text === "string"
                ? "text"
                : undefined,
    });
    setError(null);
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
    setError(null);
  };

  const resetElement = () => {
    if (!config) return;
    commit(resetElementPlacement(customState, config));
    setError(null);
  };

  if (isHamper) {
    return (
      <section
        className={pageStyles.fallback}
        aria-labelledby="customize-hamper-heading"
      >
        <div className="shell">
          <p className={studioStyles.eyebrow}>Customization Studio</p>
          <h1 id="customize-hamper-heading" className={studioStyles.title}>
            Gift hamper customization
          </h1>
          <p className={studioStyles.copy}>
            This gift hamper is configured through our hamper builder. Personalised
            hamper contents, packaging and message options are prepared from your
            selections there.
          </p>
          <div className={pageStyles.fallbackActions}>
            <Link
              href={`/bulk-quote?product=${product.slug}`}
              className="btn btn--outline"
            >
              Request customization
            </Link>
            <Link href={`/products/${product.slug}`} className="link-quiet">
              Back to {product.name}
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const customHeader = (
    <header className={studioStyles.header}>
      <Link
        href={`/products/${product.slug}`}
        className={studioStyles.backLink}
      >
        <span aria-hidden>←</span> Back to Product
      </Link>
      <p className={studioStyles.eyebrow}>Customization Studio</p>
      <h2 id="customization-heading" className={studioStyles.title}>
        {product.name}
      </h2>
    </header>
  );

  const addAction = (
    <button
      type="button"
      className="btn btn--primary"
      onClick={handleConfirmAddToCart}
      disabled={!inStock || added || adding || !customState.enabled}
    >
      {added ? "Added to cart" : "Add Customized Product"}
    </button>
  );

  return (
    <div className={pageStyles.studioPage}>
      <div className={`shell ${pageStyles.page}`}>
        <ProductCustomizationStudio
          product={product}
          config={config}
          state={customState}
          error={error ?? validationError}
          quantity={safeQuantity}
          added={added}
          onChange={updateCustom}
          onLayerChange={(partial, objectId) => updateLayer(partial, objectId)}
          onZoneChange={changeZone}
          onSelectObject={selectObject}
          onAddObject={addObject}
          onRemoveObject={removeObject}
          onClearSurface={clearSurface}
          onReset={resetCustom}
          onResetElement={resetElement}
          onNudge={nudgeLayer}
          onLayerMove={(x, y, objectId) => updateLayer({ x, y }, objectId)}
          onUndo={undo}
          onRedo={redo}
          canUndo={canUndo}
          canRedo={canRedo}
          onConfirmAddToCart={handleConfirmAddToCart}
          onDismissAdded={handleDismissAdded}
          header={customHeader}
          actions={addAction}
        />
      </div>
    </div>
  );
}
