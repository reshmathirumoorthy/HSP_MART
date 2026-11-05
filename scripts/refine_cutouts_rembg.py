"""
Selective rembg refine for low-white products only.
Keeps existing cutout unless the new one passes a strict preserve check.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

# Reuse helpers from export script
sys.path.insert(0, str(Path(__file__).resolve().parent))
from export_transparent_cutouts import (  # noqa: E402
    ORIGINALS,
    OUT,
    VARIANT_ORIGINALS,
    VARIANT_OUT,
    dilate_alpha,
    downscale,
    fill_holes_from_original,
    finalize,
    flatten_on_white,
    border_studio_mask,
    quality_ok,
    white_product_fraction,
    MAX_PROCESS,
)

REPORT = Path(__file__).resolve().parents[1] / "scripts" / "refine_rembg_report.json"
EXTS = {".png", ".jpg", ".jpeg", ".webp"}


def refine_one(src: Path, dest: Path, session) -> dict | None:
    with Image.open(src) as im:
        im.load()
        full = flatten_on_white(im.convert("RGBA"))
    work, _ = downscale(full, MAX_PROCESS)
    wf = white_product_fraction(work)
    if wf > 0.30:
        return None  # skip white-heavy

    from rembg import remove

    rem = remove(work, session=session).convert("RGBA")
    rem = dilate_alpha(rem, radius=3)
    rem = fill_holes_from_original(rem, work)
    arr = np.array(rem)
    bg = border_studio_mask(arr)
    arr[bg, 3] = 0
    rem = Image.fromarray(arr, "RGBA")
    ok, metrics = quality_ok(rem, work)
    if not ok:
        return {"file": src.name, "status": "rejected", **metrics, "white_frac": round(wf, 3)}

    # Upscale mask to full
    mask = rem.split()[-1].resize(full.size, Image.Resampling.LANCZOS)
    full_arr = np.array(full)
    m = np.array(mask)
    full_arr[..., 3] = m
    full_arr[m < 8, :3] = 0
    out = finalize(Image.fromarray(full_arr, "RGBA"), pad_frac=0.07)
    out.save(dest, "PNG", optimize=True)
    return {
        "file": src.name,
        "status": "updated",
        **metrics,
        "white_frac": round(wf, 3),
    }


def walk(src_dir: Path, dest_dir: Path, session, report: dict) -> None:
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
            result = refine_one(src, dest, session)
            if result is None:
                print(f"skip(white): {src.name} ({i}/{len(files)})", flush=True)
                report["skipped_white"] += 1
                continue
            report["results"].append(result)
            print(
                f"{result['status']}: {src.name} preserve={result.get('preserved')} "
                f"miss={result.get('missing')} ({i}/{len(files)})",
                flush=True,
            )
            if result["status"] == "updated":
                report["updated"] += 1
            else:
                report["rejected"] += 1
        except Exception as exc:  # noqa: BLE001
            print(f"err: {src.name}: {exc}", flush=True)
            report["errors"].append({"file": src.name, "error": str(exc)})


def main() -> int:
    from rembg import new_session

    session = new_session("u2netp")
    print("rembg ready", flush=True)
    report = {
        "results": [],
        "errors": [],
        "updated": 0,
        "rejected": 0,
        "skipped_white": 0,
    }
    walk(ORIGINALS, OUT, session, report)
    if VARIANT_ORIGINALS.exists():
        walk(VARIANT_ORIGINALS, VARIANT_OUT, session, report)
    REPORT.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(
        f"\nDone. updated={report['updated']} rejected={report['rejected']} "
        f"skipped_white={report['skipped_white']} errors={len(report['errors'])}",
        flush=True,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
