"use client";

import { useCallback, useRef, type PointerEvent as ReactPointerEvent } from "react";
import Image from "next/image";
import type { Product } from "@/types/product";
import type { AdvancedCustomizationState } from "@/types/customization";
import type { HamperConfig } from "@/types/hamper";
import { getProductById } from "@/lib/products";
import { resolvePreviewLayer } from "@/lib/hamper";
import {
  COLOR_VALUES,
  VERTICAL_TEXT_CHAR_GAP_PX,
  clampLayerPosition,
  clampRotation,
  resolveTextOrientation,
} from "@/components/customization/customization.utils";
import styles from "./hamper.module.css";

type Props = {
  product: Product;
  config: HamperConfig;
  selectedIds: string[];
  brandingEnabled: boolean;
  branding: AdvancedCustomizationState;
  showBrandingArea: boolean;
  onBrandingMove: (x: number, y: number) => void;
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

export function HamperPreview({
  product,
  config,
  selectedIds,
  brandingEnabled,
  branding,
  showBrandingArea,
  onBrandingMove,
}: Props) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const scale = branding.layer.scale;

  const updateFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const canvasEl = canvasRef.current;
      if (!canvasEl) return;
      const rect = canvasEl.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const drag = dragRef.current;
      const localX =
        ((clientX - rect.left) / rect.width) * 100 - (drag?.offsetX ?? 0);
      const localY =
        ((clientY - rect.top) / rect.height) * 100 - (drag?.offsetY ?? 0);
      const next = clampLayerPosition(localX, localY, scale);
      onBrandingMove(next.x, next.y);
    },
    [onBrandingMove, scale],
  );

  const onPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (!brandingEnabled || !showBrandingArea) return;
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;
    const rect = canvasEl.getBoundingClientRect();
    const pointerX = ((event.clientX - rect.left) / rect.width) * 100;
    const pointerY = ((event.clientY - rect.top) / rect.height) * 100;
    dragRef.current = {
      pointerId: event.pointerId,
      offsetX: pointerX - branding.layer.x,
      offsetY: pointerY - branding.layer.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) {
      return;
    }
    updateFromPointer(event.clientX, event.clientY);
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        // ignore
      }
    }
  };

  const layer = branding.layer;
  const text = layer.text?.trim() ?? "";
  const showText =
    brandingEnabled &&
    showBrandingArea &&
    branding.mediaType === "text" &&
    Boolean(text);
  const showMedia =
    brandingEnabled &&
    showBrandingArea &&
    (branding.mediaType === "logo" || branding.mediaType === "image") &&
    Boolean(layer.mediaDataUrl);
  const fontSize = `clamp(0.55rem, ${1.5 * layer.scale}vw, ${1.1 * layer.scale}rem)`;
  const textOrientation = resolveTextOrientation(layer.textOrientation);
  const isVerticalText =
    textOrientation === "vertical" || textOrientation === "vertical-reverse";
  const isReverseHorizontal = textOrientation === "horizontal-reverse";
  const rotation = clampRotation(layer.rotation ?? 0);
  const orientationExtra = textOrientation === "vertical-reverse" ? 180 : 0;
  const layerTransform = `translate(-50%, -50%) rotate(${rotation + orientationExtra}deg)`;
  const frameClass =
    config.previewFrame === "box" ? styles.frameBox : styles.frameBasket;

  const selectedProducts = selectedIds
    .map((id) => getProductById(id))
    .filter((item): item is Product => Boolean(item));

  return (
    <div className={styles.previewColumn}>
      <div
        className={styles.previewWrap}
        aria-live="polite"
        aria-label={`Preview of ${product.name} with ${selectedProducts.length} selected items`}
      >
        <div className={styles.previewStage}>
          <div className={`${styles.frame} ${frameClass}`} aria-hidden>
            {config.previewFrame === "box" ? (
              <span className={styles.frameLid} />
            ) : null}
          </div>

          {selectedProducts.length === 0 ? (
            <p className={styles.emptyPreview}>
              Select products to compose your hamper
            </p>
          ) : (
            selectedProducts.map((child, index) => {
              const placement = resolvePreviewLayer(config, child, index);
              const src = child.images[0];
              return (
                <div
                  key={`${child.id}-${index}`}
                  className={styles.layer}
                  style={{
                    left: `${placement.x}%`,
                    top: `${placement.y}%`,
                    width: `${28 * placement.scale}%`,
                    zIndex: placement.zIndex,
                    transform: `translate(-50%, -50%) rotate(${placement.rotation}deg)`,
                  }}
                >
                  {src ? (
                    <Image
                      src={src}
                      alt=""
                      fill
                      sizes="120px"
                      className={styles.layerImage}
                      loading={index < 3 ? "eager" : "lazy"}
                    />
                  ) : null}
                </div>
              );
            })
          )}

          <div
            ref={canvasRef}
            className={styles.brandingCanvas}
            aria-hidden={!brandingEnabled}
          >
            {showText ? (
              <p
                className={`${styles.layerElement} ${styles.overlayText} ${
                  isVerticalText ? styles.overlayTextVertical : ""
                } ${isReverseHorizontal ? styles.overlayTextReverse : ""} ${fontClass(layer.font ?? "classic")}`}
                style={{
                  color: COLOR_VALUES[layer.color ?? "green"],
                  left: `${layer.x}%`,
                  top: `${layer.y}%`,
                  fontSize,
                  transform: layerTransform,
                  ...(isVerticalText
                    ? {
                        ["--vertical-char-gap" as string]: `${VERTICAL_TEXT_CHAR_GAP_PX}px`,
                      }
                    : {}),
                }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                role="button"
                tabIndex={0}
                aria-label={`Branding text ${text}, ${textOrientation}. Drag to reposition.`}
              >
                {text}
              </p>
            ) : null}

            {showMedia && layer.mediaDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={layer.mediaDataUrl}
                alt=""
                className={`${styles.layerElement} ${styles.layerMedia}`}
                style={{
                  left: `${layer.x}%`,
                  top: `${layer.y}%`,
                  width: `${30 * layer.scale}%`,
                  transform: layerTransform,
                }}
                draggable={false}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                role="button"
                tabIndex={0}
                aria-label={`Uploaded ${branding.mediaType}. Drag to reposition.`}
              />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
