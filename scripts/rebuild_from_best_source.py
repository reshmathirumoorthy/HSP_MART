"""
Rebuild product display assets for full visibility in square cards.

- Reads only from _originals/ (never modifies them)
- Writes opaque RGB plates onto nude-beige #E5D8C7 with generous padding
  so diagonal / edge-to-edge products are not clipped by object-fit: contain
- No rembg / flood-fill that can erase white packaging
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ORIG = ROOT / "public" / "images" / "products" / "_originals"
OUT = ROOT / "public" / "images" / "products" / "transparent"
VORIG = ROOT / "public" / "images" / "products" / "variants" / "_originals"
VOUT = ROOT / "public" / "images" / "products" / "transparent" / "variants"
REPORT = ROOT / "scripts" / "rebuild_best_source_report.json"
EXTS = {".png", ".jpg", ".jpeg", ".webp"}
NUDE = (0xE5, 0xD8, 0xC7, 255)
# Generous pad: product content stays inside card inset + border-radius
PAD_FRAC = 0.12


def restore_one(src: Path, dest: Path) -> dict:
    with Image.open(src) as im:
        im.load()
        rgba = im.convert("RGBA")
    flat = Image.new("RGBA", rgba.size, (255, 255, 255, 255))
    flat.alpha_composite(rgba)
    rgb = flat.convert("RGB")
    pad = max(28, int(max(rgb.size) * PAD_FRAC))
    canvas = Image.new("RGBA", (rgb.width + pad * 2, rgb.height + pad * 2), NUDE)
    canvas.paste(rgb, (pad, pad))
    dest.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(dest, "PNG", optimize=True)
    return {
        "file": src.name,
        "out": str(dest.relative_to(ROOT)).replace("\\", "/"),
        "method": "opaque_original_on_nude",
        "pad": pad,
        "size": list(canvas.size),
    }


def walk(src_dir: Path, dest_dir: Path, report: dict) -> None:
    if not src_dir.exists():
        return
    files = sorted(
        p
        for p in src_dir.iterdir()
        if p.is_file() and p.suffix.lower() in EXTS and not p.name.startswith(".")
    )
    for i, src in enumerate(files, 1):
        dest = dest_dir / f"{src.stem}.png"
        try:
            entry = restore_one(src, dest)
            report["exported"].append(entry)
            if i % 20 == 0 or i == len(files):
                print(f"ok: {i}/{len(files)}", flush=True)
        except Exception as exc:  # noqa: BLE001
            print(f"err: {src.name}: {exc}", file=sys.stderr, flush=True)
            report["errors"].append({"file": src.name, "error": str(exc)})


def main() -> int:
    if not ORIG.exists():
        print(f"Missing originals: {ORIG}", file=sys.stderr)
        return 1
    report: dict = {"exported": [], "errors": [], "pad_frac": PAD_FRAC}
    walk(ORIG, OUT, report)
    if VORIG.exists():
        walk(VORIG, VOUT, report)
    REPORT.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(
        f"\nDone. exported={len(report['exported'])} errors={len(report['errors'])}",
        flush=True,
    )
    return 0 if not report["errors"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
