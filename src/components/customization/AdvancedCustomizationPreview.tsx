"use client";

import {
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Product } from "@/types/product";
import type {
  AdvancedCustomizationState,
  CustomizationLayer,
  ProductCustomizationConfig,
} from "@/types/customization";
import {
  COLOR_VALUES,
  VERTICAL_TEXT_CHAR_GAP_PX,
  clampLayerPosition,
  clampRotation,
  getSurfacePlacementBounds,
  getZoneById,
  isVerticalTextOrientation,
  layerHasContent,
  resolveCustomizationZones,
  resolveTextOrientation,
} from "@/components/customization/customization.utils";
import {
  findViewIndexForSurface,
  resolveProductViewerState,
} from "@/lib/customization/viewer";
import { Product360Viewer } from "@/components/customization/Product360Viewer";
import {
  CustomizationObjectChrome,
  MobileObjectToolbar,
} from "@/components/customization/CustomizationObjectChrome";
import { CustomizationSurfaceSelector } from "@/components/customization/CustomizationSurfaceSelector";
import { CustomizationViewSelector } from "@/components/customization/CustomizationViewSelector";
import styles from "./customization.module.css";

type Props = {
  product: Product;
  config: ProductCustomizationConfig;
  state: AdvancedCustomizationState;
  onLayerMove: (x: number, y: number, objectId?: string) => void;
  onSelectObject?: (objectId: string) => void;
  onZoneChange?: (zoneId: string) => void;
  onLayerChange?: (
    next: Partial<AdvancedCustomizationState["layer"]>,
    objectId?: string,
  ) => void;
  onRemoveObject?: (objectId: string) => void;
  /** Final-review mode: show placement without drag chrome. */
  reviewMode?: boolean;
  /** Hide the built-in surface tabs when they live in the studio toolbar. */
  hideSurfaceSelector?: boolean;
  /** When set, only these surfaces appear in the surface selector. */
  surfaceIdsFilter?: string[];
};

function fontClass(
  font: NonNullable<AdvancedCustomizationState["layer"]["font"]>,
): string {
  switch (font) {
    case "modern":
      return styles.fontModern;
    case "bold":
      return styles.fontBold;
    case "handwritten":
      return styles.fontHandwritten;
    case "classic":
    default:
      return styles.fontClassic;
  }
}

function LayerVisual({ layer }: { layer: CustomizationLayer }) {
  const text = layer.text?.trim() ?? "";
  const textOrientation = resolveTextOrientation(layer.textOrientation);
  const isVerticalText = isVerticalTextOrientation(textOrientation);
  const isReverseHorizontal = textOrientation === "horizontal-reverse";
  const fontSize = `clamp(0.75rem, ${2.1 * layer.scale}vw, ${1.55 * layer.scale}rem)`;

  if (layer.type === "text" && text) {
    return (
      <p
        className={`${styles.overlayText} ${styles.overlayTextInline} ${
          isVerticalText ? styles.overlayTextVertical : ""
        } ${isReverseHorizontal ? styles.overlayTextReverse : ""} ${fontClass(layer.font ?? "classic")}`}
        style={{
          color: COLOR_VALUES[layer.color ?? "black"],
          fontSize,
          opacity: layer.opacity ?? 1,
          ...(isVerticalText
            ? {
                ["--vertical-char-gap" as string]: `${VERTICAL_TEXT_CHAR_GAP_PX}px`,
              }
            : {}),
        }}
      >
        {text}
      </p>
    );
  }

  if ((layer.type === "logo" || layer.type === "image") && layer.mediaDataUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={layer.mediaDataUrl}
        alt=""
        className={`${styles.layerMedia} ${styles.layerMediaInline}`}
        style={{
          width: `${Math.max(56, 110 * layer.scale)}px`,
          maxWidth: "46vw",
          opacity: layer.opacity ?? 1,
        }}
        draggable={false}
      />
    );
  }

  return null;
}

export function AdvancedCustomizationPreview({
  product,
  config,
  state,
  onLayerMove,
  onSelectObject,
  onZoneChange,
  onLayerChange,
  onRemoveObject,
  reviewMode = false,
  hideSurfaceSelector = false,
  surfaceIdsFilter,
}: Props) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const [failedPhoto, setFailedPhoto] = useState<string | null>(null);
  const [frameIndex, setFrameIndex] = useState(0);
  const [verticalLevel, setVerticalLevel] = useState<-1 | 0 | 1>(0);
  const [viewSyncKey, setViewSyncKey] = useState("");
  const surfaceBounds = getSurfacePlacementBounds(config, state.activeZoneId);
  const surfaces = resolveCustomizationZones(config).filter((surface) =>
    surfaceIdsFilter?.length
      ? surfaceIdsFilter.includes(surface.id)
      : true,
  );

  const viewer = useMemo(
    () => resolveProductViewerState(product, config, state.variantId),
    [config, product, state.variantId],
  );

  const activeZone = getZoneById(config, state.activeZoneId);

  const preferredFrame = activeZone
    ? findViewIndexForSurface(viewer.views, activeZone)
    : viewer.primaryIndex;
  const nextViewSyncKey = `${state.activeZoneId}|${state.variantId}|${viewer.frames.join(",")}`;
  if (nextViewSyncKey !== viewSyncKey) {
    setViewSyncKey(nextViewSyncKey);
    setFrameIndex(preferredFrame);
    setVerticalLevel(0);
  }

  const getPointerPercent = useCallback(
    (clientX: number, clientY: number) => {
      const canvasEl = canvasRef.current;
      if (!canvasEl) return null;
      const rect = canvasEl.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;
      return {
        x: ((clientX - rect.left) / rect.width) * 100,
        y: ((clientY - rect.top) / rect.height) * 100,
      };
    },
    [],
  );

  const moveObject = useCallback(
    (objectId: string, x: number, y: number, scale: number) => {
      const next = clampLayerPosition(x, y, scale, surfaceBounds);
      onLayerMove(next.x, next.y, objectId);
    },
    [onLayerMove, surfaceBounds],
  );

  const activeVariant = config.variants?.find(
    (item) => item.id === state.variantId,
  );
  const objectPosition =
    activeVariant?.objectPosition ??
    config.preview.objectPosition ??
    "center";

  const photo = viewer.frames[frameIndex] ?? viewer.frames[0];
  const imageFailed = Boolean(photo && failedPhoto === photo);
  const usePhoto = Boolean(photo) && !imageFailed;
  const showCustomization = state.enabled && !showOriginal;
  const surfaceState = state.zoneLayers[state.activeZoneId];
  const surfaceObjects = surfaceState?.objects?.length
    ? surfaceState.objects
    : [state.layer];

  const variantLabel = activeVariant?.label ?? "Product";
  const zoneLabel = activeZone?.label ?? "Surface";

  // Only draw the active surface's elements on the photograph that matches it.
  const canPositionOverlay =
    viewer.mode === "single" ||
    viewer.frames.length <= 1 ||
    frameIndex === preferredFrame;

  const frameStyle =
    config.preview.type === "box" ||
    config.preview.type === "folder" ||
    config.preview.type === "flat"
      ? "landscape"
      : config.preview.type === "notebook"
        ? "notebook"
        : "portrait";

  const activeLayer =
    surfaceObjects.find((obj) => obj.id === state.activeObjectId) ??
    state.layer;

  return (
    <div className={styles.previewColumn}>
      {!hideSurfaceSelector &&
      state.enabled &&
      onZoneChange &&
      surfaces.length > 0 ? (
        <div className={styles.surfaceBar}>
          <CustomizationSurfaceSelector
            surfaces={surfaces}
            activeSurfaceId={state.activeZoneId}
            zoneLayers={state.zoneLayers}
            onSelect={onZoneChange}
            labelId="preview-surface-label"
          />
        </div>
      ) : null}

      {state.enabled && viewer.mode === "multi" ? (
        <CustomizationViewSelector
          views={viewer.views}
          activeIndex={frameIndex}
          onSelect={setFrameIndex}
          labelId="preview-view-label"
        />
      ) : null}

      <div
        className={styles.previewWrap}
        aria-live="polite"
        aria-label={`Customization preview: ${product.name}, ${variantLabel}, ${zoneLabel}.`}
      >
        <div
          className={`${styles.previewStage} ${styles[config.preview.type]} ${usePhoto ? styles.photoStage : ""}`}
        >
          <Product360Viewer
            frames={usePhoto ? viewer.frames : []}
            frameIndex={frameIndex}
            onFrameChange={setFrameIndex}
            mode={viewer.mode}
            viewLabels={viewer.views.map((view) => view.label)}
            statusLabel={viewer.statusLabel}
            primaryIndex={viewer.primaryIndex}
            verticalUpFrames={config.verticalFrames?.up}
            verticalDownFrames={config.verticalFrames?.down}
            verticalLevel={verticalLevel}
            onVerticalLevelChange={setVerticalLevel}
            objectPosition={objectPosition}
            alt={`${product.name} product view`}
            orbitEnabled={viewer.orbitEnabled && usePhoto}
            unavailableReason={viewer.unavailableReason}
            onImageError={setFailedPhoto}
            className={styles.viewerEmbed}
            embedded
            frameStyle={frameStyle}
          >
            <div
              ref={canvasRef}
              className={`${styles.customizationCanvas} ${
                state.enabled ? styles.customizationCanvasActive : ""
              }`}
              aria-hidden={!state.enabled}
            >
              {state.enabled && activeZone?.bounds ? (
                <span
                  className={styles.surfaceGuide}
                  style={{
                    left: `${activeZone.bounds.x}%`,
                    top: `${activeZone.bounds.y}%`,
                    width: `${activeZone.bounds.width}%`,
                    height: `${activeZone.bounds.height}%`,
                  }}
                  aria-hidden
                />
              ) : null}

              {showCustomization && canPositionOverlay
                ? surfaceObjects.map((layer) => {
                    if (!layerHasContent(layer)) return null;
                    const active = layer.id === state.activeObjectId;
                    if (reviewMode) {
                      return (
                        <div
                          key={layer.id}
                          className={styles.reviewLayer}
                          style={{
                            left: `${layer.x}%`,
                            top: `${layer.y}%`,
                            transform: `translate(-50%, -50%) rotate(${clampRotation(layer.rotation ?? 0)}deg)`,
                          }}
                          aria-hidden
                        >
                          <LayerVisual layer={layer} />
                        </div>
                      );
                    }
                    return (
                      <CustomizationObjectChrome
                        key={layer.id}
                        layer={layer}
                        active={active}
                        canvasRef={canvasRef}
                        getPointerPercent={getPointerPercent}
                        onSelect={() => onSelectObject?.(layer.id)}
                        onMove={(x, y) =>
                          moveObject(layer.id, x, y, layer.scale)
                        }
                        onScale={(scale) =>
                          onLayerChange?.({ scale }, layer.id)
                        }
                        onRotate={(rotation) =>
                          onLayerChange?.(
                            { rotation: clampRotation(rotation) },
                            layer.id,
                          )
                        }
                        onDelete={() => onRemoveObject?.(layer.id)}
                      >
                        <LayerVisual layer={layer} />
                      </CustomizationObjectChrome>
                    );
                  })
                : null}

              {showCustomization && !canPositionOverlay ? (
                <p className={styles.zoneOrbitNote} role="status">
                  Active surface: {zoneLabel}. Switch to its matching product
                  view to place accurately — customization stays attached to
                  this surface.
                </p>
              ) : null}
            </div>
          </Product360Viewer>
        </div>
      </div>

      {!reviewMode &&
      state.enabled &&
      showCustomization &&
      layerHasContent(activeLayer) ? (
        <MobileObjectToolbar
          layer={activeLayer}
          onScale={(scale) => onLayerChange?.({ scale }, activeLayer.id)}
          onRotate={(rotation) =>
            onLayerChange?.(
              { rotation: clampRotation(rotation) },
              activeLayer.id,
            )
          }
          onDelete={() => onRemoveObject?.(activeLayer.id)}
        />
      ) : null}

      {state.enabled && !reviewMode ? (
        <div className={styles.previewToggle} role="group" aria-label="Preview mode">
          <button
            type="button"
            className={`${styles.toggleChip} ${!showOriginal ? styles.toggleChipActive : ""}`}
            aria-pressed={!showOriginal}
            onClick={() => setShowOriginal(false)}
          >
            Preview
          </button>
          <button
            type="button"
            className={`${styles.toggleChip} ${showOriginal ? styles.toggleChipActive : ""}`}
            aria-pressed={showOriginal}
            onClick={() => setShowOriginal(true)}
          >
            Original
          </button>
        </div>
      ) : null}
    </div>
  );
}
