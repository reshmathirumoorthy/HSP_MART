"""
Fast cutout quality audit (no spatial alignment required).

Compares opaque pixel mass and internal holes — finalized cutouts are
cropped/padded so pixel-wise overlay against originals is misleading.
"""

from __future__ import annotations

import json
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ORIG = ROOT / "public" / "images" / "products" / "_originals"
CUT = ROOT / "public" / "images" / "products" / "transparent"
VORIG = ROOT / "public" / "images" / "products" / "variants" / "_originals"
VCUT = ROOT / "public" / "images" / "products" / "transparent" / "variants"
REPORT = ROOT / "scripts" / "cutout_quality_report.json"
EXTS = {".png", ".jpg", ".jpeg", ".webp"}
SIZE = 448


def load_thumb(path: Path) -> np.ndarray:
    with Image.open(path) as im:
        im = im.convert("RGBA")
        im.thumbnail((SIZE, SIZE), Image.Resampling.BILINEAR)
        return np.array(im)


def holes_ratio(mask: np.ndarray) -> float:
    ys, xs = np.where(mask)
    if len(xs) == 0:
        return 1.0
    y0, y1 = int(ys.min()), int(ys.max())
    x0, x1 = int(xs.min()), int(xs.max())
    region = mask[y0 : y1 + 1, x0 : x1 + 1]
    inv = ~region
    h, w = inv.shape
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
    return float((inv & ~vis).sum() / max(1, region.size))


def product_mask(o: np.ndarray) -> np.ndarray:
    r, g, b, a = (
        o[..., 0].astype(np.float32),
        o[..., 1].astype(np.float32),
        o[..., 2].astype(np.float32),
        o[..., 3],
    )
    wh = (r + g + b) / 3.0
    chroma = np.maximum(np.maximum(r, g), b) - np.minimum(np.minimum(r, g), b)
    studio = (wh > 242) & (chroma < 18) & (a > 200)
    return (~studio) & (a > 20)


def bbox_aspect(mask: np.ndarray) -> float | None:
    ys, xs = np.where(mask)
    if len(xs) == 0:
        return None
    h = int(ys.max() - ys.min() + 1)
    w = int(xs.max() - xs.min() + 1)
    return w / max(1, h)


def analyze(op: Path, cp: Path) -> dict:
    o = load_thumb(op)
    if not cp.exists():
        return {"file": op.name, "damaged": True, "reasons": ["missing"]}
    c = load_thumb(cp)
    om = product_mask(o)
    cm = c[..., 3] > 24
    orig_n = max(1, int(om.sum()))
    cut_n = int(cm.sum())
    mass_ratio = cut_n / orig_n
    hole = holes_ratio(cm)
    oa = bbox_aspect(om)
    ca = bbox_aspect(cm)
    aspect_delta = None
    if oa and ca:
        aspect_delta = abs(np.log(ca / oa))

    reasons: list[str] = []
    damaged = False
    # Mass: cutout opaque pixels vs estimated product pixels (independent thumbs)
    if mass_ratio < 0.45:
        damaged = True
        reasons.append(f"low_mass={mass_ratio:.2f}")
    if mass_ratio > 2.8:
        # Likely kept most of the studio plate (failed removal) — not "erased",
        # but flag as imperfect; still better than erased product.
        reasons.append(f"high_mass={mass_ratio:.2f}")
    if hole > 0.045:
        damaged = True
        reasons.append(f"holes={hole:.3f}")
    if aspect_delta is not None and aspect_delta > 0.55:
        damaged = True
        reasons.append(f"aspect_skew={aspect_delta:.2f}")
    if cut_n < 80:
        damaged = True
        reasons.append("near_empty")

    return {
        "file": op.name,
        "damaged": damaged,
        "mass_ratio": round(mass_ratio, 3),
        "holes": round(hole, 4),
        "aspect_delta": None if aspect_delta is None else round(float(aspect_delta), 3),
        "reasons": reasons,
    }


def walk(src: Path, dest: Path) -> list[dict]:
    rows: list[dict] = []
    if not src.exists():
        return rows
    for p in sorted(src.iterdir()):
        if p.is_file() and p.suffix.lower() in EXTS and not p.name.startswith("."):
            rows.append(analyze(p, dest / f"{p.stem}.png"))
            if len(rows) % 25 == 0:
                print(f"...{len(rows)}", flush=True)
    return rows


def main() -> int:
    rows = walk(ORIG, CUT) + walk(VORIG, VCUT)
    damaged = [r for r in rows if r["damaged"]]
    report = {
        "total": len(rows),
        "damaged_count": len(damaged),
        "ok_count": len(rows) - len(damaged),
        "damaged": damaged,
        "all": rows,
    }
    REPORT.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"total={len(rows)} ok={report['ok_count']} damaged={len(damaged)}")
    for r in damaged:
        print(f"  {r['file']}: {', '.join(r['reasons'])}")
    print(f"report={REPORT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
