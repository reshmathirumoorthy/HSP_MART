"""
Audit processed display assets vs originals.
Restore any incomplete/damaged ones as opaque originals on nude-beige padding.
Never modifies _originals/.
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ORIG = ROOT / "public" / "images" / "products" / "_originals"
LIVE = ROOT / "public" / "images" / "products"
CUT = LIVE / "transparent"
VORIG = LIVE / "variants" / "_originals"
VCUT = LIVE / "transparent" / "variants"
REPORT = ROOT / "scripts" / "complete_restore_report.json"
EXTS = {".png", ".jpg", ".jpeg", ".webp"}
NUDE = (0xE5, 0xD8, 0xC7, 255)
SIZE = 420


def load_rgb_thumb(path: Path) -> np.ndarray:
    with Image.open(path) as im:
        im = im.convert("RGBA")
        # Flatten alpha onto white for fair comparison
        if im.mode == "RGBA":
            flat = Image.new("RGBA", im.size, (255, 255, 255, 255))
            flat.alpha_composite(im)
            im = flat.convert("RGB")
        else:
            im = im.convert("RGB")
        im.thumbnail((SIZE, SIZE), Image.Resampling.BILINEAR)
        return np.array(im)


def chromatic_mask(rgb: np.ndarray) -> np.ndarray:
    a = rgb.astype(np.float32)
    wh = a.mean(axis=2)
    chroma = a.max(axis=2) - a.min(axis=2)
    return (chroma > 16) & (wh < 246)


def aspect(mask: np.ndarray) -> float | None:
    ys, xs = np.where(mask)
    if len(xs) == 0:
        return None
    return (xs.max() - xs.min() + 1) / max(1, (ys.max() - ys.min() + 1))


def analyze(orig: Path, cut: Path) -> dict:
    if not cut.exists():
        return {"file": orig.name, "damaged": True, "reasons": ["missing_cutout"]}
    o = load_rgb_thumb(orig)
    c = load_rgb_thumb(cut)
    # Resize cut thumb to orig thumb size for mass compare (independent thumbs already similar)
    om = chromatic_mask(o)
    cm = chromatic_mask(c)
    o_mass = max(1, int(om.sum()))
    c_mass = int(cm.sum())
    ratio = c_mass / o_mass
    oa, ca = aspect(om), aspect(cm)
    aspect_delta = abs(np.log(ca / oa)) if oa and ca and oa > 0 and ca > 0 else 0.0

    reasons: list[str] = []
    damaged = False
    # Processed lost a lot of product colour → likely erased / collapsed
    if ratio < 0.55:
        damaged = True
        reasons.append(f"low_mass_ratio={ratio:.2f}")
    if aspect_delta > 0.45:
        damaged = True
        reasons.append(f"aspect_skew={aspect_delta:.2f}")
    if c_mass < 800:
        damaged = True
        reasons.append("near_empty")

    return {
        "file": orig.name,
        "damaged": damaged,
        "ratio": round(ratio, 3),
        "o_mass": o_mass,
        "c_mass": c_mass,
        "aspect_delta": round(float(aspect_delta), 3),
        "reasons": reasons,
    }


def restore_opaque_original(orig: Path, dest: Path) -> None:
    with Image.open(orig) as im:
        im.load()
        rgb = im.convert("RGB")
    pad = max(18, int(max(rgb.size) * 0.06))
    canvas = Image.new("RGBA", (rgb.width + pad * 2, rgb.height + pad * 2), NUDE)
    canvas.paste(rgb, (pad, pad))
    dest.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(dest, "PNG", optimize=True)


def walk(src: Path, dest: Path) -> list[dict]:
    rows: list[dict] = []
    if not src.exists():
        return rows
    for p in sorted(src.iterdir()):
        if p.is_file() and p.suffix.lower() in EXTS and not p.name.startswith("."):
            cut = dest / f"{p.stem}.png"
            rows.append(analyze(p, cut))
    return rows


def main() -> int:
    rows = walk(ORIG, CUT) + walk(VORIG, VCUT)
    damaged = [r for r in rows if r["damaged"]]
    restored: list[str] = []

    # Map stem -> original path
    by_stem: dict[str, Path] = {}
    for folder in (ORIG, VORIG):
        if not folder.exists():
            continue
        for p in folder.iterdir():
            if p.is_file() and p.suffix.lower() in EXTS:
                by_stem[p.stem] = p

    for r in damaged:
        stem = Path(r["file"]).stem
        src = by_stem.get(stem)
        if not src:
            continue
        dest = (VCUT if src.parent.name == "_originals" and "variants" in str(src) else CUT)
        # Fix dest for variants
        if "variants" in str(src).replace("\\", "/"):
            dest_path = VCUT / f"{stem}.png"
        else:
            dest_path = CUT / f"{stem}.png"
        restore_opaque_original(src, dest_path)
        restored.append(stem)
        print(f"RESTORED {stem}: {', '.join(r['reasons'])}", flush=True)

    report = {
        "total": len(rows),
        "damaged_before": len(damaged),
        "restored": restored,
        "damaged": damaged,
        "ok": len(rows) - len(damaged),
    }
    REPORT.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(
        f"\ntotal={len(rows)} ok={report['ok']} damaged={len(damaged)} "
        f"restored={len(restored)}",
        flush=True,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
