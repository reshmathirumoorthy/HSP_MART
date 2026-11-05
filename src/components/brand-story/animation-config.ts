/**
 * HSP Mart Brand Story — illustrated animation configuration.
 *
 * STATUS: Production transparent WebM is installed and verified.
 * Visual source of truth: public/animation/hsp-mart/storyboard-reference.jpg
 * Production asset: public/animation/hsp-mart/character/brand-story-loop.webm
 *
 * Do NOT substitute CSS/SVG geometry or a storyboard slideshow.
 * Do NOT chroma-key or rename the development animatic into the production path.
 */

export type AnimationMode = "video" | "sprite" | "pending";

/**
 * True after a genuine transparent production WebM is present under
 * public/animation/hsp-mart/character/ and `npm run verify:brand-story` reports VALID.
 */
export const ILLUSTRATED_ASSETS_READY = true;

/** Storyboard loop length. */
export const BRAND_STORY_LOOP_SECONDS = 12;

export const BRAND_STORY_COPY = {
  title: "HSP MART",
  tagline: "The place where all your needs are satisfied.",
  ariaLabel:
    "HSP Mart brand story: an illustrated office professional carries a heavy stationery box, the products spill out, and HSP Mart appears as the place where all your needs are satisfied.",
} as const;

/** Official brand mark — never recreate with CSS text. */
export const HSP_MART_LOGO = "/images/hsp-mart-logo.png";

/**
 * Option A — PRODUCTION transparent looping WebM.
 * Continuous walk → heavy → fall → spill → settle → brand → smile → reset.
 * Background is real alpha. HTML logo/tagline overlay owns brand copy.
 */
export const VIDEO_ASSETS = {
  webm: "/animation/hsp-mart/character/brand-story-loop.webm",
  mp4: "/animation/hsp-mart/character/brand-story-loop.mp4",
  poster: "/animation/hsp-mart/character/poster-static.webp",
} as const;

/**
 * ANIMATIC PREVIEW — NOT PRODUCTION
 *
 * Temporary development / test animatic only.
 * Never treat as the production asset. Do not rename to brand-story-loop.webm.
 * Used only when NODE_ENV === "development", ILLUSTRATED_ASSETS_READY is false,
 * and the URL includes ?animatic=1.
 *
 * Phase 17B: opaque HSP-green reference (AlphaMode flagged but decoded frames
 * are not transparent). Do not chroma-key. Optional `alphaPreviewWebm` is used
 * only if a separately verified transparent file is present — never invent it.
 */
export const DEV_ANIMATIC_PREVIEW = {
  /** Development animatic (opaque brand-green backdrop) — reference only. */
  webm: "/animation/hsp-mart/character/brand-story-loop-animatic.webm",
  /**
   * Optional verified transparent preview path (not authored from chroma-key).
   * Prefer in development when present; do not invent/fake this file.
   */
  alphaPreviewWebm:
    "/animation/hsp-mart/character/brand-story-loop-animatic-alpha-preview.webm",
} as const;

/**
 * Option B — illustrated sprite sheet (finished artwork frames only).
 */
export const SPRITE_ASSETS = {
  sheet: "/animation/hsp-mart/character/brand-story-sprite.webp",
  frameCount: 48,
  frameWidth: 720,
  frameHeight: 720,
  fps: 12,
} as const;

/**
 * Timeline from the approved 8-scene storyboard (seconds).
 * Used to sync HTML brand overlay once the WebM is present.
 */
export const TIMELINE = {
  walkEnd: 2.0,
  heavyEnd: 4.0,
  fallEnd: 6.0,
  spillEnd: 7.5,
  settleEnd: 9.0,
  /** Brand logo + tagline */
  brandStart: 9.0,
  brandEnd: 10.5,
  smileEnd: 11.5,
  resetEnd: BRAND_STORY_LOOP_SECONDS,
} as const;

export const ASSET_DIRS = {
  character: "/animation/hsp-mart/character/",
  box: "/animation/hsp-mart/box/",
  products: "/animation/hsp-mart/products/",
  logo: "/animation/hsp-mart/logo/",
  storyboard: "/animation/hsp-mart/storyboard-reference.jpg",
} as const;

export const REQUIRED_ASSET_CHECKLIST = [
  "character/brand-story-loop.webm  ← REQUIRED (VP9 + REAL decoded transparency)",
  "character/brand-story-loop.mp4   ← optional fallback",
  "character/poster-static.webp     ← reduced-motion / poster still",
  "character/brand-story-loop-animatic.webm ← DEV ONLY (opaque; not production)",
  "storyboard-reference.jpg         ← visual reference only (NOT played on site)",
  "logo: /images/hsp-mart-logo.png  ← already in repo (HTML overlay)",
  "npm run verify:brand-story       ← must VALID before ILLUSTRATED_ASSETS_READY=true",
] as const;
