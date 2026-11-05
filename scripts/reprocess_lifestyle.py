"""Re-isolate stubborn lifestyle/studio shots onto sage using rembg + edge color key."""

from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image
from rembg import new_session, remove

ROOT = Path(__file__).resolve().parents[1]
PRODUCTS = ROOT / "public" / "images" / "products"
BACKUP = PRODUCTS / "_originals"
SAGE = (0x9D, 0xBD, 0x8C, 255)
PAD_RATIO = 0.12
MAX_SIDE = 1400

TARGETS = [
    "a5-fancy-magnetic-notebook-2.jpg",
    "a5-fancy-magnetic-notebook-3.jpg",
    "a5-fancy-magnetic-notebook-4.jpg",
    "a5-fancy-magnetic-notebook-main.jpg",
    "desk-fan-organizer-2.jpg",
    "desk-fan-organizer-3.jpg",
    "desk-fan-organizer-main.jpg",
    "report-file-5.jpg",
    "report-file-main.jpg",
    "harry-potter-quill-2.jpg",
    "harry-potter-quill-3.jpg",
    "lotus-spiral-pad-2.jpg",
    "lotus-spiral-pad-3.jpg",
    "lotus-spiral-pad-4.jpg",
    "lotus-spiral-pad-main.jpg",
    "lotus-register.jpg",
    "kk-gel-pen-2.png",
    "button-folder-3.webp",
    "button-folder-4.webp",
    "button-folder-5.webp",
    "ring-binder-3.webp",
    "ring-binder-main.webp",
    "spring-action-file-2.webp",
    "spring-action-file-main.webp",
    "visiting-card-sleeves-4.webp",
    "visiting-card-sleeves-main.webp",
    "expanding-file-4.webp",
]


def edge_color_key(rgba: Image.Image, tol: float = 38.0) -> np.ndarray:
    """Mask pixels similar to sampled edge colours (studio walls/floors)."""
    arr = np.array(rgba.convert("RGB"), dtype=np.float32)
    h, w, _ = arr.shape
    band = max(2, min(h, w) // 40)
    samples = np.concatenate(
        [
            arr[:band].reshape(-1, 3),
            arr[-band:].reshape(-1, 3),
            arr[:, :band].reshape(-1, 3),
            arr[:, -band:].reshape(-1, 3),
        ],
        axis=0,
    )
    # Cluster-ish: use unique-ish quantised colours
    q = (samples / 16).astype(np.int32)
    # pick up to 6 most common edge colours
    keys, counts = np.unique(q, axis=0, return_counts=True)
    order = np.argsort(-counts)[:6]
    seeds = (keys[order].astype(np.float32) * 16) + 8
    dist = np.min(
        np.sqrt(((arr[:, :, None, :] - seeds[None, None, :, :]) ** 2).sum(axis=3)),
        axis=2,
    )
    return dist < tol


def compose(cutout: Image.Image) -> Image.Image:
    bbox = cutout.getbbox()
    if bbox:
        cutout = cutout.crop(bbox)
    cw, ch = cutout.size
    side = max(cw, ch)
    pad = int(side * PAD_RATIO)
    canvas_side = side + pad * 2
    if canvas_side > MAX_SIDE:
        scale = MAX_SIDE / canvas_side
        canvas_side = MAX_SIDE
        cutout = cutout.resize(
            (max(1, int(cw * scale)), max(1, int(ch * scale))),
            Image.Resampling.LANCZOS,
        )
        cw, ch = cutout.size
    canvas = Image.new("RGBA", (canvas_side, canvas_side), SAGE)
    canvas.alpha_composite(cutout, ((canvas_side - cw) // 2, (canvas_side - ch) // 2))
    return canvas.convert("RGB")


def save(rgb: Image.Image, dest: Path) -> None:
    ext = dest.suffix.lower()
    if ext in {".jpg", ".jpeg"}:
        rgb.save(dest, "JPEG", quality=92, optimize=True)
    elif ext == ".webp":
        rgb.save(dest, "WEBP", quality=90, method=4)
    else:
        rgb.save(dest, "PNG", optimize=True)


def main() -> None:
    session = new_session("u2netp")
    notes: list[str] = []
    for name in TARGETS:
        src = BACKUP / name if (BACKUP / name).exists() else PRODUCTS / name
        if not src.exists():
            notes.append(f"missing:{name}")
            continue
        with Image.open(src) as im:
            rgba = im.convert("RGBA")
            cut = remove(rgba, session=session).convert("RGBA")
            arr = np.array(cut)
            key = edge_color_key(rgba, tol=36)
            # Only punch through where rembg was uncertain OR edge-similar
            uncertain = arr[..., 3] < 220
            punch = key & (uncertain | (arr[..., 3] > 200))
            # Stronger: if edge colour matches, remove unless rembg is very confident product
            punch = key & (arr[..., 3] < 245)
            arr[punch, 3] = 0
            cut2 = Image.fromarray(arr, "RGBA")
            coverage = float((np.array(cut2)[..., 3] > 10).mean())
            if coverage < 0.02:
                cut2 = cut
                notes.append(f"fallback-rembg:{name}")
            composed = compose(cut2)
            save(composed, PRODUCTS / name)
            print(f"ok {name} coverage={coverage:.3f}")
    print("notes", notes)


if __name__ == "__main__":
    main()
