"""
Conservative transparent product cutouts.

Priority: complete product > perfect background removal.
Reads _originals only; never modifies them.
"""

from __future__ import annotations

import json
import os
import sys
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
PRODUCTS = ROOT / "public" / "images" / "products"
ORIGINALS = PRODUCTS / "_originals"
OUT = PRODUCTS / "transparent"
VARIANT_ORIGINALS = PRODUCTS / "variants" / "_originals"
VARIANT_OUT = PRODUCTS / "transparent" / "variants"
REPORT = ROOT / "scripts" / "transparent_cutout_report.json"
MAX_PROCESS = 960  # rembg working size — keeps quality + speed sane
MAX_SIDE = 1600
EXTS = {".png", ".jpg", ".jpeg", ".webp"}


def flatten_on_white(rgba: Image.Image) -> Image.Image:
    flat = Image.new("RGBA", rgba.size, (255, 255, 255, 255))
    flat.alpha_composite(rgba.convert("RGBA"))
    return flat


def downscale(im: Image.Image, max_side: int) -> tuple[Image.Image, float]:
    w, h = im.size
    side = max(w, h)
    if side <= max_side:
        return im, 1.0
    scale = max_side / side
    out = im.resize((max(1, int(w * scale)), max(1, int(h * scale))), Image.Resampling.LANCZOS)
    return out, scale


def border_studio_mask(arr: np.ndarray) -> np.ndarray:
    """Border-connected pure studio white only (never interior packaging)."""
    h, w = arr.shape[:2]
    vis = np.zeros((h, w), dtype=bool)
    bg = np.zeros((h, w), dtype=bool)
    q: deque[tuple[int, int]] = deque()

    def is_studio(y: int, x: int) -> bool:
        r, g, b, a = arr[y, x]
        if a < 12:
            return True
        wh = (int(r) + int(g) + int(b)) / 3
        chroma = max(int(r), int(g), int(b)) - min(int(r), int(g), int(b))
        return wh > 248 and chroma < 12

    for x in range(w):
        q.append((0, x))
        q.append((h - 1, x))
    for y in range(h):
        q.append((y, 0))
        q.append((y, w - 1))

    while q:
        y, x = q.popleft()
        if y < 0 or y >= h or x < 0 or x >= w or vis[y, x]:
            continue
        vis[y, x] = True
        if not is_studio(y, x):
            continue
        bg[y, x] = True
        q.extend(((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)))
    return bg


def border_key(rgba: Image.Image) -> Image.Image:
    arr = np.array(rgba.convert("RGBA"))
    bg = border_studio_mask(arr)
    arr[bg, 3] = 0
    return Image.fromarray(arr, "RGBA")


def dilate_alpha(rgba: Image.Image, radius: int = 3) -> Image.Image:
    arr = np.array(rgba.convert("RGBA"))
    a = arr[..., 3]
    size = radius * 2 + 1
    grown = np.array(Image.fromarray(a, "L").filter(ImageFilter.MaxFilter(size)))
    rgb = arr[..., :3].astype(np.float32)
    need = (grown > 50) & (a < 40)
    if need.any():
        blur = np.array(
            Image.fromarray(arr[..., :3], "RGB").filter(ImageFilter.BoxBlur(2)),
            dtype=np.float32,
        )
        rgb[need] = blur[need]
        a = np.maximum(a, np.where(need, grown // 2, a))
    out = arr.copy()
    out[..., :3] = rgb.astype(np.uint8)
    out[..., 3] = a.astype(np.uint8)
    return Image.fromarray(out, "RGBA")


def fill_holes_from_original(cut: Image.Image, orig: Image.Image) -> Image.Image:
    """Restore interior transparent holes using original pixels (small images only)."""
    arr = np.array(cut.convert("RGBA"))
    oarr = np.array(orig.convert("RGBA"))
    if arr.shape != oarr.shape:
        oarr = np.array(orig.resize(cut.size, Image.Resampling.LANCZOS).convert("RGBA"))
    opaque = arr[..., 3] > 24
    h, w = opaque.shape
    # Skip expensive fill on huge frames
    if h * w > 1_200_000:
        return cut
    exterior = np.zeros((h, w), dtype=bool)
    vis = np.zeros((h, w), dtype=bool)
    q: deque[tuple[int, int]] = deque()
    for x in range(w):
        q.append((0, x))
        q.append((h - 1, x))
    for y in range(h):
        q.append((y, 0))
        q.append((y, w - 1))
    while q:
        y, x = q.popleft()
        if y < 0 or y >= h or x < 0 or x >= w or vis[y, x]:
            continue
        vis[y, x] = True
        if opaque[y, x]:
            continue
        exterior[y, x] = True
        q.extend(((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)))
    holes = (~opaque) & (~exterior)
    if not holes.any():
        return cut
    # Only restore holes that look like product (not leftover studio)
    o = oarr[holes]
    wh = o[:, :3].astype(np.float32).mean(axis=1)
    chroma = o[:, :3].max(axis=1) - o[:, :3].min(axis=1)
    restore = holes.copy()
    # Don't restore pure studio white holes at the fringe
    idx = np.where(holes)
    keep = ~((wh > 250) & (chroma < 10))
    restore[idx] = keep
    if not restore.any():
        return cut
    arr[restore] = oarr[restore]
    arr[restore, 3] = 255
    return Image.fromarray(arr, "RGBA")


def product_mask(rgba: Image.Image) -> np.ndarray:
    arr = np.array(rgba.convert("RGBA"), dtype=np.float32)
    r, g, b, a = arr[..., 0], arr[..., 1], arr[..., 2], arr[..., 3]
    wh = (r + g + b) / 3.0
    chroma = np.maximum(np.maximum(r, g), b) - np.minimum(np.minimum(r, g), b)
    studio = (wh > 242) & (chroma < 18) & (a > 200)
    return (~studio) & (a > 20)


def white_product_fraction(rgba: Image.Image) -> float:
    """How much of the non-studio-corner product region is itself near-white."""
    arr = np.array(rgba.convert("RGBA"), dtype=np.float32)
    r, g, b, a = arr[..., 0], arr[..., 1], arr[..., 2], arr[..., 3]
    wh = (r + g + b) / 3.0
    chroma = np.maximum(np.maximum(r, g), b) - np.minimum(np.minimum(r, g), b)
    # Exclude border band
    h, w = a.shape
    band = max(4, int(min(h, w) * 0.04))
    inner = np.ones((h, w), dtype=bool)
    inner[:band, :] = False
    inner[-band:, :] = False
    inner[:, :band] = False
    inner[:, -band:] = False
    body = inner & (a > 20)
    if not body.any():
        return 0.0
    near_white = body & (wh > 230) & (chroma < 30)
    return float(near_white.sum() / body.sum())


def quality_ok(cut: Image.Image, orig: Image.Image) -> tuple[bool, dict]:
    """Spatially aligned check — both must be same size."""
    if cut.size != orig.size:
        cut = cut.resize(orig.size, Image.Resampling.BILINEAR)
    om = product_mask(orig)
    cm = np.array(cut.convert("RGBA"))[..., 3] > 24
    orig_n = max(1, int(om.sum()))
    preserved = float((cm & om).sum() / orig_n)
    missing = float((om & ~cm).sum() / orig_n)
    # Quick hole estimate on downscaled mask
    small = Image.fromarray((cm.astype(np.uint8) * 255), "L").resize((160, 160), Image.Resampling.NEAREST)
    sm = np.array(small) > 127
    hole = 0.0
    ys, xs = np.where(sm)
    if len(xs):
        y0, y1 = int(ys.min()), int(ys.max())
        x0, x1 = int(xs.min()), int(xs.max())
        region = sm[y0 : y1 + 1, x0 : x1 + 1]
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
        hole = float((inv & ~vis).sum() / max(1, region.size))
    metrics = {
        "preserved": round(preserved, 3),
        "missing": round(missing, 3),
        "holes": round(hole, 4),
    }
    ok = preserved >= 0.80 and missing <= 0.20 and hole <= 0.04
    return ok, metrics


def finalize(cutout: Image.Image, pad_frac: float = 0.06) -> Image.Image:
    bbox = cutout.getbbox()
    if bbox:
        w0, h0 = cutout.size
        x0, y0, x1, y1 = bbox
        margin = max(4, int(max(w0, h0) * 0.015))
        cutout = cutout.crop(
            (max(0, x0 - margin), max(0, y0 - margin), min(w0, x1 + margin), min(h0, y1 + margin))
        )
    w, h = cutout.size
    side = max(w, h)
    if side > MAX_SIDE:
        scale = MAX_SIDE / side
        cutout = cutout.resize(
            (max(1, int(w * scale)), max(1, int(h * scale))),
            Image.Resampling.LANCZOS,
        )
    pad = max(10, int(max(cutout.size) * pad_frac))
    canvas = Image.new("RGBA", (cutout.width + pad * 2, cutout.height + pad * 2), (0, 0, 0, 0))
    canvas.alpha_composite(cutout, (pad, pad))
    return canvas


def process_one(src: Path, dest: Path, session) -> dict:
    with Image.open(src) as im:
        im.load()
        full = flatten_on_white(im.convert("RGBA"))

    work, _ = downscale(full, MAX_PROCESS)
    white_frac = white_product_fraction(work)
    method = "fallback_original"
    metrics: dict = {}
    used_fallback = False
    cut = full  # default: complete original photo

    # Mass check: border-key / rembg must not erase large opaque regions
    # (critical for white paper products where "product_mask" ignores whites).
    def mass_ok(candidate: Image.Image, source: Image.Image) -> bool:
        c = np.array(candidate.convert("RGBA"))[..., 3] > 24
        s = np.array(source.convert("RGBA"))[..., 3] > 24
        # Also count near-white opaque pixels in source as product mass
        sarr = np.array(source.convert("RGBA"))
        s_mass = int(s.sum())
        c_mass = int(c.sum())
        if s_mass < 50:
            return False
        return (c_mass / s_mass) >= 0.90

    # White / paper-heavy products: NEVER key or rembg — keep original plate.
    if white_frac > 0.18:
        cut = full
        method = "fallback_original"
        used_fallback = True
        metrics = {"preserved": 1.0, "missing": 0.0, "holes": 0.0, "fallback": True}
    else:
        use_rembg = (
            session is not None
            and white_frac <= 0.18
            and os.environ.get("HSP_USE_REMBG", "0") == "1"
        )
        chosen = None
        if use_rembg:
            from rembg import remove

            rem = remove(work, session=session).convert("RGBA")
            rem = dilate_alpha(rem, radius=3)
            rem = fill_holes_from_original(rem, work)
            arr = np.array(rem)
            bg = border_studio_mask(arr)
            arr[bg, 3] = 0
            rem = Image.fromarray(arr, "RGBA")
            ok, metrics = quality_ok(rem, work)
            if ok and mass_ok(rem, work):
                chosen = ("rembg_conservative", rem, metrics)

        if chosen is None:
            border = border_key(work)
            ok2, metrics2 = quality_ok(border, work)
            if ok2 and metrics2["preserved"] >= 0.95 and mass_ok(border, work):
                chosen = ("border_key", border, metrics2)

        if chosen is not None:
            method, cut_small, metrics = chosen
            if work.size != full.size:
                mask = cut_small.split()[-1].resize(full.size, Image.Resampling.LANCZOS)
                full_arr = np.array(full)
                m = np.array(mask)
                full_arr[..., 3] = m
                full_arr[m < 8, :3] = 0
                cut = Image.fromarray(full_arr, "RGBA")
            else:
                cut = cut_small
        else:
            cut = full
            method = "fallback_original"
            used_fallback = True
            metrics = {"preserved": 1.0, "missing": 0.0, "holes": 0.0, "fallback": True}

    out = finalize(cut, pad_frac=0.05 if used_fallback else 0.07)
    dest.parent.mkdir(parents=True, exist_ok=True)
    out.save(dest, "PNG", optimize=True)
    return {
        "file": str(src.relative_to(ROOT)).replace("\\", "/"),
        "out": str(dest.relative_to(ROOT)).replace("\\", "/"),
        "method": method,
        "fallback": used_fallback,
        "white_frac": round(white_frac, 3),
        **metrics,
    }


def process_dir(src_dir: Path, dest_dir: Path, session, report: dict) -> None:
    files = sorted(
        p
        for p in src_dir.iterdir()
        if p.is_file() and p.suffix.lower() in EXTS and not p.name.startswith(".")
    )
    for i, src in enumerate(files, 1):
        dest = dest_dir / f"{src.stem}.png"
        try:
            entry = process_one(src, dest, session)
            report["exported"].append(entry)
            tag = "FALLBACK" if entry.get("fallback") else "ok"
            print(
                f"{tag}: {src.name} [{entry['method']}] "
                f"preserve={entry.get('preserved')} white={entry.get('white_frac')} "
                f"({i}/{len(files)})",
                flush=True,
            )
        except Exception as exc:  # noqa: BLE001
            report["errors"].append({"file": src.name, "error": str(exc)})
            print(f"err: {src.name}: {exc}", file=sys.stderr, flush=True)
            try:
                with Image.open(src) as im:
                    im.load()
                    out = finalize(flatten_on_white(im.convert("RGBA")), pad_frac=0.05)
                    out.save(dest, "PNG", optimize=True)
                    report["exported"].append(
                        {"file": src.name, "out": str(dest), "method": "fallback_error", "fallback": True}
                    )
                    print(f"FALLBACK(error): {src.name}", flush=True)
            except Exception as exc2:  # noqa: BLE001
                print(f"fatal: {src.name}: {exc2}", file=sys.stderr, flush=True)


def main() -> int:
    if not ORIGINALS.exists():
        print(f"Missing originals: {ORIGINALS}", file=sys.stderr)
        return 1

    session = None
    model = None
    try:
        from rembg import new_session

        session = new_session("u2netp")
        model = "u2netp"
        print("rembg session ready (u2netp)", flush=True)
    except Exception as exc:  # noqa: BLE001
        print(f"rembg unavailable ({exc}); gentle/original only", flush=True)

    report: dict = {"exported": [], "errors": [], "rembg": session is not None, "model": model}
    process_dir(ORIGINALS, OUT, session, report)
    if VARIANT_ORIGINALS.exists():
        process_dir(VARIANT_ORIGINALS, VARIANT_OUT, session, report)

    REPORT.write_text(json.dumps(report, indent=2), encoding="utf-8")
    fallbacks = sum(1 for e in report["exported"] if e.get("fallback"))
    print(
        f"\nDone. exported={len(report['exported'])} fallbacks={fallbacks} "
        f"errors={len(report['errors'])} report={REPORT}",
        flush=True,
    )
    return 0 if not report["errors"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
