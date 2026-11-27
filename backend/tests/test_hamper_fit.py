"""Hamper fit/packing engine: fixture cases, packing invariants, speed, and exact parity with the TypeScript copy."""
import json
import shutil
import subprocess
import time
from pathlib import Path

import pytest

from app.services.hamper_fit import evaluate_fit, rotations

ROOT = Path(__file__).resolve().parents[2]
FX = json.loads((ROOT / "e2e/fixtures/hamper-fit-cases.json").read_text())


def _invariants(res, items, box):
    pad = box.get("paddingMm", 10)
    L, B, H = box["lengthMm"] - 2 * pad, box["breadthMm"] - 2 * pad, box["heightMm"] - 2 * pad
    by_id = {i["productId"]: i for i in items}
    ps = res["placements"]
    for n, p in enumerate(ps):
        assert 0 <= p["x"] and p["x"] + p["l"] <= L and 0 <= p["y"] and p["y"] + p["b"] <= B and 0 <= p["z"] and p["z"] + p["h"] <= H
        it = by_id[p["productId"]]
        assert (p["l"], p["b"], p["h"]) in rotations(it)
        if it.get("orientation") == "upright":
            assert p["h"] == it["heightMm"]
        for q in ps[n + 1:]:
            ov = lambda a0, a1, b0, b1: min(a1, b1) - max(a0, b0) > 0
            assert not (ov(p["x"], p["x"] + p["l"], q["x"], q["x"] + q["l"]) and ov(p["y"], p["y"] + p["b"], q["y"], q["y"] + q["b"])
                        and ov(p["z"], p["z"] + p["h"], q["z"], q["z"] + q["h"]))


@pytest.mark.parametrize("case", FX["cases"], ids=[c["id"] for c in FX["cases"]])
def test_fixture_case(case):
    box, items = FX["boxes"][case["box"]], [FX["items"][k] for k in case["items"]]
    r, e = evaluate_fit(items, box), case["expect"]
    assert r["ok"] == e["ok"] and r["reasons"] == e["reasons"]
    for k in ("fillPercent", "weightG", "oversized"):
        if k in e:
            assert r[k] == e[k]
    if "placed" in e:
        assert len(r["placements"]) == e["placed"]
    _invariants(r, items, box)
    assert evaluate_fit(items, box) == r  # deterministic


def test_thirty_items_fast():
    pool = [i for i in FX["items"].values() if i["heightMm"] <= 160]
    items = [pool[n % 8] for n in range(30)]
    box = {"lengthMm": 600, "breadthMm": 400, "heightMm": 400, "maxLoadG": 50_000}
    t = time.perf_counter()
    r = evaluate_fit(items, box)
    assert time.perf_counter() - t < 0.2  # server budget (browser target 50 ms is checked by the TS script)
    _invariants(r, items, box)


@pytest.mark.skipif(not shutil.which("npx"), reason="node not installed")
def test_same_result_as_typescript_engine():
    out = subprocess.run(["npx", "tsx", "--tsconfig", "tsconfig.json", "scripts/verify-hamper-fit.ts", "--json"],
                         cwd=ROOT, capture_output=True, text=True, timeout=120, check=True).stdout
    ts = json.loads(out)
    for c in FX["cases"]:
        py = evaluate_fit([FX["items"][k] for k in c["items"]], FX["boxes"][c["box"]])
        assert json.loads(json.dumps(py)) == ts[c["id"]], c["id"]
