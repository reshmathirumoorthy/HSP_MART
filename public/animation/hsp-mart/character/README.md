# HSP Mart Brand Story — Character Animation Assets

## Current status (Phase 17B)

| Asset | Path | Status |
|-------|------|--------|
| **Production WebM** | `brand-story-loop.webm` | **MISSING — awaiting genuine transparent export** |
| Development animatic | `brand-story-loop-animatic.webm` | Development-only reference (opaque HSP green) |
| Optional MP4 | `brand-story-loop.mp4` | Optional fallback (not yet supplied) |
| Optional poster | `poster-static.webp` | Reduced-motion / poster still (not yet supplied) |

`ILLUSTRATED_ASSETS_READY` in `src/components/brand-story/animation-config.ts` must remain **`false`** until a **verified transparent** production WebM is dropped in here and passes `npm run verify:brand-story`.

---

## ANIMATIC PREVIEW — NOT PRODUCTION

`brand-story-loop-animatic.webm` is a **development-only** timing/layout reference.

Inspection confirmed:

- VP9, 1280×720, 24 fps, ~12 s
- Opaque HSP-green backdrop (decoded pixels are **not** transparent)
- Character clothing uses similar greens → **do not chroma-key**
- Do **not** rename, copy, or substitute this file as `brand-story-loop.webm`
- Do **not** invent fake alpha / keyed exports from this animatic

---

## FINAL PRODUCTION EXPORT REQUIREMENTS

Drop the finished file at exactly:

```
public/animation/hsp-mart/character/brand-story-loop.webm
```

| Requirement | Spec |
|-------------|------|
| **Filename** | `brand-story-loop.webm` |
| **Location** | `public/animation/hsp-mart/character/` |
| **Format** | WebM |
| **Codec** | VP9 |
| **Alpha** | **REAL decoded transparency** (not Matroska `AlphaMode=1` alone) |
| **Background** | Transparent — no green plate, no white plate |
| **Duration** | Approximately **12 seconds** |
| **Loop** | Seamless |
| **Frame rate** | **24 fps** preferred |
| **Resolution** | **1280×720** or another appropriate production resolution |
| **Chroma-key** | **None** — export with authored alpha; no green-screen dependency |
| **Typography** | No baked HTML tagline / UI copy |
| **Logo overlay** | No baked HSP logo / title overlay unless it is explicitly part of the approved illustrated animation (HTML/CSS brand overlay handles logo + “HSP MART” + tagline) |
| **Forbidden in-frame chrome** | No baked UI, borders, storyboard labels, or scene numbers |
| **Content** | Illustrated animated character, boxes, stationery/product elements, and other storyboard-approved visuals only |
| **Integrity** | Character / objects must remain intact around transparent regions (no holes from keying) |

### Must NOT appear in the production video

- Green background / chroma plate  
- White background  
- Baked tagline  
- Baked HSP logo (unless approved as part of the illustration itself)  
- Baked UI, borders, storyboard labels, scene numbers  

### After delivery

1. Place `brand-story-loop.webm` in this folder (do not overwrite the animatic).  
2. Run `npm run verify:brand-story` — it must report **VALID** with **decoded** transparency.  
3. Only then set `ILLUSTRATED_ASSETS_READY = true` in `animation-config.ts`.  
4. Smoke-test homepage hero: autoplay, mute, loop, reduced-motion fallback, no overflow.

---

## Developer validation

```bash
npm run verify:brand-story
```

The script checks:

1. Production file exists at the exact path  
2. WebM / EBML container is valid  
3. VP9 codec marker is present  
4. Duration is approximately 12 seconds (when decode tooling is available)  
5. **Decoded frames** contain actual alpha / transparency (corner / background samples)  
6. Background is **not** simply opaque HSP green  
7. Production file is distinguishable from `brand-story-loop-animatic.webm`  

**Important:** Matroska `AlphaMode=1` alone is **not** sufficient. The animatic already flags AlphaMode while decoding as fully opaque green.

Exit codes:

| Code | Meaning |
|------|---------|
| `0` | Production asset **VALID** (decoded transparency confirmed) |
| `1` | Production asset present but **INVALID** / failed checks |
| `2` | Production asset **MISSING** (awaiting export) — expected until delivery |

---

## Related references

- Storyboard (visual reference only): `../storyboard-reference.jpg`  
- Full asset / timeline spec: `../ASSET_SPEC.md`  
- Player config: `src/components/brand-story/animation-config.ts`  
- Player: `src/components/brand-story/BrandStoryAnimation.tsx`  
