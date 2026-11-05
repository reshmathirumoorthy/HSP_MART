"""
Isolate product photos and composite them onto a uniform sage background.

Backs up originals to public/images/products/_originals/, then overwrites
each asset with a seamless sage composition matching #9DBD8C.
"""

from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PRODUCTS = ROOT / "public" / "images" / "products"
BACKUP = PRODUCTS / "_originals"
SAGE = (0x9D, 0xBD, 0x8C, 255)
PAD_RATIO = 0.12  # breathing room around the product
MAX_SIDE = 1400
REPORT = ROOT / "scripts" / "sage_compose_report.json"

EXTS = {".png", ".jpg", ".jpeg", ".webp"}


def corner_stats(im: Image.Image) -> tuple[tuple[float, float, float], float]:
    rgba = im.convert("RGBA")
    w, h = rgba.size
    corners = [
        rgba.getpixel((2, 2)),
        rgba.getpixel((w - 3, 2)),
        rgba.getpixel((2, h - 3)),
        rgba.getpixel((w - 3, h - 3)),
    ]
    avg = tuple(sum(c[i] for c in corners) / 4 for i in range(3))
    aavg = sum(c[3] for c in corners) / 4
    return avg, aavg  # type: ignore[return-value]


def is_near_white(rgb: tuple[float, float, float], threshold: int = 242) -> bool:
    return all(c >= threshold for c in rgb)


def already_has_alpha(im: Image.Image, aavg: float) -> bool:
    return im.mode in ("RGBA", "LA") and aavg < 200


def soft_white_mask(rgba: Image.Image) -> Image.Image:
    """Fallback when rembg is unavailable: soft-key near-white pixels."""
    try:
        import numpy as np

        arr = np.array(rgba, dtype=np.float32)
        r, g, b, a = arr[..., 0], arr[..., 1], arr[..., 2], arr[..., 3]
        mx = np.maximum(np.maximum(r, g), b)
        mn = np.minimum(np.minimum(r, g), b)
        chroma = mx - mn
        whiteness = (r + g + b) / 3.0
        hard = (whiteness > 248) & (chroma < 12)
        soft = (whiteness > 238) & (chroma < 18) & ~hard
        new_a = a.copy()
        new_a[hard] = 0
        soft_alpha = np.clip((248 - whiteness[soft]) * 25, 0, 255)
        new_a[soft] = np.minimum(a[soft], soft_alpha)
        arr[..., 3] = new_a
        return Image.fromarray(arr.astype(np.uint8), "RGBA")
    except ImportError:
        # Slow PIL path
        pixels = rgba.load()
        w, h = rgba.size
        out = rgba.copy()
        out_px = out.load()
        for y in range(h):
            for x in range(w):
                r, g, b, a = pixels[x, y]
                if a == 0:
                    continue
                mx = max(r, g, b)
                mn = min(r, g, b)
                chroma = mx - mn
                whiteness = (r + g + b) / 3
                if whiteness > 248 and chroma < 12:
                    out_px[x, y] = (r, g, b, 0)
                elif whiteness > 238 and chroma < 18:
                    alpha = int(max(0, min(255, (248 - whiteness) * 25)))
                    out_px[x, y] = (r, g, b, min(a, alpha))
        return out


def has_large_white_interior(rgba: Image.Image, fraction: float = 0.12) -> bool:
    """Detect baked-in white photo rectangles even when outer corners are transparent."""
    try:
        import numpy as np

        arr = np.array(rgba.convert("RGBA"))
        h, w = arr.shape[:2]
        c = arr[h // 4 : 3 * h // 4, w // 4 : 3 * w // 4]
        white = (
            (c[..., 0] > 245)
            & (c[..., 1] > 245)
            & (c[..., 2] > 245)
            & (c[..., 3] > 200)
        ).mean()
        return float(white) > fraction
    except Exception:  # noqa: BLE001
        return False


def remove_background(im: Image.Image, session) -> Image.Image | None:
    rgba = im.convert("RGBA")
    avg, aavg = corner_stats(rgba)
    # Transparent corners alone are not enough — white photo boxes may remain inside
    if already_has_alpha(rgba, aavg) and not has_large_white_interior(rgba):
        return rgba
    if session is not None and (
        has_large_white_interior(rgba) or not is_near_white(avg, threshold=235)
    ):
        from rembg import remove

        return remove(rgba, session=session).convert("RGBA")
    # Prefer fast soft-key for clean white/near-white studio shots
    if is_near_white(avg, threshold=235) or already_has_alpha(rgba, aavg):
        return soft_white_mask(rgba)
    # Non-white baked background without rembg — leave flagged
    return None


def trim_alpha(rgba: Image.Image, pad: int = 2) -> Image.Image:
    bbox = rgba.getbbox()
    if not bbox:
        return rgba
    l, t, r, b = bbox
    l = max(0, l - pad)
    t = max(0, t - pad)
    r = min(rgba.width, r + pad)
    b = min(rgba.height, b + pad)
    return rgba.crop((l, t, r, b))


def composite_on_sage(cutout: Image.Image) -> Image.Image:
    cutout = trim_alpha(cutout)
    cw, ch = cutout.size
    side = max(cw, ch)
    pad = int(side * PAD_RATIO)
    canvas_side = side + pad * 2
    # Scale down very large canvases
    scale = 1.0
    if canvas_side > MAX_SIDE:
        scale = MAX_SIDE / canvas_side
        canvas_side = MAX_SIDE
        nw = max(1, int(cw * scale))
        nh = max(1, int(ch * scale))
        cutout = cutout.resize((nw, nh), Image.Resampling.LANCZOS)
        cw, ch = cutout.size

    canvas = Image.new("RGBA", (canvas_side, canvas_side), SAGE)
    x = (canvas_side - cw) // 2
    y = (canvas_side - ch) // 2
    canvas.alpha_composite(cutout, (x, y))
    return canvas.convert("RGB")


def save_image(rgb: Image.Image, dest: Path) -> None:
    ext = dest.suffix.lower()
    if ext in {".jpg", ".jpeg"}:
        rgb.save(dest, "JPEG", quality=92, optimize=True)
    elif ext == ".webp":
        rgb.save(dest, "WEBP", quality=90, method=4)
    else:
        # Flatten to RGB PNG (no transparency — sage is baked in)
        rgb.save(dest, "PNG", optimize=True)


def main() -> int:
    PRODUCTS.mkdir(parents=True, exist_ok=True)
    BACKUP.mkdir(parents=True, exist_ok=True)

    session = None
    rembg_ok = False
    # Prefer lightweight u2netp (~4.7MB) over u2net (~176MB)
    for model_name in ("u2netp", "u2net"):
        try:
            from rembg import new_session

            session = new_session(model_name)
            rembg_ok = True
            print(f"rembg session ready ({model_name})")
            break
        except Exception as exc:  # noqa: BLE001
            print(f"rembg model {model_name} unavailable ({exc})")
    if not rembg_ok:
        print("rembg unavailable; using soft white-key for white backgrounds only")

    files = sorted(
        p
        for p in PRODUCTS.iterdir()
        if p.is_file() and p.suffix.lower() in EXTS and not p.name.startswith(".")
    )
    report: dict = {
        "sage": "#9DBD8C",
        "rembg": rembg_ok,
        "processed": [],
        "skipped_already_sage": [],
        "needs_manual": [],
        "errors": [],
    }

    for path in files:
        try:
            # Skip if already backed up and we're re-running from backup? Always
            # process from backup if present so re-runs are idempotent.
            backup_path = BACKUP / path.name
            if not backup_path.exists():
                shutil.copy2(path, backup_path)

            # Skip if the live asset is already composited onto sage
            with Image.open(path) as current:
                cur_avg, cur_a = corner_stats(current)
                if (
                    abs(cur_avg[0] - SAGE[0]) < 8
                    and abs(cur_avg[1] - SAGE[1]) < 8
                    and abs(cur_avg[2] - SAGE[2]) < 8
                    and cur_a > 250
                    and "--force" not in sys.argv
                ):
                    report["skipped_already_sage"].append(path.name)
                    print(f"skip (already sage): {path.name}")
                    continue

            source = backup_path
            with Image.open(source) as im:
                im.load()
                avg, aavg = corner_stats(im)

                cutout = remove_background(im, session)
                if cutout is None:
                    report["needs_manual"].append(
                        {
                            "file": path.name,
                            "reason": "non-white baked background; rembg unavailable",
                            "corner_rgb": [int(c) for c in avg],
                        }
                    )
                    print(f"manual: {path.name}")
                    continue

                composed = composite_on_sage(cutout)
                save_image(composed, path)
                report["processed"].append(path.name)
                print(f"ok: {path.name}")
        except Exception as exc:  # noqa: BLE001
            report["errors"].append({"file": path.name, "error": str(exc)})
            print(f"err: {path.name}: {exc}", file=sys.stderr)

    REPORT.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(
        f"\nDone. processed={len(report['processed'])} "
        f"manual={len(report['needs_manual'])} "
        f"errors={len(report['errors'])} "
        f"report={REPORT}"
    )
    return 0 if not report["errors"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
