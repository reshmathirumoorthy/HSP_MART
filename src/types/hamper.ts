/**
 * Composite gift-hamper configuration (Phase 10C).
 * Extends Phase 10B customization — branding reuses CustomizationLayer / CartCustomization.
 */

import type {
  CustomizationMediaType,
  PrintableArea,
} from "@/types/customization";

export type HamperSelectionMode = "slots";

/** Default visual placement for a child product inside the hamper preview. */
export type HamperPreviewLayer = {
  x: number;
  y: number;
  scale: number;
  rotation: number;
  zIndex: number;
};

export type HamperAvailableProduct = {
  /** Canonical product id from the catalogue. */
  productId: string;
  /** Optional override for layered preview placement. */
  preview?: Partial<HamperPreviewLayer>;
};

export type HamperConfig = {
  enabled: true;
  selectionMode: HamperSelectionMode;
  /** Fixed number of content slots. */
  slots: number;
  /** Catalogue product ids eligible for this hamper. */
  availableProducts: HamperAvailableProduct[];
  /** Default selected product ids (length ≤ slots). */
  defaultContents?: string[];
  /** Branding types supported on the hamper surface. */
  brandingTypes: CustomizationMediaType[];
  /** Percentage branding region on the composed preview. */
  brandingArea: PrintableArea;
  /** Optional CSS frame when no transparent base photo is suitable. */
  previewFrame?: "basket" | "box";
};

export type HamperContentItem = {
  productId: string;
  quantity: number;
};

export type HamperStep = "contents" | "branding" | "preview";
