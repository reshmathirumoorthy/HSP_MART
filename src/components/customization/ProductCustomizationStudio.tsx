"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { Product } from "@/types/product";
import type {
  AdvancedCustomizationState,
  ProductCustomizationConfig,
} from "@/types/customization";
import { AdvancedCustomizationPreview } from "@/components/customization/AdvancedCustomizationPreview";
import { AdvancedCustomizationControls } from "@/components/customization/AdvancedCustomizationControls";
import { CustomizationReview } from "@/components/customization/CustomizationReview";
import { CustomizationSurfaceSelector } from "@/components/customization/CustomizationSurfaceSelector";
import {
  resolveCustomizationZones,
  validateAdvancedState,
} from "@/components/customization/customization.utils";
import styles from "./customization.module.css";

type Props = {
  product: Product;
  config: ProductCustomizationConfig;
  state: AdvancedCustomizationState;
  error: string | null;
  quantity?: number;
  added?: boolean;
  onChange: (next: Partial<AdvancedCustomizationState>) => void;
  onLayerChange: (
    next: Partial<AdvancedCustomizationState["layer"]>,
    objectId?: string,
  ) => void;
  onZoneChange: (zoneId: string) => void;
  onSelectObject: (objectId: string) => void;
  onAddObject: (mediaType: AdvancedCustomizationState["mediaType"]) => void;
  onRemoveObject: (objectId: string) => void;
  onClearSurface?: (surfaceId: string) => void;
  onReset: () => void;
  onResetElement?: () => void;
  onNudge: (dx: number, dy: number) => void;
  onLayerMove: (x: number, y: number, objectId?: string) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onConfirmAddToCart?: () => void;
  onDismissAdded?: () => void;
  header?: ReactNode;
  actions?: ReactNode;
};

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return target.isContentEditable;
}

/**
 * Universal product customization studio shell.
 * Edit → Review → Add to cart.
 */
export function ProductCustomizationStudio({
  product,
  config,
  state,
  error,
  quantity = 1,
  added = false,
  onChange,
  onLayerChange,
  onZoneChange,
  onSelectObject,
  onAddObject,
  onRemoveObject,
  onClearSurface,
  onReset,
  onResetElement,
  onNudge,
  onLayerMove,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  onConfirmAddToCart,
  onDismissAdded,
  header,
  actions,
}: Props) {
  const [phase, setPhase] = useState<"edit" | "review">("edit");
  const [reviewGateError, setReviewGateError] = useState<string | null>(null);
  const activePhase = state.enabled ? phase : "edit";
  const surfaces = resolveCustomizationZones(config);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!state.enabled || activePhase !== "edit") return;
      if (isEditableTarget(event.target)) return;

      const meta = event.metaKey || event.ctrlKey;
      if (meta && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) onRedo?.();
        else onUndo?.();
        return;
      }
      if (meta && event.key.toLowerCase() === "y") {
        event.preventDefault();
        onRedo?.();
        return;
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        if (state.activeObjectId) {
          event.preventDefault();
          onRemoveObject(state.activeObjectId);
        }
        return;
      }

      const step = event.shiftKey ? 8 : 2;
      if (event.key === "ArrowUp") {
        event.preventDefault();
        onNudge(0, -step);
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        onNudge(0, step);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        onNudge(-step, 0);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        onNudge(step, 0);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    activePhase,
    onNudge,
    onRedo,
    onRemoveObject,
    onUndo,
    state.activeObjectId,
    state.enabled,
  ]);

  const openReview = () => {
    if (!state.enabled) {
      onChange({ enabled: true });
    }
    const gate = validateAdvancedState(
      { ...state, enabled: true },
      config,
      true,
    );
    if (gate) {
      setReviewGateError(gate);
      return;
    }
    setReviewGateError(null);
    setPhase("review");
    document.getElementById("customize")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const resolvedHeader = header ?? (
    <header className={styles.header}>
      <p className={styles.eyebrow}>Customization Studio</p>
      <h2 id="customization-heading" className={styles.title}>
        {product.name}
      </h2>
    </header>
  );

  if (activePhase === "review") {
    return (
      <section
        className={`${styles.panel} ${styles.studio}`}
        aria-labelledby="customization-heading"
        id="customize"
      >
        {resolvedHeader}
        <CustomizationReview
          product={product}
          config={config}
          state={state}
          quantity={quantity}
          added={added}
          onZoneChange={onZoneChange}
          onEdit={() => setPhase("edit")}
          onAddToCart={() => onConfirmAddToCart?.()}
          onDismissSuccess={() => {
            onDismissAdded?.();
            setPhase("edit");
          }}
        />
      </section>
    );
  }

  return (
    <section
      className={`${styles.panel} ${styles.studio}`}
      aria-labelledby="customization-heading"
      id="customize"
    >
      {resolvedHeader}

      <div className={styles.studioBar}>
        <div
          className={styles.historyBar}
          role="toolbar"
          aria-label="Edit history"
        >
          <button
            type="button"
            className={styles.historyBtn}
            aria-label="Undo"
            disabled={!canUndo}
            onClick={onUndo}
          >
            Undo
          </button>
          <button
            type="button"
            className={styles.historyBtn}
            aria-label="Redo"
            disabled={!canRedo}
            onClick={onRedo}
          >
            Redo
          </button>
          <button
            type="button"
            className={styles.historyBtn}
            aria-label="Reset customization"
            disabled={!state.enabled}
            onClick={onReset}
          >
            Reset
          </button>
        </div>

        {state.enabled && surfaces.length > 0 ? (
          <CustomizationSurfaceSelector
            surfaces={surfaces}
            activeSurfaceId={state.activeZoneId}
            zoneLayers={state.zoneLayers}
            onSelect={onZoneChange}
            labelId="studio-surface-label"
            compact
          />
        ) : null}
      </div>

      <div className={styles.editorLayout}>
        <div className={styles.editorPreview}>
          <AdvancedCustomizationPreview
            product={product}
            config={config}
            state={state}
            onLayerMove={onLayerMove}
            onSelectObject={onSelectObject}
            onZoneChange={onZoneChange}
            onLayerChange={onLayerChange}
            onRemoveObject={onRemoveObject}
            hideSurfaceSelector
          />
        </div>

        <aside className={styles.editorControls} aria-label="Customization controls">
          <div className={styles.editorControlsInner}>
            <AdvancedCustomizationControls
              config={config}
              state={state}
              error={error}
              onChange={onChange}
              onLayerChange={onLayerChange}
              onZoneChange={onZoneChange}
              onSelectObject={onSelectObject}
              onAddObject={onAddObject}
              onRemoveObject={onRemoveObject}
              onClearSurface={onClearSurface}
              onReset={onReset}
              onResetElement={onResetElement}
              onNudge={onNudge}
              surfacePicker="compact"
              showReset={false}
            />
            {reviewGateError ? (
              <p className={styles.error} role="alert">
                {reviewGateError}
              </p>
            ) : null}
            <div className={styles.editorActions}>
              <button
                type="button"
                className="btn btn--ghost-dark"
                onClick={openReview}
                disabled={!state.enabled}
              >
                Review customization
              </button>
              {actions}
            </div>
          </div>
        </aside>
      </div>

      <div className={styles.mobileEditorBar} role="group" aria-label="Customization actions">
        <button
          type="button"
          className="btn btn--ghost-dark"
          onClick={openReview}
          disabled={!state.enabled}
        >
          Review
        </button>
        <div className={styles.mobileEditorBarAction}>
          {actions ?? (
            <button
              type="button"
              className="btn btn--dark"
              onClick={openReview}
              disabled={!state.enabled}
            >
              Review customization
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
