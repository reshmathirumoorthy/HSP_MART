"use client";

import { useState } from "react";
import Image from "next/image";
import type { Product } from "@/types/product";
import type { CustomizationState } from "@/types/customization";
import {
  COLOR_VALUES,
  VERTICAL_TEXT_CHAR_GAP_PX,
  resolveOverlayTransform,
  resolveTextOrientation,
} from "@/components/customization/customization.utils";
import styles from "./customization.module.css";

type Props = {
  product: Product;
  state: CustomizationState;
};

function fontClass(font: CustomizationState["font"]): string {
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

function ProductShape({
  type,
}: {
  type: NonNullable<Product["customization"]>["preview"]["type"];
}) {
  switch (type) {
    case "bottle":
      return (
        <>
          <span className={styles.bottleCap} aria-hidden />
          <span className={styles.bottleBody} aria-hidden />
          <span className={styles.bottleBand} aria-hidden />
        </>
      );
    case "notebook":
      return (
        <>
          <span className={styles.notebookCover} aria-hidden />
          <span className={styles.notebookSpine} aria-hidden />
        </>
      );
    case "pen":
      return (
        <>
          <span className={styles.penTip} aria-hidden />
          <span className={styles.penBody} aria-hidden />
          <span className={styles.penClip} aria-hidden />
        </>
      );
    case "box":
      return (
        <>
          <span className={styles.boxFace} aria-hidden />
          <span className={styles.boxLid} aria-hidden />
          <span className={styles.boxRibbon} aria-hidden />
        </>
      );
    case "folder":
      return (
        <>
          <span className={styles.folderBody} aria-hidden />
          <span className={styles.folderTab} aria-hidden />
        </>
      );
    case "flat":
    default:
      return <span className={styles.flatBody} aria-hidden />;
  }
}

export function CustomizationPreview({ product, state }: Props) {
  const config = product.customization;
  const [showOriginal, setShowOriginal] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  if (!config) return null;

  const type = config.preview.type;
  const photo = product.images[0];
  const usePhoto = Boolean(photo) && !imageFailed;
  const text = state.enabled && !showOriginal ? state.text.trim() : "";
  const showText = Boolean(text);
  const overlay = resolveOverlayTransform(config, state.placement);
  const fontSize = `clamp(0.7rem, ${2.1 * overlay.scale}vw, ${1.2 * overlay.scale}rem)`;
  const textOrientation = resolveTextOrientation(state.textOrientation);
  const isVerticalText =
    textOrientation === "vertical" || textOrientation === "vertical-reverse";
  const isReverseHorizontal = textOrientation === "horizontal-reverse";
  const orientationExtra = textOrientation === "vertical-reverse" ? 180 : 0;

  return (
    <div className={styles.previewColumn}>
      <div
        className={styles.previewWrap}
        aria-live="polite"
        aria-label={
          showText
            ? `Preview of ${product.name} customized with text ${text}`
            : `Preview of ${product.name} before customization`
        }
      >
        <div className={`${styles.previewStage} ${styles[type]} ${usePhoto ? styles.photoStage : ""}`}>
          {usePhoto ? (
            <Image
              src={photo}
              alt=""
              fill
              sizes="(max-width: 900px) 90vw, 420px"
              className={styles.previewPhoto}
              style={{
                objectPosition: config.preview.objectPosition ?? "center",
              }}
              onError={() => setImageFailed(true)}
              priority
            />
          ) : (
            <div className={styles.productBase}>
              <ProductShape type={type} />
            </div>
          )}

          {showText ? (
            <p
              className={`${styles.overlayText} ${styles.overlayCalibrated} ${
                isVerticalText ? styles.overlayTextVertical : ""
              } ${isReverseHorizontal ? styles.overlayTextReverse : ""} ${fontClass(state.font)}`}
              style={{
                color: COLOR_VALUES[state.color],
                left: `${overlay.x}%`,
                top: `${overlay.y}%`,
                maxWidth: isVerticalText
                  ? undefined
                  : `${overlay.maxWidthPct ?? 40}%`,
                fontSize,
                transform: `translate(-50%, -50%) rotate(${
                  (isVerticalText ? 0 : overlay.rotation) + orientationExtra
                }deg)`,
                ...(isVerticalText
                  ? {
                      ["--vertical-char-gap" as string]: `${VERTICAL_TEXT_CHAR_GAP_PX}px`,
                    }
                  : {}),
              }}
            >
              {text}
            </p>
          ) : (
            <p className={styles.placeholderHint}>
              {state.enabled
                ? "Your text appears here"
                : "Turn on customize to preview"}
            </p>
          )}
        </div>
      </div>

      {state.enabled ? (
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
