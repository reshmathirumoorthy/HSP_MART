/**
 * Phase 13A — Customization Engine 2.0 foundation exports.
 */

export {
  clampPercent,
  clampRotation,
  clampScale,
  isValidPrintableArea,
  normalizePlacement,
} from "@/lib/customization/coordinates";

export {
  DEFAULT_ALLOWED_ELEMENTS,
  DEFAULT_PRIMARY_PRINTABLE_AREA,
  createPrimarySurface,
  createPrimaryView,
  getAuthoredSurfaces,
  resolveAllowedElements,
  resolveCustomizationViews,
  withSafeCustomizationDefaults,
} from "@/lib/customization/defaults";

export {
  getCustomizationIdentityKey,
  stableCustomizationKey,
} from "@/lib/customization/identity";

export {
  ensureCustomizationSchemaVersion,
  migrateLegacyCustomization,
} from "@/lib/customization/migrate";

export {
  cartCustomizationToSession,
  createCustomizationSession,
  listSessionElements,
  sessionToCartCustomization,
  toCustomizationSession,
} from "@/lib/customization/session";

export {
  customizationDetails,
  formatCustomizationBrief,
  formatCustomizationSummary,
  formatCustomizationSummaryBlock,
  hamperContentLabels,
} from "@/lib/customization/summary";

export {
  assertCustomizationConfigShape,
  validateProductCustomizationConfig,
  type CustomizationConfigIssue,
} from "@/lib/customization/validateConfig";

export { runCustomizationFoundationChecks } from "@/lib/customization/foundationChecks";

export {
  getSurfaceAllowedElements,
  reconcileActiveSurfaceId,
  resolveStudioSurfaces,
  resolveVisibleStudioSurfaces,
  surfaceHasViewAsset,
} from "@/lib/customization/surfaces";

export {
  ORBIT_MIN_FRAMES,
  VIEWER_DRAG,
  clampFrameIndex,
  findViewIndexForSurface,
  frameIndexFromDrag,
  getAvailableProductViews,
  resolvePrimaryViewIndex,
  resolveProductViewerState,
  resolveViewerFrames,
  wrapFrameIndex,
  type ProductViewerResolution,
  type ResolvedProductView,
  type ViewerMode,
} from "@/lib/customization/viewer";

export {
  CUSTOMIZATION_HISTORY_LIMIT,
  canRedo,
  canUndo,
  createHistoryBundle,
  pushHistory,
  redoHistory,
  undoHistory,
  type CustomizationHistoryBundle,
  type HistoryCommitOptions,
} from "@/lib/customization/history";

export {
  buildCustomizationReviewModel,
  isElementNearPrintableEdge,
  isElementOutsidePrintableBounds,
  validateCustomizationForReview,
  type CustomizationReviewModel,
  type ReviewIssue,
} from "@/lib/customization/review";
