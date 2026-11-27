"""Hamper fit and packing engine — authoritative server copy of src/lib/hamperPacking.ts.

Both are checked against e2e/fixtures/hamper-fit-cases.json. Units: integer mm and g (ISO 80000);
sizes are length × breadth × height (ISO 3394). Axes: x along length, y along breadth, z up.
"""
from __future__ import annotations

import math

DEFAULT_PADDING_MM = 10
DEFAULT_MAX_FILL_PERCENT = 85
MIN_SUPPORT = 0.6


def usable_size(box: dict) -> dict:
    pad = box.get("paddingMm", DEFAULT_PADDING_MM)
    return {k: max(0, box[k] - 2 * pad) for k in ("lengthMm", "breadthMm", "heightMm")}


def rotations(item: dict) -> list[tuple[int, int, int]]:
    l, b, h = item["lengthMm"], item["breadthMm"], item["heightMm"]
    if item.get("orientation") == "upright":
        cands = [(l, b, h), (b, l, h)]
    else:
        cands = [(l, b, h), (b, l, h), (l, h, b), (h, l, b), (b, h, l), (h, b, l)]
    out = []
    for c in cands:
        if c not in out:
            out.append(c)
    return out


def fits_alone(item: dict, box: dict) -> str:
    u = usable_size(box)
    rs = rotations(item)
    if any(l <= u["lengthMm"] and b <= u["breadthMm"] and h <= u["heightMm"] for l, b, h in rs):
        return "ok"
    if item.get("orientation") == "upright" and any(l <= u["lengthMm"] and b <= u["breadthMm"] for l, b, _ in rs):
        return "too_tall"
    return "too_large"


def _overlap(a0, a1, b0, b1):
    return max(0, min(a1, b1) - max(a0, b0))


def _sorted(items: list[dict]):
    counts: dict[str, int] = {}
    tagged = []
    for it in items:
        idx = counts.get(it["productId"], 0)
        counts[it["productId"]] = idx + 1
        tagged.append((it, idx))

    def key(t):
        it, idx = t
        dims = sorted((it["lengthMm"], it["breadthMm"], it["heightMm"]), reverse=True)
        return (int(bool(it.get("fragile"))), -(it["lengthMm"] * it["breadthMm"] * it["heightMm"]),
                -(dims[0] * dims[1]), -it["weightG"], it["productId"], idx)

    return sorted(tagged, key=key)


def pack(items: list[dict], box: dict) -> tuple[list[dict], list[str]]:
    u = usable_size(box)
    placed: list[dict] = []
    unplaced: list[str] = []
    points: list[tuple[int, int, int]] = [(0, 0, 0)]
    for it, idx in _sorted(items):
        chosen = None
        for x, y, z in sorted(points, key=lambda p: (p[2], p[1], p[0])):
            for l, b, h in rotations(it):
                if x + l > u["lengthMm"] or y + b > u["breadthMm"] or z + h > u["heightMm"]:
                    continue
                collides, supported, on_fragile = False, 0, False
                for p in placed:
                    ox = _overlap(x, x + l, p["x"], p["x"] + p["l"])
                    oy = _overlap(y, y + b, p["y"], p["y"] + p["b"])
                    if ox > 0 and oy > 0 and _overlap(z, z + h, p["z"], p["z"] + p["h"]) > 0:
                        collides = True
                        break
                    if z > 0 and p["z"] + p["h"] == z and ox > 0 and oy > 0:
                        supported += ox * oy
                        on_fragile = on_fragile or p["_fragile"]
                if collides or on_fragile or (z > 0 and supported < MIN_SUPPORT * l * b):
                    continue
                chosen = {"productId": it["productId"], "index": idx, "x": x, "y": y, "z": z, "l": l, "b": b, "h": h}
                break
            if chosen:
                break
        if not chosen:
            unplaced.append(it["productId"])
            continue
        placed.append({**chosen, "_fragile": bool(it.get("fragile"))})
        x, y, z, l, b, h = (chosen[k] for k in ("x", "y", "z", "l", "b", "h"))
        points = [p for p in points if p != (x, y, z)]
        for p in ((x + l, y, z), (x, y + b, z), (x, y, z + h)):
            if p not in points:
                points.append(p)
    return [{k: v for k, v in p.items() if k != "_fragile"} for p in placed], unplaced


def evaluate_fit(items: list[dict], box: dict) -> dict:
    u = usable_size(box)
    capacity = u["lengthMm"] * u["breadthMm"] * u["heightMm"]
    used = sum(i["lengthMm"] * i["breadthMm"] * i["heightMm"] for i in items)
    weight = sum(i["weightG"] for i in items)
    reasons: list[str] = []
    oversized: list[str] = []
    worst = "ok"
    for it in items:
        f = fits_alone(it, box)
        if f != "ok":
            if it["productId"] not in oversized:
                oversized.append(it["productId"])
            if worst != "too_large":
                worst = f
    if worst != "ok":
        reasons.append(worst)
    if capacity == 0 or used * 100 > capacity * box.get("maxFillPercent", DEFAULT_MAX_FILL_PERCENT):
        reasons.append("over_volume")
    if weight > box["maxLoadG"]:
        reasons.append("over_weight")
    placements, unplaced = pack(items, box)
    if unplaced and "too_large" not in reasons and "too_tall" not in reasons:
        reasons.append("cannot_pack")
    return {
        "ok": not reasons, "reasons": reasons, "oversized": oversized,
        "fillPercent": math.floor(used * 1000 / capacity + 0.5) / 10 if capacity else 0,  # same rounding as JS Math.round
        "volumeUsedMm3": used, "volumeCapacityMm3": capacity, "weightG": weight, "maxLoadG": box["maxLoadG"],
        "usable": u, "placements": placements, "unplaced": unplaced,
    }


# ── Readiness for the hamper builder (used by the catalogue and by checkout) ──

FACES = ("front", "back", "left", "right", "top", "bottom")
REQUIRED_FACES = {"box": FACES, "round": ("front", "back", "left", "right", "top")}


def model_missing(row: dict) -> list[str]:
    """What still stops a product or box from being used in the hamper builder (empty = ready)."""
    missing = [label for col, label in (("length_mm", "length"), ("breadth_mm", "breadth"), ("height_mm", "height"),
                                         ("weight_g", "weight")) if not row.get(col)]
    if row.get("packing_kind") == "hamper_box" and not row.get("max_load_g"):
        missing.append("maximum load")
    content = row.get("content") or {}
    if row.get("packing_kind") != "hamper_box" and not content.get("hamperImage"):
        missing.append("2D photo")
    m = content.get("model3d")
    if not m:
        missing.append("3D model")
    elif m.get("kind") == "photos":
        missing += [f"{f} photo" for f in REQUIRED_FACES.get(m.get("shape"), FACES) if not (m.get("faces") or {}).get(f)]
    return missing
