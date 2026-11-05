/**
 * Homepage editorial composition photography.
 *
 * These panels historically used CSS gradient color-blocks with labels only
 * (no <img>, no ProductVisual, no media resolver). This registry is the shared
 * source of truth so Gifting / Why-HSP / future editorial panels wire real
 * existing HSP catalogue assets instead of flat color placeholders.
 *
 * Rules:
 * - Paths must point at files under public/
 * - Prefer catalogue product photography already used elsewhere
 * - Do NOT invent imagery, Unsplash, or gradient-as-image substitutes
 * - Independent of ILLUSTRATED_ASSETS_READY / brand-story animation
 */

export type HomepageVisualAsset = {
  /** Public URL path beginning with /images/... */
  src: string;
  label: string;
  width: number;
  height: number;
  objectPosition?: string;
  /** Under-image fallback tone only — never shown as the intended visual. */
  fallbackTone: string;
  /** Label contrast over the photo. */
  labelTone?: "light" | "dark";
};

export const HOMEPAGE_VISUALS = {
  gifting: {
    personalGift: {
      src: "/images/categories/category-gifts.jpg",
      label: "Personal Gift",
      width: 1024,
      height: 1536,
      objectPosition: "center 35%",
      fallbackTone: "#0a4a2c",
      labelTone: "light",
    },
    teamSet: {
      src: "/images/categories/category-office.jpg",
      label: "Team Set",
      width: 1600,
      height: 1068,
      objectPosition: "center center",
      fallbackTone: "#8a4a28",
      labelTone: "light",
    },
  },
  sourcing: {
    source: {
      src: "/images/products/auto-storage-box-main.jpg",
      label: "Source",
      width: 2200,
      height: 2200,
      objectPosition: "center center",
      fallbackTone: "#0a4a2c",
      labelTone: "light",
    },
    craft: {
      src: "/images/products/wooden-organiser.png",
      label: "Craft",
      width: 501,
      height: 362,
      objectPosition: "center center",
      fallbackTone: "#e4ebe5",
      labelTone: "dark",
    },
    deliver: {
      src: "/images/products/document-bag-main.webp",
      label: "Deliver",
      width: 1200,
      height: 1200,
      objectPosition: "center center",
      fallbackTone: "#015c31",
      labelTone: "light",
    },
  },
} as const satisfies Record<string, Record<string, HomepageVisualAsset>>;
