"""
Rebuild only selected display PNGs from authentic _originals sources.

Never reads transparent/ as input. Applies adaptive nude padding based on
how close product content sits to the source frame edges.
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ORIG = ROOT / "public" / "images" / "products" / "_originals"
VORIG = ROOT / "public" / "images" / "products" / "variants" / "_originals"
OUT = ROOT / "public" / "images" / "products" / "transparent"
VOUT = OUT / "variants"
EXTS = (".png", ".jpg", ".jpeg", ".webp")
NUDE = (0xE5, 0xD8, 0xC7, 255)
NUDE_RGB = np.array([0xE5, 0xD8, 0xC7], dtype=float)
REPORT = ROOT / "scripts" / "rebuild_selected_report.json"

# display_stem -> source stem under _originals (same folder unless variants/)
# pad_frac overrides adaptive minimum when set
SWAPS: list[dict] = [
    # Better complete sibling as display for primary card
    {"dest": "parker-vector-pen-main", "source": "parker-vector-pen-2", "pad": 0.16},
    {"dest": "visiting-card-sleeves-main", "source": "visiting-card-sleeves-5", "pad": 0.14},
    {"dest": "harry-potter-quill-main", "source": "harry-potter-quill-2", "pad": 0.14},
    # Same source, but more generous pad (edge-tight but complete product)
    {"dest": "cable-organizer-main", "source": "cable-organizer-main", "pad": 0.20},
    {"dest": "desk-fan-organizer-main", "source": "desk-fan-organizer-main", "pad": 0.18},
    {"dest": "gift-hamper-basket", "source": "gift-hamper-basket", "pad": 0.16},
    {"dest": "corporate-gift-hamper", "source": "corporate-gift-hamper", "pad": 0.16},
    {"dest": "sticky-notes-set-main", "source": "sticky-notes-set-main", "pad": 0.16},
    {"dest": "expanding-file-main", "source": "expanding-file-main", "pad": 0.14},
    {"dest": "a5-fancy-magnetic-notebook-main", "source": "a5-fancy-magnetic-notebook-main", "pad": 0.14},
    {"dest": "vacuum-bottle-main", "source": "vacuum-bottle-main", "pad": 0.18},
    {"dest": "laptop-stand-main", "source": "laptop-stand-main", "pad": 0.18},
    {"dest": "spring-action-file-main", "source": "spring-action-file-main", "pad": 0.18},
    {"dest": "magazine-holder-main", "source": "magazine-holder-main", "pad": 0.16},
    {"dest": "box-file-main", "source": "box-file-main", "pad": 0.16},
    {"dest": "calculator-diary-main", "source": "calculator-diary-main", "pad": 0.16},
    {"dest": "report-file-main", "source": "report-file-main", "pad": 0.16},
    {"dest": "ring-binder-main", "source": "ring-binder-main", "pad": 0.16},
    {"dest": "lotus-spiral-pad-main", "source": "lotus-spiral-pad-main", "pad": 0.16},
    {"dest": "kk-gel-pen-main", "source": "kk-gel-pen-main", "pad": 0.16},
    {"dest": "hans-writing-pad", "source": "hans-writing-pad", "pad": 0.14},
    {"dest": "note-book-set-main", "source": "note-book-set-main", "pad": 0.14},
]


def find(stem: str, folder: Path) -> Path | None:
    for e in EXTS:
        p = folder / f"{stem}{e}"
        if p.is_file():
            return p
    return None


def content_margin(rgb: Image.Image) -> float:
    a = np.array(rgb.convert("RGB")).astype(float)
    wh = a.mean(2)
    ch = a.max(2) - a.min(2)
    dn = np.linalg.norm(a - NUDE_RGB, axis=2)
    near_white = (wh > 245) & (ch < 18)
    near_nude = dn < 22
    product = ~(near_white | near_nude)
    if not product.any():
        return 0.5
    ys, xs = np.where(product)
    h, w = product.shape
    return min(int(ys.min()), int(xs.min()), h - 1 - int(ys.max()), w - 1 - int(xs.max())) / max(
        h, w
    )


def paste_on_nude(src: Path, dest: Path, pad_frac: float) -> dict:
    with Image.open(src) as im:
        im.load()
        rgba = im.convert("RGBA")
    flat = Image.new("RGBA", rgba.size, (255, 255, 255, 255))
    flat.alpha_composite(rgba)
    rgb = flat.convert("RGB")
    # If source already has almost no margin, bump pad further
    m = content_margin(rgb)
    effective = max(pad_frac, 0.14 if m < 0.03 else pad_frac)
    if m < 0.01:
        effective = max(effective, 0.20)
    pad = max(36, int(max(rgb.size) * effective))
    canvas = Image.new("RGBA", (rgb.width + pad * 2, rgb.height + pad * 2), NUDE)
    canvas.paste(rgb, (pad, pad))
    dest.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(dest, "PNG", optimize=True)
    return {
        "dest": str(dest.relative_to(ROOT)).replace("\\", "/"),
        "source": str(src.relative_to(ROOT)).replace("\\", "/"),
        "pad_px": pad,
        "pad_frac": round(effective, 3),
        "source_content_margin": round(m, 4),
        "size": list(canvas.size),
    }


def crop_bottle_from_lineup(
    lineup: Path,
    dest: Path,
    x0_frac: float,
    x1_frac: float,
    pad_frac: float = 0.16,
) -> dict:
    """Crop one bottle column from a multi-bottle lineup, then pad on nude."""
    with Image.open(lineup) as im:
        im.load()
        rgb = im.convert("RGB")
    w, h = rgb.size
    x0 = int(w * x0_frac)
    x1 = int(w * x1_frac)
    # Full height with small vertical inset so we don't inherit edge clips
    y0 = int(h * 0.02)
    y1 = int(h * 0.98)
    crop = rgb.crop((x0, y0, x1, y1))
    # Ensure crop isn't empty
    pad = max(28, int(max(crop.size) * pad_frac))
    canvas = Image.new("RGBA", (crop.width + pad * 2, crop.height + pad * 2), NUDE)
    canvas.paste(crop, (pad, pad))
    dest.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(dest, "PNG", optimize=True)
    return {
        "dest": str(dest.relative_to(ROOT)).replace("\\", "/"),
        "source": str(lineup.relative_to(ROOT)).replace("\\", "/"),
        "crop_frac": [x0_frac, x1_frac],
        "pad_px": pad,
        "size": list(canvas.size),
        "method": "lineup_crop",
    }


def main() -> int:
    report: dict = {"rebuilt": [], "errors": [], "variants": []}
    for item in SWAPS:
        src = find(item["source"], ORIG)
        if not src:
            report["errors"].append({"dest": item["dest"], "error": f"missing source {item['source']}"})
            continue
        dest = OUT / f"{item['dest']}.png"
        try:
            entry = paste_on_nude(src, dest, item["pad"])
            entry["dest_stem"] = item["dest"]
            entry["reason"] = (
                "sibling_swap" if item["source"] != item["dest"] else "extra_pad"
            )
            report["rebuilt"].append(entry)
            print(f"ok: {item['dest']} <- {item['source']} pad={entry['pad_frac']}", flush=True)
        except Exception as exc:  # noqa: BLE001
            report["errors"].append({"dest": item["dest"], "error": str(exc)})
            print(f"err: {item['dest']}: {exc}", flush=True)

    # Bottle variants: variants/_originals are already strip-cropped. Prefer the
    # complete multi-bottle authentic photos; customization objectPosition focuses colour.
    lineup = find("vacuum-bottle-2", ORIG) or find("vacuum-bottle-alt", ORIG)
    main_line = find("vacuum-bottle-main", ORIG)
    if lineup:
        for name in (
            "bottle-blue",
            "bottle-lilac",
            "bottle-red",
            "bottle-pink",
            "bottle-green",
        ):
            dest = VOUT / f"{name}.png"
            try:
                entry = paste_on_nude(lineup, dest, 0.16)
                entry["dest_stem"] = name
                entry["method"] = "full_lineup_for_objectPosition"
                report["variants"].append(entry)
                print(f"ok variant: {name} <- full lineup", flush=True)
            except Exception as exc:  # noqa: BLE001
                report["errors"].append({"dest": name, "error": str(exc)})
    if main_line:
        dest = VOUT / "bottle-black.png"
        try:
            entry = paste_on_nude(main_line, dest, 0.18)
            entry["dest_stem"] = "bottle-black"
            entry["method"] = "lifestyle_main_for_black"
            report["variants"].append(entry)
            print("ok variant: bottle-black <- vacuum-bottle-main", flush=True)
        except Exception as exc:  # noqa: BLE001
            report["errors"].append({"dest": "bottle-black", "error": str(exc)})

    REPORT.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(
        f"\nDone. rebuilt={len(report['rebuilt'])} variants={len(report['variants'])} errors={len(report['errors'])}",
        flush=True,
    )
    return 0 if not report["errors"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
