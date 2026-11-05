"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AdvancedCustomizationState } from "@/types/customization";
import {
  HISTORY_COALESCE_MS,
  canRedo,
  canUndo,
  createHistoryBundle,
  pushHistory,
  redoHistory,
  undoHistory,
  type HistoryCommitOptions,
} from "@/lib/customization/history";

/**
 * Session-local undo/redo for the customization studio.
 * Coalesces rapid drag/resize/rotate commits into one history step.
 */
export function useCustomizationHistory(
  initial: AdvancedCustomizationState,
) {
  const [bundle, setBundle] = useState(() => createHistoryBundle(initial));
  const coalesceKeyRef = useRef<string | null>(null);
  const coalesceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCoalesceTimer = () => {
    if (coalesceTimerRef.current) {
      clearTimeout(coalesceTimerRef.current);
      coalesceTimerRef.current = null;
    }
  };

  useEffect(() => () => clearCoalesceTimer(), []);

  const commit = useCallback(
    (
      next: AdvancedCustomizationState,
      options: HistoryCommitOptions = {},
    ) => {
      setBundle((current) => {
        const result = pushHistory(
          current,
          next,
          options,
          coalesceKeyRef.current,
        );
        coalesceKeyRef.current = result.coalesceKey;
        if (options.coalesceKey) {
          clearCoalesceTimer();
          coalesceTimerRef.current = setTimeout(() => {
            coalesceKeyRef.current = null;
            coalesceTimerRef.current = null;
          }, HISTORY_COALESCE_MS);
        } else {
          clearCoalesceTimer();
          coalesceKeyRef.current = null;
        }
        return result.bundle;
      });
    },
    [],
  );

  const replacePresent = useCallback((next: AdvancedCustomizationState) => {
    clearCoalesceTimer();
    coalesceKeyRef.current = null;
    setBundle(createHistoryBundle(next));
  }, []);

  const undo = useCallback(() => {
    clearCoalesceTimer();
    coalesceKeyRef.current = null;
    setBundle((current) => undoHistory(current));
  }, []);

  const redo = useCallback(() => {
    clearCoalesceTimer();
    coalesceKeyRef.current = null;
    setBundle((current) => redoHistory(current));
  }, []);

  return {
    state: bundle.present,
    commit,
    replacePresent,
    undo,
    redo,
    canUndo: canUndo(bundle),
    canRedo: canRedo(bundle),
  };
}
