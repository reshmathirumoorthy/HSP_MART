/**
 * Normalized coordinate helpers (0–100 percentages, degree rotation).
 */

import type { NormalizedPlacement, PrintableArea } from "@/types/customization";

export function clampPercent(value: number, min = 0, max = 100): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function clampScale(value: number, min = 0.25, max = 3): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(max, Math.max(min, value));
}

export function clampRotation(value: number): number {
  if (!Number.isFinite(value)) return 0;
  let next = value % 360;
  if (next > 180) next -= 360;
  if (next < -180) next += 360;
  return next;
}

export function isValidPrintableArea(area: PrintableArea | undefined): boolean {
  if (!area) return false;
  return (
    Number.isFinite(area.x) &&
    Number.isFinite(area.y) &&
    Number.isFinite(area.width) &&
    Number.isFinite(area.height) &&
    area.x >= 0 &&
    area.y >= 0 &&
    area.width > 0 &&
    area.height > 0 &&
    area.x + area.width <= 100.0001 &&
    area.y + area.height <= 100.0001
  );
}

export function normalizePlacement(partial: {
  x?: number;
  y?: number;
  scale?: number;
  rotation?: number;
  width?: number;
  height?: number;
}): NormalizedPlacement {
  return {
    x: clampPercent(partial.x ?? 50),
    y: clampPercent(partial.y ?? 50),
    scale: clampScale(partial.scale ?? 1),
    rotation: clampRotation(partial.rotation ?? 0),
    width:
      typeof partial.width === "number"
        ? clampPercent(partial.width, 1, 100)
        : undefined,
    height:
      typeof partial.height === "number"
        ? clampPercent(partial.height, 1, 100)
        : undefined,
  };
}
