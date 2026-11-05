"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import type { Product } from "@/types/product";
import type {
  AdvancedCustomizationState,
  ProductCustomizationConfig,
} from "@/types/customization";
import type { HamperConfig, HamperStep } from "@/types/hamper";
import { isInStock } from "@/lib/productAvailability";
import { getProductById } from "@/lib/products";
import {
  canSelectProduct,
  createDefaultHamperState,
  createDefaultLayerForHamper,
  filterHamperProducts,
  hamperCategories,
  removeHamperSelection,
  resolveHamperProducts,
  toHamperCartCustomization,
  toggleOrReplaceSelection,
  updateHamperBrandingLayer,
  validateHamperContents,
  type HamperBuilderState,
} from "@/lib/hamper";
import { AdvancedCustomizationControls } from "@/components/customization/AdvancedCustomizationControls";
import { HamperPreview } from "@/components/hamper/HamperPreview";
import {
  addSurfaceObject,
  clampLayerPosition,
  getSurfacePlacementBounds,
  removeSurfaceObject,
  selectSurfaceObject,
  switchActiveZone,
  validateAdvancedState,
  withSyncedActiveZone,
} from "@/components/customization/customization.utils";
import styles from "./hamper.module.css";

type Props = {
  product: Product;
  onAddToCart: (state: HamperBuilderState) => void;
  added: boolean;
  cartError: string | null;
};

function brandingConfigFromHamper(
  config: HamperConfig,
  base?: ProductCustomizationConfig,
): ProductCustomizationConfig {
  return {
    enabled: true,
    supportedTypes: config.brandingTypes,
    printableArea: config.brandingArea,
    surfaces: base?.surfaces ?? base?.customizationZones ?? [
      {
        id: "front",
        label: "Hamper Front",
        type: "surface",
        defaultPosition: { x: 50, y: 82 },
        bounds: config.brandingArea,
      },
      {
        id: "lid",
        label: "Lid / Top",
        type: "surface",
        defaultPosition: { x: 50, y: 28 },
        bounds: { x: 28, y: 18, width: 44, height: 22 },
      },
    ],
    defaultZoneId: "front",
    preview: {
      type: "box",
      defaultPlacement: "center",
      placements: ["center"],
      fonts: base?.preview.fonts ?? ["classic", "modern", "bold", "handwritten"],
      colors: base?.preview.colors ?? ["black", "white", "green", "gold"],
      maxLength: base?.preview.maxLength ?? 20,
    },
  };
}

export function HamperBuilder({
  product,
  onAddToCart,
  added,
  cartError,
}: Props) {
  const config = product.hamperConfig;
  const maxLength = product.customization?.preview.maxLength ?? 20;

  const [state, setState] = useState<HamperBuilderState>(() =>
    createDefaultHamperState(
      config ?? {
        enabled: true,
        selectionMode: "slots",
        slots: 5,
        availableProducts: [],
        brandingTypes: ["text"],
        brandingArea: { x: 30, y: 78, width: 40, height: 14 },
      },
      maxLength,
    ),
  );

  const available = useMemo(
    () => (config ? resolveHamperProducts(config) : []),
    [config],
  );
  const categories = useMemo(() => hamperCategories(available), [available]);
  const filtered = useMemo(
    () =>
      filterHamperProducts(available, state.search, state.categoryFilter),
    [available, state.search, state.categoryFilter],
  );

  const brandingConfig = useMemo(
    () =>
      config
        ? brandingConfigFromHamper(config, product.customization)
        : null,
    [config, product.customization],
  );

  const brandingValidation = useMemo(() => {
    if (!brandingConfig || !state.brandingEnabled) return null;
    return validateAdvancedState(
      { ...state.branding, enabled: true },
      brandingConfig,
      false,
    );
  }, [brandingConfig, state.branding, state.brandingEnabled]);

  if (!config || !brandingConfig) return null;

  const contentsError = validateHamperContents(
    state.selectedIds,
    config,
    state.step !== "contents",
  );

  const setStep = (step: HamperStep) => {
    setState((current) => ({ ...current, step, replacingIndex: null }));
  };

  const reset = () => {
    setState(createDefaultHamperState(config, maxLength));
  };

  const resetBrandingOnly = () => {
    setState((current) => ({
      ...current,
      brandingEnabled: false,
      branding: createDefaultHamperState(config, maxLength).branding,
    }));
  };

  const selectProduct = (productId: string) => {
    setState((current) => {
      const next = toggleOrReplaceSelection(
        current.selectedIds,
        productId,
        config.slots,
        current.replacingIndex,
      );
      return { ...current, ...next };
    });
  };

  const removeProduct = (productId: string) => {
    setState((current) => ({
      ...current,
      selectedIds: removeHamperSelection(current.selectedIds, productId),
      replacingIndex: null,
    }));
  };

  const startReplace = (index: number) => {
    setState((current) => ({
      ...current,
      step: "contents",
      replacingIndex: index,
    }));
  };

  const updateBranding = (partial: Partial<AdvancedCustomizationState>) => {
    setState((current) => {
      let nextBranding = { ...current.branding, ...partial };
      if (partial.mediaType && partial.mediaType !== current.branding.mediaType) {
        nextBranding = {
          ...nextBranding,
          layer: {
            ...createDefaultLayerForHamper(partial.mediaType),
            text:
              partial.mediaType === "text"
                ? current.branding.layer.text
                : "",
            mediaDataUrl:
              partial.mediaType === "text"
                ? undefined
                : current.branding.layer.mediaDataUrl,
            mediaName:
              partial.mediaType === "text"
                ? undefined
                : current.branding.layer.mediaName,
            x: current.branding.layer.x,
            y: current.branding.layer.y,
            scale: current.branding.layer.scale,
          },
        };
      }
      const enabled =
        typeof partial.enabled === "boolean"
          ? partial.enabled
          : current.brandingEnabled;
      return {
        ...current,
        brandingEnabled: enabled,
        branding: withSyncedActiveZone({ ...nextBranding, enabled }),
      };
    });
  };

  const changeBrandingZone = (zoneId: string) => {
    setState((current) => ({
      ...current,
      branding: switchActiveZone(current.branding, brandingConfig, zoneId),
    }));
  };

  const selectBrandingObject = (objectId: string) => {
    setState((current) => ({
      ...current,
      branding: selectSurfaceObject(current.branding, objectId),
    }));
  };

  const addBrandingObject = (
    mediaType: AdvancedCustomizationState["mediaType"],
  ) => {
    setState((current) => ({
      ...current,
      brandingEnabled: true,
      branding: addSurfaceObject(current.branding, brandingConfig, mediaType),
    }));
  };

  const removeBrandingObject = (objectId: string) => {
    setState((current) => ({
      ...current,
      branding: removeSurfaceObject(current.branding, brandingConfig, objectId),
    }));
  };

  const updateBrandingLayer = (
    partial: Partial<AdvancedCustomizationState["layer"]>,
  ) => {
    setState((current) => {
      let next = updateHamperBrandingLayer(
        current.branding,
        partial,
        maxLength,
      );
      if (typeof partial.x === "number" || typeof partial.y === "number") {
        const bounds = getSurfacePlacementBounds(
          brandingConfig,
          next.activeZoneId,
        );
        const clamped = clampLayerPosition(
          next.layer.x,
          next.layer.y,
          next.layer.scale,
          bounds,
        );
        next = {
          ...next,
          layer: { ...next.layer, x: clamped.x, y: clamped.y },
        };
      }
      return {
        ...current,
        branding: withSyncedActiveZone(next),
      };
    });
  };

  const nudgeBranding = (dx: number, dy: number) => {
    setState((current) => {
      const bounds = getSurfacePlacementBounds(
        brandingConfig,
        current.branding.activeZoneId,
      );
      const next = clampLayerPosition(
        current.branding.layer.x + dx,
        current.branding.layer.y + dy,
        current.branding.layer.scale,
        bounds,
      );
      return {
        ...current,
        branding: withSyncedActiveZone(
          updateHamperBrandingLayer(
            current.branding,
            { x: next.x, y: next.y },
            maxLength,
          ),
        ),
      };
    });
  };

  const showBrandingControls =
    state.step === "branding" || state.step === "preview";

  return (
    <section
      className={styles.panel}
      aria-labelledby="hamper-heading"
      id="customize"
    >
      <header className={styles.header}>
        <p className={styles.eyebrow}>Build your own</p>
        <h2 id="hamper-heading" className={styles.title}>
          Build your corporate gift hamper
        </h2>
        <p className={styles.copy}>
          Choose {config.slots} products from the HSP Mart catalogue, review the
          composition, then add text, logo or image branding.
        </p>
      </header>

      <div className={styles.steps} aria-label="Hamper builder steps">
        {(
          [
            ["contents", "01 Contents"],
            ["branding", "02 Branding"],
            ["preview", "03 Preview"],
          ] as const
        ).map(([key, label], index) => (
          <span key={key} style={{ display: "contents" }}>
            {index > 0 ? (
              <span className={styles.stepDivider} aria-hidden />
            ) : null}
            <button
              type="button"
              className={`${styles.step} ${
                state.step === key ? styles.stepActive : ""
              }`}
              aria-current={state.step === key ? "step" : undefined}
              onClick={() => setStep(key)}
            >
              {label}
            </button>
          </span>
        ))}
      </div>

      <div className={styles.layout}>
        <HamperPreview
          product={product}
          config={config}
          selectedIds={state.selectedIds}
          brandingEnabled={state.brandingEnabled}
          branding={state.branding}
          showBrandingArea={showBrandingControls}
          onBrandingMove={(x, y) => updateBrandingLayer({ x, y })}
        />

        <div className={styles.controls}>
          <div className={styles.section}>
            <p className={styles.sectionTitle}>Hamper contents</p>
            <p className={styles.counter} aria-live="polite">
              {state.selectedIds.length} / {config.slots} selected
            </p>

            <ul className={styles.selectedList}>
              {Array.from({ length: config.slots }).map((_, index) => {
                const id = state.selectedIds[index];
                const child = id ? getProductById(id) : null;
                return (
                  <li key={`slot-${index}`} className={styles.selectedItem}>
                    <span className={styles.selectedIndex}>{index + 1}.</span>
                    <span className={styles.selectedName}>
                      {child ? child.name : "Empty slot"}
                    </span>
                    {child ? (
                      <span className={styles.selectedActions}>
                        <button
                          type="button"
                          className={styles.linkBtn}
                          onClick={() => startReplace(index)}
                        >
                          Replace
                        </button>
                        <button
                          type="button"
                          className={styles.linkBtn}
                          onClick={() => removeProduct(child.id)}
                        >
                          Remove
                        </button>
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>

          {state.step === "contents" || state.replacingIndex !== null ? (
            <div className={styles.section}>
              <p className={styles.sectionTitle}>
                {state.replacingIndex !== null
                  ? `Replace slot ${state.replacingIndex + 1}`
                  : "Choose products"}
              </p>

              {state.replacingIndex !== null ? (
                <div className={styles.replaceBanner}>
                  Select a replacement product.{" "}
                  <button
                    type="button"
                    className={styles.linkBtn}
                    onClick={() =>
                      setState((current) => ({
                        ...current,
                        replacingIndex: null,
                      }))
                    }
                  >
                    Cancel
                  </button>
                </div>
              ) : null}

              <div className={styles.toolbar}>
                <input
                  className={styles.search}
                  type="search"
                  placeholder="Search products..."
                  value={state.search}
                  aria-label="Search hamper products"
                  onChange={(event) =>
                    setState((current) => ({
                      ...current,
                      search: event.target.value,
                    }))
                  }
                />
                {categories.length > 1 ? (
                  <select
                    className={styles.categorySelect}
                    aria-label="Filter by category"
                    value={state.categoryFilter}
                    onChange={(event) =>
                      setState((current) => ({
                        ...current,
                        categoryFilter: event.target.value,
                      }))
                    }
                  >
                    <option value="all">All categories</option>
                    {categories.map((category) => (
                      <option key={category.slug} value={category.slug}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                ) : null}
              </div>

              <div
                className={styles.productList}
                role="listbox"
                aria-label="Available products"
              >
                {filtered.map((child) => {
                  const selected = state.selectedIds.includes(child.id);
                  const check = canSelectProduct(
                    child,
                    state.selectedIds,
                    config.slots,
                    state.replacingIndex,
                  );
                  const disabled =
                    !check.ok && !(selected && state.replacingIndex === null);
                  const label = !isInStock(child)
                    ? "Out of stock"
                    : selected
                      ? "selected"
                      : "available";

                  return (
                    <button
                      key={child.id}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      aria-label={`${child.name} — ${label}`}
                      className={`${styles.productRow} ${
                        selected ? styles.productRowSelected : ""
                      }`}
                      disabled={disabled && !selected}
                      onClick={() => selectProduct(child.id)}
                    >
                      <span className={styles.thumb}>
                        {child.images[0] ? (
                          <Image
                            src={child.images[0]}
                            alt=""
                            fill
                            sizes="56px"
                            className={styles.thumbImage}
                            loading="lazy"
                          />
                        ) : null}
                      </span>
                      <span className={styles.productMeta}>
                        <span className={styles.productName}>{child.name}</span>
                        <span className={styles.productDesc}>
                          {child.shortDescription}
                        </span>
                      </span>
                      <span
                        className={`${styles.stateMark} ${
                          selected ? styles.stateSelected : ""
                        }`}
                      >
                        {!isInStock(child)
                          ? "Out of stock"
                          : selected
                            ? "✓ Selected"
                            : "○ Add"}
                      </span>
                    </button>
                  );
                })}
              </div>

              {contentsError ? (
                <p className={styles.error} role="alert">
                  {contentsError}
                </p>
              ) : (
                <p className={styles.helper}>
                  Slot-based selection — choose exactly {config.slots} products.
                </p>
              )}

              <div className={styles.actions}>
                <button
                  type="button"
                  className="btn btn--dark"
                  onClick={() => setStep("branding")}
                  disabled={state.selectedIds.length !== config.slots}
                >
                  Continue to branding
                </button>
                <button
                  type="button"
                  className="btn btn--ghost-dark"
                  onClick={reset}
                >
                  Reset
                </button>
              </div>
            </div>
          ) : null}

          {showBrandingControls ? (
            <div className={styles.section}>
              <p className={styles.sectionTitle}>Hamper branding</p>
              <AdvancedCustomizationControls
                config={brandingConfig}
                state={{
                  ...state.branding,
                  enabled: state.brandingEnabled,
                }}
                error={brandingValidation}
                onChange={updateBranding}
                onLayerChange={updateBrandingLayer}
                onZoneChange={changeBrandingZone}
                onSelectObject={selectBrandingObject}
                onAddObject={addBrandingObject}
                onRemoveObject={removeBrandingObject}
                onReset={resetBrandingOnly}
                onNudge={nudgeBranding}
              />

              <div className={styles.actions}>
                {state.step === "branding" ? (
                  <button
                    type="button"
                    className="btn btn--dark"
                    onClick={() => setStep("preview")}
                  >
                    Review preview
                  </button>
                ) : null}
                <button
                  type="button"
                  className="btn btn--dark"
                  onClick={() => onAddToCart(state)}
                  disabled={added}
                >
                  {added ? "Added to cart ✓" : "Add customized hamper"}
                </button>
                <button
                  type="button"
                  className="btn btn--ghost-dark"
                  onClick={() => setStep("contents")}
                >
                  Edit contents
                </button>
              </div>

              {cartError ? (
                <p className={styles.error} role="alert">
                  {cartError}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function getHamperCustomizationForCart(state: HamperBuilderState) {
  return toHamperCartCustomization(state);
}
