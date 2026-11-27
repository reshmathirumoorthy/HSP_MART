# Dimension-based hamper builder: plan and progress

Status legend: `[ ]` not started · `[~]` in progress · `[x]` done (e2e passed headed)

| Step | Scope | Status |
| --- | --- | --- |
| 1 | Dimensions and weight on boxes and products (DB, API, admin) | [x] 2026-11-27: migration 0009, API, admin panel; HB-1.1–1.4 pass headed |
| 2 | Fit engine: volume, per-item fit, weight limit | [x] 2026-11-27: `src/lib/hamperPacking.ts` + `backend/app/services/hamper_fit.py`, shared fixtures, `/hampers/build` box choice and fill meter; HB-2.1–2.3 pass headed |
| 3 | Packing engine: real placements inside the box | [x] 2026-11-27: extreme-point packer (upright, fragile, 60 % support), packing plan table in the builder; HB-3.1–3.2 pass headed |
| 4 | Preview: 2D to scale and 3D rotatable box | [x] 2026-11-27: SVG top/front views, three.js open box with lid toggle, WebGL fallback; HB-4.1–4.3 pass headed |
| 5 | Builder flow, cart, server-side check, pricing, courier weight | [x] 2026-11-27: add to cart, box switch confirm, server re-check and per-product lines, parcel weight in admin; HB-5.1–5.5 pass headed |
| 6 | True-to-delivery 3D: a 3D model for every product and box, 2D rendered from it | [x] 2026-11-27: media upload, side-photo and .glb models, live admin preview, readiness rule (server + builder + checkout), 2D rendered from the 3D scene; HB-6.1–6.6 pass headed |

Each step is marked done only after its unit tests pass and `npx playwright test e2e/hamper-builder.spec.ts --headed`
passes for the cases listed under that step.

---

## Where we start from

- Products live in `products`; presentation data is in `products.content` (JSON), including `hamperConfig`
  (`src/types/hamper.ts`): a fixed `slots` count, `availableProducts`, `defaultContents`, branding, and a flat
  layered preview (`src/lib/hamper.ts`).
- Money is integer paise. All business rules live in FastAPI (`backend/app`); Next.js and the admin app are clients.
- Schema is owned by Drizzle migrations in `drizzle/` (`npm run db:generate`).
- The current slot mode stays working. The new mode is added next to it as `selectionMode: "dimensions"`.

## Standards applied

These standards are used as design guidance; this is not a certification claim.

| Standard | How it is applied |
| --- | --- |
| ISO 80000-1 / ISO 80000-3 / ISO 80000-4 (quantities and units) | SI units only. Lengths stored as integer **millimetres**, mass as integer **grams**. Display as `mm`/`cm`, `g`/`kg` with a space between number and unit (`250 mm`, `1.8 kg`). No inches or pounds. |
| ISO 3394 (dimensions of rigid rectangular packages) | Dimensions always given in the order **length × breadth (width) × height**, external for products, internal for hamper boxes. Admin can pick box sizes from the ISO 3394 modular series (600 × 400 base, sub-modules 300 × 200, 200 × 150 …) or enter custom sizes. |
| ISO 780 (handling marks) | Products have `orientation: "any" \| "upright"` (and `fragile`). Upright items ("this way up") may only rotate around the vertical axis in packing; fragile items are never placed under another item. |
| ISO 4217 | Prices in INR, stored as paise. |
| ISO 8601 | Audit timestamps and API dates. |
| ISO/IEC 25010 (product quality) | Acceptance criteria per step cover functional suitability, performance (packing < 50 ms for 30 items), usability and reliability (server re-checks every client result). |
| ISO/IEC/IEEE 29119-3 (test documentation) | Each step lists test items, test cases with IDs, preconditions and expected results; the spec file names tests by ID. |
| ISO/IEC 40500 (WCAG 2.0 AA) | Builder is keyboard operable, fill meter has text equivalents, the 3D view has a 2D/text alternative and honours `prefers-reduced-motion`. |

## Data model (step 1)

New nullable columns on `products` (integers, SI base units from ISO 80000):

| Column | Meaning |
| --- | --- |
| `length_mm`, `breadth_mm`, `height_mm` | External size for products; **internal** size for hamper boxes |
| `weight_g` | Product weight; box empty (tare) weight for boxes |
| `max_load_g` | Boxes only: maximum content weight |
| `packing_kind` | `item` (default) or `hamper_box` |
| `orientation` | `any` or `upright` (ISO 780 "this way up") |
| `fragile` | boolean, default false |

Box-only extras in `content.hamperBox` (kept separate from the existing slot-mode `hamperConfig`):
`paddingMm` (filler allowance per side, default 10), `maxFillPercent` (default 85), `wallThicknessMm` (for the 3D
render), `boxStyle` (`kraft`, `rigid`, `basket`). Every active, in-stock product with a size, weight and price can go
in any box; per-box product lists are a possible follow-up.

Constraints in the database: dimensions and weights `> 0` when set; a `hamper_box` must have all three internal
dimensions and `max_load_g`. Validation (Pydantic) rejects values over 2000 mm or 50 000 g.

API: dimensions added to product read/write payloads in `services/catalogue.py` and the store `/api/site-data`
product shape (`Product.dimensions`, `Product.weightG`, …). Admin `ProductEdit.tsx` gains a "Size and weight" panel
with L × B × H inputs (mm), weight (g), box toggle and the ISO 3394 size picker.

## Fit engine (step 2)

Pure function, implemented twice with a shared fixture file so client and server can never disagree:
`src/lib/hamperFit.ts` (instant UI feedback) and `backend/app/services/hamper_fit.py` (authoritative).
`e2e/fixtures/hamper-fit-cases.json` is run by both `pytest` and a Node test.

Rules, for box internal size `(L, B, H)` reduced by `paddingMm` on each side:

1. **Item fits alone**: some allowed rotation of the item's sorted dimensions fits inside the usable box
   (upright items keep their height axis vertical).
2. **Volume**: Σ item volume ≤ usable volume × `maxFillPercent`.
3. **Weight**: Σ item weight ≤ `max_load_g`.
4. **Packable**: step 3's packer finds a placement for every item (volume alone is not enough).

Output: `{ ok, fillPercent, volumeUsedMm3, volumeCapacityMm3, weightG, maxLoadG, reasons[], oversized[], placements[] }`
with stable reason codes `too_large`, `too_tall` (upright items only: footprint fits but height does not),
`over_volume`, `over_weight`, `cannot_pack`. Products without a size or weight are not offered in the builder.
The builder disables a product's Add button and shows the reason when adding it would break a rule; a reason that
already applies to the current contents is not blamed on the new item.

Verification: `npx tsx --tsconfig tsconfig.json scripts/verify-hamper-fit.ts` (fixtures, invariants, 30 items
< 50 ms) and `backend/tests/test_hamper_fit.py` (same fixtures plus exact parity with the TypeScript output).

## Packing engine (step 3)

3D bin packing with the **extreme-point first-fit-decreasing** heuristic:

- Sort items by volume, then by largest face, descending. Heavier and non-fragile items first so they go to the floor.
- Candidate points start at the box corner; each placed item adds its three extreme points.
- For each item try its allowed rotations (6, or 2 for `upright`), pick the point with the lowest `z`, then `y`, then
  `x` that does not overlap, stays inside the box, has ≥ 60 % of its base supported (no floating items) and does not
  rest on a `fragile` item.
- Deterministic: same input always gives the same layout (stable sort by product id as tie-break).
- Output per item: `{ productId, index, x, y, z, l, b, h }` in mm (the placed `l × b × h` shows the rotation).
- The builder shows the result as a **packing plan** table (layer, item, position, placed size) that a warehouse
  packer can follow; the previews in step 4 draw the same placements.

Lives in the same two modules as step 2. Performance target: 30 items under 50 ms in the browser.

## Preview (step 4)

Two views over the same packing result, switchable with tabs:

- **2D to scale** (`HamperPreview2D.tsx`, SVG): top view and front view, product photos scaled by their packed
  `l × b` / `l × h`, box drawn to scale with a dimension label (`300 × 200 × 150 mm`). Works without WebGL and is the
  accessible alternative.
- **3D** (`HamperPreview3D.tsx`): plain `three` with its bundled `OrbitControls` (one dependency), loaded with
  `next/dynamic` (`ssr: false`) so the 3D library only downloads when the tab opens. Box drawn with walls and open lid using
  `wallThicknessMm`; each product a box mesh at its packed position, textured on the front face with its catalogue
  image; orbit controls (drag/rotate, zoom), "lid closed" toggle, auto-rotate off under `prefers-reduced-motion`.
  Falls back to 2D if WebGL is unavailable. (A cart thumbnail from the 3D view is a follow-up: the cart is kept in
  localStorage and an image per line would bloat it.)

### Realistic look (added 2026-11-27)

Both previews share one look (`hamperLook.ts`): the box in its material (kraft fibres, rigid green with gold rim,
or woven basket), a shredded-paper bed, and each product shown with **its own photo**:

- `cutout.ts` cuts the product out of its catalogue photo in the browser (removes the frame, then the studio backdrop
  with a tight tolerance; backs off if the product matches the backdrop) and samples its main colour.
- Admins can add a **Hamper view photo** (transparent PNG of the product alone) on the product; the previews then use
  that exact photo. Recommended for products whose catalogue photo is a lifestyle shot or a multi-view grid.
- Standing items (bottles, mugs) appear as upright photo cut-outs at their real height; flat items (books, trays)
  as blocks with the photo on top. The 2D front view is a cut-away through the front wall at the same bed height.

## Builder flow, cart, server checks (step 5)

Route: `/hampers/build` (and from a hamper box product page, "Build your own").

1. **Choose box**: cards for every active `hamper_box` with internal size, max load and price.
2. **Add products**: filtered catalogue; each card shows its size and weight; items that would not fit are disabled
   with the reason ("Too tall for this box", "Over weight limit"). Fill meter: `72 % full · 1.8 / 3.0 kg`.
   Quantities allowed; remove/swap; changing box re-runs the fit and lists items that no longer fit.
3. **Preview**: 2D/3D tabs; branding step reused from the existing hamper flow.
4. **Add to cart**: line = box + contents; price = box price + Σ content prices (paise), GST per line from each
   product's rate.

Server: checkout (`services/online.py`) sends `{productId: box, quantity, hamper: {contents}}`; the server re-runs
`hamper_fit.py` from catalogue sizes and refuses with HTTP 400 ("Your hamper doesn't fit in …") if it does not fit,
so a tampered cart cannot be ordered. The order gets the box line plus one line per content product (each with its
own GST rate); the box line stores the contents, total weight and packing plan for the warehouse.
`courier.parcel()` uses catalogue weights (box tare + contents; 0.5 kg a unit when unknown) and the box's outer size;
volumetric weight = L × B × H (cm) / 5000, and the higher is billed. The admin order page shows the parcel.
Quotes (bulk enquiries) do not take built hampers yet.

## True-to-delivery 3D (step 6)

Goal: the preview shows exactly what the customer receives. Every product and every hamper box that can be used in
the builder has a **3D model** and a **2D photo**, entered by the admin.

**Two ways for the admin to give a 3D model** (product edit page, "3D model" panel):

1. **Upload a 3D model** (`.glb`, binary glTF 2.0, up to 25 MB), e.g. from a scan or the supplier.
2. **Build it in the portal from photos**: pick the shape (box or round) and upload a photo of each side:
   front, back, left, right, top, bottom (round items: front, back, left, right, top; bottom optional). The portal
   builds the model at the product's exact size, with each photo on its side (round items: the four side photos
   wrapped around). A live, rotatable preview shows the result before saving.

Plus a **2D photo** (clean PNG of the product alone), required for products (not boxes).

Storage: uploads go through `POST /api/admin/products/{id}/media` (type checked from the bytes: PNG, JPEG, WebP,
glTF binary) and are served publicly, cached, at `/api/media/{id}`. Stored in `content.model3d`:
`{kind: "glb", url}` or `{kind: "photos", shape: "box" | "round", faces: {front, back, left, right, top, bottom}}`.

**Readiness rule**: a product or box appears in the builder only when it has size, weight and a complete 3D model.
Checkout refuses a hamper containing anything that is not ready. The admin panel shows "Ready for the hamper builder"
or lists what is missing.

**Hamper boxes** use the same panel: the side photos are the outside of the box, the top photo is the lid. A box
setting says whether it ships with shredded-paper filler (shown in the preview) or none.

**Storefront**: the 3D view loads each product's own model (glTF, or the photo-built box/cylinder), scaled to its
real size and turned to its packed orientation. The 2D views are orthographic renders (top and front) of the same
3D scene, so 2D and 3D always match. Browsers without WebGL fall back to the drawn 2D view.

Step 6 tests:

| ID | Preconditions | Action | Expected |
| --- | --- | --- | --- |
| HB-6.1 | Staff | Upload six side photos for a box-shaped product | Each side shows its photo; live 3D preview renders; panel says "Ready for the hamper builder" |
| HB-6.2 | Staff | Upload a `.glb` model | Saved; preview renders the model; a text file renamed `.glb` is refused |
| HB-6.3 | Staff | Leave the top photo out | Panel lists "top photo" as missing; product is not offered in the builder |
| HB-6.4 | Seeded ready products | Build a hamper, open 3D | Each item is drawn from its own model (`data-model` = photos/glb) |
| HB-6.5 | Same | Open 2D | Top and front views are renders of the 3D scene (images present, same item count) |
| HB-6.6 | Seeded | POST a hamper with a not-ready product | HTTP 400 |

## E2E test script

File: `e2e/hamper-builder.spec.ts`, run with `npx playwright test e2e/hamper-builder.spec.ts --headed`.
Seed: the spec creates two boxes (Small 250 × 200 × 120 mm, max 2 kg; Large 400 × 300 × 200 mm, max 6 kg) and
five products with known sizes through the admin app or SQL in `beforeAll`, and cleans them up after.

| ID | Step | Preconditions | Action | Expected |
| --- | --- | --- | --- | --- |
| HB-1.1 | 1 | Staff signed in | Admin edits a product, enters 180 × 80 × 60 mm, 350 g, saves | Notice shown; reload shows same values; API returns them |
| HB-1.2 | 1 | Staff | Admin marks a product as hamper box without max load | Save refused with an alert naming the missing field |
| HB-1.3 | 1 | Staff | Admin enters 0 or 3000 mm | Refused with validation message |
| HB-1.4 | 1 | Staff | Pick ISO 3394 size 300 × 200 | L and B filled with 300 and 200 |
| HB-2.1 | 2 | Seeded | Shopper picks Small box, adds an item taller than 120 mm | Card disabled with "Too tall for this box" |
| HB-2.2 | 2 | Seeded | Adds a 1.2 kg item to the 2 kg Small box | Meter shows `1.2 kg of 2.0 kg`; a second one is disabled with "Over the box's weight limit" |
| HB-2.3 | 2 | Seeded | Adds notebook and pen | Meter shows `16 % full · 0.32 kg of 2.0 kg`; mug shows "Won't fit with what's already inside" |
| HB-3.1 | 3 | Seeded | Adds 4 items to Large box | Packing plan lists 4 placed items with positions; none overlap (checked from the table's `data-*` coords) |
| HB-3.2 | 3 | Seeded | Adds an upright bottle | Its placed height equals its own height |
| HB-4.1 | 4 | Box with items | Open 2D tab | Top and front views visible, box label `400 × 300 × 200 mm` |
| HB-4.2 | 4 | Box with items | Open 3D tab | Canvas renders (non-blank pixels), drag rotates, item count label matches |
| HB-4.3 | 4 | WebGL disabled | Open 3D tab | Falls back to 2D with a notice |
| HB-5.1 | 5 | Seeded | Full flow to cart | Cart line shows box + contents, total = sum of prices |
| HB-5.2 | 5 | Seeded | Switch to Small box after filling Large | Items that no longer fit are listed and removed on confirm |
| HB-5.3 | 5 | Seeded | POST tampered hamper (too heavy) to checkout API | HTTP 400, message names the weight limit |
| HB-5.4 | 5 | Seeded | Checkout | Lines = box + each product at its own price; admin shows parcel with billed = max(actual, volumetric) |
| HB-5.5 | 5 | Seeded | Keyboard only | Choose box, add, switch tab, add to cart without a mouse; axe (WCAG 2 A/AA) finds no serious or critical violations |

Unit tests: `backend/tests/test_hamper_fit.py` (fixtures, packer invariants: inside box, no overlap, support,
upright, determinism, parity with TypeScript), `backend/tests/test_hamper_checkout.py` (pricing, tampering, parcel)
and `scripts/verify-hamper-fit.ts` (same fixtures, 30 items < 50 ms).

## Out of scope

True 3D product models (products render as image-faced boxes), irregular shapes (cylinders packed as their bounding
box), multiple boxes per hamper, and automatic box suggestion (a possible follow-up: "smallest box that fits").
