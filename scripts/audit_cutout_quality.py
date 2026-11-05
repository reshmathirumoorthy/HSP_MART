"""
Compare transparent cutouts against originals. Flag damaged / incomplete products.
Does not modify any files.
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
PRODUCTS = ROOT / "public" / "images" / "products"
ORIGINALS = PRODUCTS / "_originals"
CUTOUTS = PRODUCTS / "transparent"
VARIANT_ORIGINALS = PRODUCTS / "variants" / "_originals"
VARIANT_CUTOUTS = PRODUCTS / "transparent" / "variants"
REPORT = ROOT / "scripts" / "cutout_quality_report.json"
EXTS = {".png", ".jpg", ".jpeg", ".webp"}


def load_rgba(path: Path) -> Image.Image:
    with Image.open(path) as im:
        im.load()
        return im.convert("RGBA")


def non_bg_mask_original(rgba: Image.Image) -> np.ndarray:
    """Heuristic product mask on original: not near-white studio plate."""
    arr = np.array(rgba, dtype=np.float32)
    r, g, b, a = arr[..., 0], arr[..., 1], arr[..., 2], arr[..., 3]
    wh = (r + g + b) / 3.0
    chroma = np.maximum(np.maximum(r, g), b) - np.minimum(np.minimum(r, g), b)
    # Studio bg: very white + low chroma. Keep everything else as product.
    studio = (wh > 242) & (chroma < 18) & (a > 200)
    # Also treat fully transparent as non-product
    product = (~studio) & (a > 20)
    return product


def cutout_opaque(rgba: Image.Image) -> np.ndarray:
    arr = np.array(rgba)
    return arr[..., 3] > 24


def internal_hole_ratio(mask: np.ndarray) -> float:
    """Fraction of holes inside the product bbox (transparent islands)."""
    from scipy import ndimage  # optional

    try:
        labeled, n = ndimage.label(~mask)
    except Exception:
        # Fallback without scipy: count transparent pixels inside bbox of opaque
        ys, xs = np.where(mask)
        if len(xs) == 0:
            return 1.0
        y0, y1 = ys.min(), ys.max()
        x0, x1 = xs.min(), xs.max()
        region = mask[y0 : y1 + 1, x0 : x1 + 1]
        if region.size == 0:
            return 1.0
        return float((~region).mean())

    # Largest opaque component
    if not mask.any():
        return 1.0
    ys, xs = np.where(mask)
    y0, y1 = int(ys.min()), int(ys.max())
    x0, x1 = int(xs.min()), int(xs.max())
    region = mask[y0 : y1 + 1, x0 : x1 + 1]
    # Transparent pixels inside bbox that are not connected to border of region
    inv = ~region
    h, w = inv.shape
    border = np.zeros_like(inv)
    border[0, :] = True
    border[-1, :] = True
    border[:, 0] = True
    border[:, -1] = True
    # Mark transparent connected to border as exterior padding, rest as holes
    from collections import deque

    vis = np.zeros_like(inv)
    q: deque[tuple[int, int]] = deque()
    for y, x in zip(*np.where(border & inv)):
        q.append((int(y), int(x)))
    while q:
        y, x = q.popleft()
        if y < 0 or y >= h or x < 0 or x >= w or vis[y, x] or not inv[y, x]:
            continue
        vis[y, x] = True
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            q.append((y + dy, x + dx))
    holes = inv & ~vis
    return float(holes.mean()) if region.size else 0.0


def internal_hole_ratio_simple(mask: np.ndarray) -> float:
    ys, xs = np.where(mask)
    if len(xs) == 0:
        return 1.0
    y0, y1 = int(ys.min()), int(ys.max())
    x0, x1 = int(xs.min()), int(xs.max())
    region = mask[y0 : y1 + 1, x0 : x1 + 1]
    if region.size == 0:
        return 1.0
    inv = ~region
    h, w = inv.shape
    from collections import deque

    vis = np.zeros_like(inv)
    q: deque[tuple[int, int]] = deque()
    for x in range(w):
        if inv[0, x]:
            q.append((0, x))
        if inv[h - 1, x]:
            q.append((h - 1, x))
    for y in range(h):
        if inv[y, 0]:
            q.append((y, 0))
        if inv[y, w - 1]:
            q.append((y, w - 1))
    while q:
        y, x = q.popleft()
        if y < 0 or y >= h or x < 0 or x >= w or vis[y, x] or not inv[y, x]:
            continue
        vis[y, x] = True
        q.extend(((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)))
    holes = inv & ~vis
    return float(holes.sum() / max(1, region.size))


def analyze_pair(orig_path: Path, cut_path: Path) -> dict:
    orig = load_rgba(orig_path)
    if not cut_path.exists():
        return {
            "file": orig_path.name,
            "status": "missing_cutout",
            "damaged": True,
            "reasons": ["no cutout file"],
        }

    cut = load_rgba(cut_path)
    # Resize cut to orig size for coverage comparison (cut may be cropped+padded)
    cut_resized = cut.resize(orig.size, Image.Resampling.BILINEAR)
    om = non_bg_mask_original(orig)
    cm = cutout_opaque(cut_resized)

    # Dilate original mask slightly — rembg may shrink silhouette
    om_u8 = (om.astype(np.uint8) * 255)
    om_img = Image.fromarray(om_u8, mode="L").filter(ImageFilter.MaxFilter(5))
    om_dil = np.array(om_img) > 127

    orig_count = int(om.sum())
    cut_count = int(cm.sum())
    # How much of original product survived in cutout
    preserved = float((cm & om).sum() / max(1, orig_count))
    # How much of dilated product is missing
    missing = float((om_dil & ~cm).sum() / max(1, om_dil.sum()))
    # Internal holes in cutout
    hole = internal_hole_ratio_simple(cutout_opaque(cut))
    # Coverage of cutout canvas
    cov = float(cutout_opaque(cut).mean())
    # Aspect sanity: cutout bbox aspect vs orig product bbox
    reasons = []
    damaged = False

    if preserved < 0.72:
        damaged = True
        reasons.append(f"low_preserve={preserved:.2f}")
    if missing > 0.28:
        damaged = True
        reasons.append(f"missing_parts={missing:.2f}")
    if hole > 0.04:
        damaged = True
        reasons.append(f"internal_holes={hole:.3f}")
    if cut_count < max(80, int(orig_count * 0.35)):
        damaged = True
        reasons.append(f"tiny_cutout={cut_count}/{orig_count}")
    if cov < 0.02:
        damaged = True
        reasons.append(f"near_empty={cov:.3f}")

    # White product special: original may have high white fraction inside product
    # If rembg ate white packaging, preserved drops — already covered.

    return {
        "file": orig_path.name,
        "cutout": cut_path.name,
        "status": "damaged" if damaged else "ok",
        "damaged": damaged,
        "preserved": round(preserved, 3),
        "missing": round(missing, 3),
        "holes": round(hole, 4),
        "orig_pixels": orig_count,
        "cut_pixels": cut_count,
        "coverage": round(cov, 3),
        "reasons": reasons,
    }


def walk(src: Path, dest: Path) -> list[dict]:
    rows = []
    if not src.exists():
        return rows
    for p in sorted(src.iterdir()):
        if not p.is_file() or p.suffix.lower() not in EXTS or p.name.startswith("."):
            continue
        cut = dest / f"{p.stem}.png"
        rows.append(analyze_pair(p, cut))
    return rows


def main() -> int:
    rows = walk(ORIGINALS, CUTOUTS)
    rows += walk(VARIANT_ORIGINALS, VARIANT_CUTOUTS)
    damaged = [r for r in rows if r.get("damaged")]
    report = {
        "total": len(rows),
        "damaged_count": len(damaged),
        "ok_count": len(rows) - len(damaged),
        "damaged": damaged,
        "all": rows,
    }
    REPORT.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"total={len(rows)} ok={report['ok_count']} damaged={len(damaged)}")
    for r in damaged[:40]:
        print(f"  DAMAGED {r['file']}: {', '.join(r['reasons'])}")
    if len(damaged) > 40:
        print(f"  ... and {len(damaged) - 40} more")
    print(f"report={REPORT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
