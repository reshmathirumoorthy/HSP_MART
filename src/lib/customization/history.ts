/**
 * Phase 14B — session-only undo/redo for customization edits.
 * History never participates in cart identity.
 */

import type { AdvancedCustomizationState } from "@/types/customization";

export const CUSTOMIZATION_HISTORY_LIMIT = 50;
export const HISTORY_COALESCE_MS = 420;

export type CustomizationHistoryBundle = {
  past: AdvancedCustomizationState[];
  present: AdvancedCustomizationState;
  future: AdvancedCustomizationState[];
};

export type HistoryCommitOptions = {
  /**
   * When set, rapid successive commits with the same key (e.g. drag)
   * update `present` without pushing a new past entry each pixel.
   */
  coalesceKey?: string;
};

function cloneState(
  state: AdvancedCustomizationState,
): AdvancedCustomizationState {
  return structuredClone(state);
}

export function createHistoryBundle(
  present: AdvancedCustomizationState,
): CustomizationHistoryBundle {
  return { past: [], present: cloneState(present), future: [] };
}

export function canUndo(bundle: CustomizationHistoryBundle): boolean {
  return bundle.past.length > 0;
}

export function canRedo(bundle: CustomizationHistoryBundle): boolean {
  return bundle.future.length > 0;
}

export function pushHistory(
  bundle: CustomizationHistoryBundle,
  next: AdvancedCustomizationState,
  options: HistoryCommitOptions = {},
  coalesceActiveKey: string | null = null,
): {
  bundle: CustomizationHistoryBundle;
  coalesceKey: string | null;
} {
  const nextPresent = cloneState(next);

  if (options.coalesceKey && coalesceActiveKey === options.coalesceKey) {
    return {
      bundle: { ...bundle, present: nextPresent },
      coalesceKey: options.coalesceKey,
    };
  }

  const past = [...bundle.past, cloneState(bundle.present)].slice(
    -CUSTOMIZATION_HISTORY_LIMIT,
  );

  return {
    bundle: {
      past,
      present: nextPresent,
      future: [],
    },
    coalesceKey: options.coalesceKey ?? null,
  };
}

export function undoHistory(
  bundle: CustomizationHistoryBundle,
): CustomizationHistoryBundle {
  if (!bundle.past.length) return bundle;
  const past = [...bundle.past];
  const previous = past.pop()!;
  return {
    past,
    present: previous,
    future: [cloneState(bundle.present), ...bundle.future].slice(
      0,
      CUSTOMIZATION_HISTORY_LIMIT,
    ),
  };
}

export function redoHistory(
  bundle: CustomizationHistoryBundle,
): CustomizationHistoryBundle {
  if (!bundle.future.length) return bundle;
  const [next, ...future] = bundle.future;
  return {
    past: [...bundle.past, cloneState(bundle.present)].slice(
      -CUSTOMIZATION_HISTORY_LIMIT,
    ),
    present: next,
    future,
  };
}
