"use client";

import {
  useRef,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import type { CustomizationLayer } from "@/types/customization";
import { clampRotation, clampScale } from "@/components/customization/customization.utils";
import styles from "./customization.module.css";

type Props = {
  layer: CustomizationLayer;
  active: boolean;
  children: ReactNode;
  onSelect: () => void;
  onMove: (x: number, y: number) => void;
  onScale: (scale: number) => void;
  onRotate: (rotation: number) => void;
  onDelete: () => void;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  /** Percentage bounds clamp is applied by parent move handler. */
  getPointerPercent: (clientX: number, clientY: number) => { x: number; y: number } | null;
};

type DragMode = "move" | "scale" | "rotate";

export function CustomizationObjectChrome({
  layer,
  active,
  children,
  onSelect,
  onMove,
  onScale,
  onRotate,
  onDelete,
  getPointerPercent,
}: Props) {
  const dragRef = useRef<{
    mode: DragMode;
    pointerId: number;
    startX: number;
    startY: number;
    originScale: number;
    originRotation: number;
    originLayerX: number;
    originLayerY: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  const rotation = clampRotation(layer.rotation ?? 0);

  const startDrag = (
    event: ReactPointerEvent<HTMLElement>,
    mode: DragMode,
  ) => {
    onSelect();
    const point = getPointerPercent(event.clientX, event.clientY);
    dragRef.current = {
      mode,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originScale: layer.scale,
      originRotation: rotation,
      originLayerX: layer.x,
      originLayerY: layer.y,
      offsetX: point ? point.x - layer.x : 0,
      offsetY: point ? point.y - layer.y : 0,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
    event.stopPropagation();
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.stopPropagation();

    if (drag.mode === "move") {
      const point = getPointerPercent(event.clientX, event.clientY);
      if (!point) return;
      onMove(point.x - drag.offsetX, point.y - drag.offsetY);
      return;
    }

    if (drag.mode === "scale") {
      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;
      const delta = (dx + dy) / 140;
      onScale(clampScale(drag.originScale + delta));
      return;
    }

    if (drag.mode === "rotate") {
      const point = getPointerPercent(event.clientX, event.clientY);
      if (!point) return;
      const angle =
        (Math.atan2(point.y - layer.y, point.x - layer.x) * 180) / Math.PI;
      onRotate(clampRotation(angle + 90));
    }
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

  const toolbar = (
    <>
      <button
        type="button"
        className={styles.floatingBtn}
        aria-label="Decrease customization size"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => onScale(clampScale(layer.scale - 0.1))}
      >
        −
      </button>
      <span className={styles.floatingValue} aria-live="polite">
        {Math.round(layer.scale * 100)}%
      </span>
      <button
        type="button"
        className={styles.floatingBtn}
        aria-label="Increase customization size"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => onScale(clampScale(layer.scale + 0.1))}
      >
        +
      </button>
      <button
        type="button"
        className={styles.floatingBtn}
        aria-label="Rotate customization left"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => onRotate(rotation - 15)}
      >
        ↶
      </button>
      <button
        type="button"
        className={styles.floatingBtn}
        aria-label="Rotate customization right"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => onRotate(rotation + 15)}
      >
        ↷
      </button>
      <button
        type="button"
        className={styles.floatingBtn}
        aria-label="Delete customization"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={onDelete}
      >
        ⌫
      </button>
    </>
  );

  return (
    <div
      data-customization-object={layer.id}
      className={`${styles.objectShell} ${active ? styles.objectShellActive : ""}`}
      style={{
        left: `${layer.x}%`,
        top: `${layer.y}%`,
        transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
      }}
      onPointerDown={(event) => startDrag(event, "move")}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div className={styles.objectContent}>{children}</div>

      {active ? (
        <>
          <span className={styles.objectSelection} aria-hidden />
          <span className={styles.rotateStem} aria-hidden />
          <button
            type="button"
            className={styles.rotateHandle}
            aria-label="Rotate customization freely"
            onPointerDown={(event) => startDrag(event, "rotate")}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            ↻
          </button>
          <span
            className={`${styles.handle} ${styles.handleNw}`}
            aria-hidden
            onPointerDown={(event) => startDrag(event, "scale")}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          />
          <span
            className={`${styles.handle} ${styles.handleNe}`}
            aria-hidden
            onPointerDown={(event) => startDrag(event, "scale")}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          />
          <span
            className={`${styles.handle} ${styles.handleSw}`}
            aria-hidden
            onPointerDown={(event) => startDrag(event, "scale")}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          />
          <span
            className={`${styles.handle} ${styles.handleSe}`}
            aria-label="Resize customization"
            role="slider"
            aria-valuemin={40}
            aria-valuemax={220}
            aria-valuenow={Math.round(layer.scale * 100)}
            tabIndex={0}
            onPointerDown={(event) => startDrag(event, "scale")}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          />
          <div className={styles.floatingToolbar} role="toolbar" aria-label="Quick customization controls">
            {toolbar}
          </div>
        </>
      ) : null}
    </div>
  );
}

export function MobileObjectToolbar({
  layer,
  onScale,
  onRotate,
  onDelete,
}: {
  layer: CustomizationLayer;
  onScale: (scale: number) => void;
  onRotate: (rotation: number) => void;
  onDelete: () => void;
}) {
  const rotation = clampRotation(layer.rotation ?? 0);
  return (
    <div className={styles.mobileObjectBar} role="toolbar" aria-label="Customization object controls">
      <button
        type="button"
        className={styles.floatingBtn}
        aria-label="Decrease customization size"
        onClick={() => onScale(clampScale(layer.scale - 0.1))}
      >
        −
      </button>
      <span className={styles.floatingValue}>{Math.round(layer.scale * 100)}%</span>
      <button
        type="button"
        className={styles.floatingBtn}
        aria-label="Increase customization size"
        onClick={() => onScale(clampScale(layer.scale + 0.1))}
      >
        +
      </button>
      <button
        type="button"
        className={styles.floatingBtn}
        aria-label="Rotate customization left"
        onClick={() => onRotate(rotation - 15)}
      >
        ↶
      </button>
      <button
        type="button"
        className={styles.floatingBtn}
        aria-label="Rotate customization right"
        onClick={() => onRotate(rotation + 15)}
      >
        ↷
      </button>
      <button
        type="button"
        className={styles.floatingBtn}
        aria-label="Delete customization"
        onClick={onDelete}
      >
        ⌫
      </button>
    </div>
  );
}
