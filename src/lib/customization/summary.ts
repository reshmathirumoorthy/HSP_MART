/**
 * Human-readable customization summaries for cart, checkout, quotes, and account.
 * Never exposes raw JSON or full data URLs.
 */

import {
  customizationDetails,
  formatCustomizationSummary,
  hamperContentLabels,
} from "@/components/customization/customization.utils";
import type { CartCustomization } from "@/types/customization";

export {
  formatCustomizationSummary,
  customizationDetails,
  hamperContentLabels,
};

export type CustomizationSummaryBlock = {
  headline: string | null;
  lines: string[];
};

/**
 * Structured summary for UI surfaces that want headline + detail lines.
 */
export function formatCustomizationSummaryBlock(
  customization: CartCustomization | undefined,
  variantLabel?: string,
): CustomizationSummaryBlock {
  return {
    headline: formatCustomizationSummary(customization),
    lines: customizationDetails(customization, variantLabel),
  };
}

/**
 * Compact one-line label without media file names when overly long.
 */
export function formatCustomizationBrief(
  customization: CartCustomization | undefined,
): string | null {
  if (!customization) return null;

  const parts: string[] = [];

  if (customization.variantLabel || customization.variantId) {
    parts.push(
      `Variant: ${customization.variantLabel || customization.variantId}`,
    );
  }

  if (customization.zoneCustomizations?.length) {
    const surfaces = [
      ...new Set(
        customization.zoneCustomizations.map((zone) => zone.zoneLabel),
      ),
    ];
    parts.push(
      surfaces.length === 1
        ? `Surface: ${surfaces[0]}`
        : `Surfaces: ${surfaces.join(", ")}`,
    );

    const types = new Set(
      customization.zoneCustomizations.map((zone) => {
        if (zone.type === "logo") return "Logo";
        if (zone.type === "image") return "Image";
        return "Text";
      }),
    );
    parts.push(`Elements: ${[...types].join(" + ")}`);

    for (const zone of customization.zoneCustomizations) {
      if (zone.type === "text" && zone.text?.trim()) {
        parts.push(`${zone.zoneLabel}: “${zone.text.trim()}”`);
      } else if (zone.type === "logo") {
        parts.push(`${zone.zoneLabel}: Logo uploaded`);
      } else if (zone.type === "image") {
        parts.push(`${zone.zoneLabel}: Image uploaded`);
      }
    }

    return `Customized · ${parts.join(" · ")}`;
  }

  return formatCustomizationSummary(customization);
}
