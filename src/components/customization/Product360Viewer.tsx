"use client";

import {
  useCallback,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import Image from "next/image";
import {
  VIEWER_DRAG,
  clampFrameIndex,
  frameIndexFromDrag,
  type ViewerMode,
} from "@/lib/customization/viewer";
import styles from "./Product360Viewer.module.css";

type Props = {
  frames: string[];
  frameIndex: number;
  onFrameChange: (index: number) => void;
  /** Resolved viewer mode from authored photography. */
  mode?: ViewerMode;
  /** Human labels parallel to frames (Front, Back, …). */
  viewLabels?: string[];
  statusLabel?: string;
  verticalUpFrames?: string[];
  verticalDownFrames?: string[];
  verticalLevel?: -1 | 0 | 1;
  onVerticalLevelChange?: (level: -1 | 0 | 1) => void;
  objectPosition?: string;
  alt: string;
  orbitEnabled: boolean;
  unavailableReason?: string | null;
  onImageError?: (src: string) => void;
  children?: ReactNode;
  className?: string;
  embedded?: boolean;
  frameStyle?: "portrait" | "landscape" | "notebook";
  /** Index restored by Reset (primary/front). */
  primaryIndex?: number;
};

function isCoarsePointer(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(pointer: coarse)").matches;
}

export function Product360Viewer({
  frames,
  frameIndex,
  onFrameChange,
  mode: modeProp,
  viewLabels,
  statusLabel,
  verticalUpFrames,
  verticalDownFrames,
  verticalLevel = 0,
  onVerticalLevelChange,
  objectPosition = "center",
  alt,
  orbitEnabled,
  unavailableReason,
  onImageError,
  children,
  className,
  embedded = false,
  frameStyle = "portrait",
  primaryIndex = 0,
}: Props) {
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originIndex: number;
    originVertical: -1 | 0 | 1;
    moved: boolean;
  } | null>(null);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const [imageRatio, setImageRatio] = useState<number | null>(null);
  const [showDragHint, setShowDragHint] = useState(true);
  const stageRef = useRef<HTMLDivElement>(null);

  const mode: ViewerMode =
    modeProp ??
    (orbitEnabled ? "orbit" : frames.length >= 2 ? "multi" : "single");

  const navigable = frames.length >= 2;
  const dragNavigable = orbitEnabled || mode === "multi";

  const safeIndex = clampFrameIndex(frameIndex, frames.length);

  const verticalEnabled = Boolean(
    onVerticalLevelChange &&
      ((verticalUpFrames && verticalUpFrames.length > 0) ||
        (verticalDownFrames && verticalDownFrames.length > 0)),
  );

  const displaySrc = (() => {
    if (!frames.length) return null;
    if (verticalLevel === 1 && verticalUpFrames?.[safeIndex]) {
      return verticalUpFrames[safeIndex];
    }
    if (verticalLevel === -1 && verticalDownFrames?.[safeIndex]) {
      return verticalDownFrames[safeIndex];
    }
    return frames[safeIndex];
  })();

  // Failed only for the current source — switching views clears the failure state.
  const imageFailed = Boolean(displaySrc && failedSrc === displaySrc);
  const activeLabel =
    viewLabels?.[safeIndex] ||
    (mode === "orbit"
      ? `View ${safeIndex + 1} of ${frames.length}`
      : frames.length > 1
        ? `View ${safeIndex + 1} of ${frames.length}`
        : "Primary");

  const stepBy = useCallback(
    (delta: number) => {
      if (!navigable) return;
      const next = clampFrameIndex(safeIndex + delta, frames.length);
      // Multi-view does not wrap by default; orbit wraps.
      if (orbitEnabled) {
        const wrapped =
          ((safeIndex + delta) % frames.length + frames.length) % frames.length;
        onFrameChange(wrapped);
        return;
      }
      onFrameChange(next);
    },
    [frames.length, navigable, onFrameChange, orbitEnabled, safeIndex],
  );

  const resetView = useCallback(() => {
    onFrameChange(clampFrameIndex(primaryIndex, frames.length));
    onVerticalLevelChange?.(0);
  }, [frames.length, onFrameChange, onVerticalLevelChange, primaryIndex]);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragNavigable && !verticalEnabled) return;
    if ((event.target as HTMLElement).closest("[data-customization-object]")) {
      return;
    }
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originIndex: safeIndex,
      originVertical: verticalLevel,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;

    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      drag.moved = true;
    }

    if (dragNavigable && frames.length >= 2 && Math.abs(dx) >= Math.abs(dy)) {
      const pixelsPerFrame = isCoarsePointer()
        ? VIEWER_DRAG.mobilePixelsPerFrame
        : VIEWER_DRAG.desktopPixelsPerFrame;
      const next = frameIndexFromDrag({
        originIndex: drag.originIndex,
        deltaX: dx,
        frameCount: frames.length,
        pixelsPerFrame,
      });
      if (next !== safeIndex) {
        onFrameChange(next);
        setShowDragHint(false);
      }
      return;
    }

    if (!verticalEnabled || !onVerticalLevelChange) return;
    if (Math.abs(dy) < VIEWER_DRAG.desktopPixelsPerFrame) {
      if (verticalLevel !== drag.originVertical) {
        onVerticalLevelChange(drag.originVertical);
      }
      return;
    }
    if (dy < 0 && verticalUpFrames?.[safeIndex]) {
      onVerticalLevelChange(1);
    } else if (dy > 0 && verticalDownFrames?.[safeIndex]) {
      onVerticalLevelChange(-1);
    } else {
      onVerticalLevelChange(0);
    }
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        // ignore
      }
    }
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!navigable) return;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      stepBy(-1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      stepBy(1);
    } else if (event.key === "Home") {
      event.preventDefault();
      onFrameChange(0);
    } else if (event.key === "End") {
      event.preventDefault();
      onFrameChange(frames.length - 1);
    } else if (event.key === "Escape") {
      event.preventDefault();
      resetView();
    }
  };

  const photoClass =
    frameStyle === "landscape"
      ? styles.photoLandscape
      : frameStyle === "notebook"
        ? styles.photoNotebook
        : styles.photoPortrait;

  const resolvedStatus =
    statusLabel ||
    (mode === "orbit"
      ? `Orbit · ${frames.length} frames`
      : mode === "multi"
        ? `${frames.length} views`
        : "Single product view");

  return (
    <div
      className={`${styles.viewer} ${embedded ? styles.viewerEmbedded : ""} ${className ?? ""}`}
    >
      <div
        ref={stageRef}
        className={`${styles.stage} ${embedded ? styles.stageEmbedded : ""} ${
          dragNavigable ? styles.stageOrbit : ""
        } ${
          imageRatio && imageRatio >= 1.05
            ? styles.stageLandscape
            : imageRatio && imageRatio <= 0.95
              ? styles.stagePortrait
              : ""
        }`}
        style={
          imageRatio
            ? {
                aspectRatio: `${imageRatio}`,
              }
            : undefined
        }
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
        tabIndex={navigable ? 0 : -1}
        role="group"
        aria-label={`${alt}. ${activeLabel}. ${resolvedStatus}.`}
        aria-roledescription={
          mode === "orbit" ? "product orbit viewer" : "product view viewer"
        }
      >
        {displaySrc && !imageFailed ? (
          <Image
            key={displaySrc}
            src={displaySrc}
            alt=""
            fill
            sizes="(max-width: 899px) 96vw, (max-width: 1280px) 55vw, 720px"
            className={`${styles.photo} ${photoClass} ${
              imageRatio && imageRatio >= 1.05 ? styles.photoFillWide : ""
            }`}
            style={{ objectPosition }}
            onLoad={(event) => {
              const img = event.currentTarget;
              if (img.naturalWidth > 0 && img.naturalHeight > 0) {
                setImageRatio(img.naturalWidth / img.naturalHeight);
              }
            }}
            onError={() => {
              setFailedSrc(displaySrc);
              onImageError?.(displaySrc);
            }}
            priority
            draggable={false}
          />
        ) : (
          <div className={styles.fallback} aria-hidden />
        )}

        {children}

        {orbitEnabled && showDragHint ? (
          <p className={`${styles.dragHint} ${styles.dragHintMotion}`}>
            Drag to rotate
          </p>
        ) : null}
      </div>

      <div className={styles.toolbar} role="group" aria-label="Product view controls">
        <button
          type="button"
          className={styles.toolBtn}
          aria-label="Previous product view"
          disabled={!navigable || (!orbitEnabled && safeIndex <= 0)}
          onClick={() => stepBy(-1)}
        >
          ←
        </button>
        <button
          type="button"
          className={`${styles.toolBtn} ${styles.toolBtnLabel}`}
          aria-label="Reset product view"
          onClick={resetView}
        >
          Reset
        </button>
        <button
          type="button"
          className={styles.toolBtn}
          aria-label="Next product view"
          disabled={
            !navigable || (!orbitEnabled && safeIndex >= frames.length - 1)
          }
          onClick={() => stepBy(1)}
        >
          →
        </button>
        <span className={styles.indicator} aria-live="polite">
          {navigable ? (
            <>
              <span className="sr-only">Product view: </span>
              {activeLabel}
              {mode === "orbit" || (!viewLabels?.[safeIndex] && frames.length > 1)
                ? null
                : null}
            </>
          ) : (
            "Single product view"
          )}
        </span>
        <span className={styles.modeBadge}>{resolvedStatus}</span>
      </div>

      {unavailableReason && mode !== "orbit" ? (
        <p className={styles.unavailable} role="status">
          {unavailableReason}
        </p>
      ) : null}
    </div>
  );
}
