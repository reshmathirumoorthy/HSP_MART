# HSP Mart Brand Story — Illustrated Animation Asset Spec

**Status: Real illustrated animation asset is STILL REQUIRED.**

**Phase 17 / 17B:** Player architecture is production-ready. `ILLUSTRATED_ASSETS_READY` remains `false` until a **genuine transparent** production WebM is supplied and passes `npm run verify:brand-story`.

The development animatic (`character/brand-story-loop-animatic.webm`) is **not** the production asset. Do not chroma-key it or rename it to `brand-story-loop.webm`.

Visual source of truth (reference only — never play as a slideshow on the site):

`public/animation/hsp-mart/storyboard-reference.jpg`

---

## Required delivery file

```
public/animation/hsp-mart/character/brand-story-loop.webm
```

Preferred:

- WebM / VP9
- **Real decoded alpha** (transparent background — not opaque green/white plates)
- ~12 seconds @ 24 fps preferred (1280×720 or appropriate production resolution)
- Seamless loop
- Continuous illustrated film (not a panel slideshow)
- No baked logo/tagline/UI/storyboard labels (HTML brand overlay owns logo + copy)

Optional:

```
public/animation/hsp-mart/character/brand-story-loop.mp4
public/animation/hsp-mart/character/poster-static.webp
```

After the WebM is committed:

1. Set `ILLUSTRATED_ASSETS_READY = true` in `src/components/brand-story/animation-config.ts`
2. Verify homepage hero plays, loops, and respects reduced motion

---

## Forbidden substitutes

- CSS/SVG geometric characters
- Storyboard panel slideshow / opacity crossfades
- Displaying `storyboard-reference.jpg` as the animation
- Stock / generic Lottie unrelated to the approved storyboard
- Recreating logo with CSS text when `/images/hsp-mart-logo.png` exists

---

## Exact 12s story (approved storyboard)

| Time | Scene | Must show |
|------|--------|-----------|
| 0–2s | Walk in | Character walks with HSP Mart stationery box |
| 2–4s | Heavy box | Struggle / weight |
| 4–6s | Box falls | Box tilts and falls; products begin to spill |
| 6–7.5s | Products spill | Stationery visibly scatters |
| 7.5–9s | Products settle | Products settle around character |
| 9–10.5s | Brand reveal | Clear center for HTML logo + tagline overlay |
| 10.5–11.5s | Happy reaction | Friendly / thumbs-up reaction |
| 11.5–12s | Reset / loop | Seamless return to walk-in |

---

## Character / art direction

Follow `storyboard-reference.jpg` exactly for:

- Character appearance, clothing, hairstyle, proportions
- HSP Mart box states
- Stationery / product styling
- Scene composition and poses

The homepage hero stage is already brand-green. The **production video background must be transparent** so it composites on that stage. Do **not** bake an opaque green (or white) plate into the WebM. Character clothing may still use green tones — export authored alpha; do not chroma-key.

Do not invent additional scenes, characters, products, or branding.

## Technical notes

- Prefer transparent WebM (VP9 + real decoded alpha)
- 1280×720 @ 24 fps preferred (square 720/1080 also acceptable if composition stays clear)
- Loop-safe first/last frames
- Do **not** burn the logo or tagline into the video (site HTML/CSS brand overlay handles them during the brand beat)
- Keep full character and products in frame (no foot/product crop)
- Matroska `AlphaMode=1` alone is insufficient — verify decoded pixel transparency via `npm run verify:brand-story`
- See `character/README.md` for the full production export checklist

## Acceptance

Complete only when `brand-story-loop.webm` (or finished sprite sheet) is present, `npm run verify:brand-story` reports VALID (for WebM), `ILLUSTRATED_ASSETS_READY` is `true`, and the player mode is `video` or `sprite`.
