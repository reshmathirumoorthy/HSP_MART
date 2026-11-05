from __future__ import annotations

from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image
from rembg import new_session, remove

ROOT = Path(__file__).resolve().parents[1]
ORIG = ROOT / "public" / "images" / "products" / "_originals"
OUT = ROOT / "public" / "images" / "products" / "transparent"
QA = ROOT / "qa-screenshots"
NUDE = (0xE5, 0xD8, 0xC7, 255)


def edge_white_punch(rgba: Image.Image) -> Image.Image:
    arr = np.array(rgba.convert("RGBA"), dtype=np.int16)
    h, w, _ = arr.shape
    vis = np.zeros((h, w), dtype=bool)
    bg = np.zeros((h, w), dtype=bool)
    q: deque[tuple[int, int]] = deque()

    def is_bg(y: int, x: int) -> bool:
        r, g, b, a = arr[y, x]
        if a < 8:
            return True
        mx = max(int(r), int(g), int(b))
        mn = min(int(r), int(g), int(b))
        chroma = mx - mn
        wh = (int(r) + int(g) + int(b)) / 3
        return wh > 225 and chroma < 28

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
        if not is_bg(y, x):
            vis[y, x] = True
            continue
        vis[y, x] = True
        bg[y, x] = True
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            q.append((y + dy, x + dx))

    out = arr.astype(np.uint8)
    out[bg, 3] = 0
    a = out[..., 3].astype(np.float32)
    rgb = out[..., :3].astype(np.float32)
    wh = rgb.mean(axis=2)
    fringe = (a > 0) & (a < 220) & (wh > 215)
    a[fringe] *= 0.25
    out[..., 3] = a.astype(np.uint8)
    return Image.fromarray(out, "RGBA")


def finalize(cutout: Image.Image) -> Image.Image:
    bbox = cutout.getbbox()
    if not bbox:
        return cutout
    cutout = cutout.crop(bbox)
    pad = max(4, int(max(cutout.size) * 0.04))
    canvas = Image.new(
        "RGBA",
        (cutout.width + pad * 2, cutout.height + pad * 2),
        (0, 0, 0, 0),
    )
    canvas.alpha_composite(cutout, (pad, pad))
    return canvas


def main() -> None:
    QA.mkdir(exist_ok=True)
    session = new_session("u2netp")
    for name in ("note-book-set-main.png", "note-book-set-2.png"):
        src = ORIG / name
        with Image.open(src) as im:
            rgba = im.convert("RGBA")
            flat = Image.new("RGBA", rgba.size, (255, 255, 255, 255))
            flat.alpha_composite(rgba)
            cut = remove(flat, session=session).convert("RGBA")
            cut = edge_white_punch(cut)
            cut = finalize(cut)
            cut.save(OUT / name, "PNG", optimize=True)
            prev = Image.new("RGBA", cut.size, NUDE)
            prev.alpha_composite(cut)
            prev.convert("RGB").save(QA / f"nude2-{name.replace('.png', '.jpg')}", quality=92)
            a = np.array(cut)
            nw = (
                (a[..., 3] > 200)
                & (a[..., 0] > 240)
                & (a[..., 1] > 240)
                & (a[..., 2] > 240)
            ).mean()
            print(name, cut.size, "near_white_opaque%", round(float(nw) * 100, 2))


if __name__ == "__main__":
    main()
