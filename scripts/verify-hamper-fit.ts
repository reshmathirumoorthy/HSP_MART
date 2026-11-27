/**
 * Checks src/lib/hamperPacking.ts against e2e/fixtures/hamper-fit-cases.json and packing invariants,
 * and prints every case's result as JSON (backend/tests/test_hamper_fit.py compares the Python engine to it).
 * Run: npx tsx --tsconfig tsconfig.json scripts/verify-hamper-fit.ts [--json]
 */
import { readFileSync } from "node:fs";
import { evaluateFit, rotations, type PackBox, type PackItem, type Placement } from "../src/lib/hamperPacking";

type Fixture = { boxes: Record<string, PackBox>; items: Record<string, PackItem>; cases: { id: string; box: string; items: string[]; expect: Record<string, unknown> }[] };
const fx: Fixture = JSON.parse(readFileSync(new URL("../e2e/fixtures/hamper-fit-cases.json", import.meta.url), "utf8"));
const failures: string[] = [];
const fail = (m: string) => failures.push(m);

export function checkInvariants(id: string, placements: Placement[], items: PackItem[], box: PackBox) {
  const pad = box.paddingMm ?? 10;
  const [L, B, H] = [box.lengthMm - 2 * pad, box.breadthMm - 2 * pad, box.heightMm - 2 * pad];
  const byId = new Map(items.map((i) => [i.productId, i]));
  placements.forEach((p, i) => {
    if (p.x < 0 || p.y < 0 || p.z < 0 || p.x + p.l > L || p.y + p.b > B || p.z + p.h > H) fail(`${id}: ${p.productId} outside box`);
    const it = byId.get(p.productId)!;
    if (!rotations(it).some(([l, b, h]) => l === p.l && b === p.b && h === p.h)) fail(`${id}: ${p.productId} not an allowed rotation`);
    if (it.orientation === "upright" && p.h !== it.heightMm) fail(`${id}: upright ${p.productId} tipped over`);
    placements.slice(i + 1).forEach((q) => {
      const o = (a0: number, a1: number, b0: number, b1: number) => Math.min(a1, b1) - Math.max(a0, b0) > 0;
      if (o(p.x, p.x + p.l, q.x, q.x + q.l) && o(p.y, p.y + p.b, q.y, q.y + q.b) && o(p.z, p.z + p.h, q.z, q.z + q.h))
        fail(`${id}: ${p.productId} overlaps ${q.productId}`);
    });
    if (it.fragile && placements.some((q) => q.z === p.z + p.h && q.x < p.x + p.l && q.x + q.l > p.x && q.y < p.y + p.b && q.y + q.b > p.y))
      fail(`${id}: something rests on fragile ${p.productId}`);
  });
}

const results: Record<string, unknown> = {};
for (const c of fx.cases) {
  const box = fx.boxes[c.box];
  const items = c.items.map((k) => fx.items[k]);
  const r = evaluateFit(items, box);
  results[c.id] = r;
  const e = c.expect;
  if (r.ok !== e.ok) fail(`${c.id}: ok ${r.ok} ≠ ${e.ok} (${r.reasons})`);
  if (JSON.stringify(r.reasons) !== JSON.stringify(e.reasons)) fail(`${c.id}: reasons ${r.reasons} ≠ ${e.reasons}`);
  if (e.fillPercent !== undefined && r.fillPercent !== e.fillPercent) fail(`${c.id}: fill ${r.fillPercent} ≠ ${e.fillPercent}`);
  if (e.weightG !== undefined && r.weightG !== e.weightG) fail(`${c.id}: weight ${r.weightG} ≠ ${e.weightG}`);
  if (e.placed !== undefined && r.placements.length !== e.placed) fail(`${c.id}: placed ${r.placements.length} ≠ ${e.placed}`);
  if (e.oversized && JSON.stringify(r.oversized) !== JSON.stringify(e.oversized)) fail(`${c.id}: oversized ${r.oversized}`);
  checkInvariants(c.id, r.placements, items, box);
  if (JSON.stringify(evaluateFit(items, box)) !== JSON.stringify(r)) fail(`${c.id}: not deterministic`);
}

// Performance (ISO/IEC 25010 time behaviour): 30 mixed items under 50 ms.
const thirty = Array.from({ length: 30 }, (_, i) => Object.values(fx.items).filter((x) => x.heightMm <= 160)[i % 8]);
const t0 = performance.now();
const big = evaluateFit(thirty, { lengthMm: 600, breadthMm: 400, heightMm: 400, maxLoadG: 50_000 });
const ms = performance.now() - t0;
checkInvariants("thirty", big.placements, thirty, { lengthMm: 600, breadthMm: 400, heightMm: 400, maxLoadG: 50_000 });
if (ms > 50) fail(`30 items took ${ms.toFixed(1)} ms (limit 50 ms)`);

// The admin app keeps its own copy of the 3D model builder (it is built separately); the two must not drift.
const shared = readFileSync(new URL("../src/lib/product3d.ts", import.meta.url), "utf8");
const adminCopy = readFileSync(new URL("../admin/src/lib/product3d.ts", import.meta.url), "utf8");
if (shared !== adminCopy) fail("admin/src/lib/product3d.ts differs from src/lib/product3d.ts — copy it across");

if (process.argv.includes("--json")) {
  process.stdout.write(JSON.stringify(results));
} else {
  console.log(`${fx.cases.length} cases, 30 items packed in ${ms.toFixed(1)} ms (${big.placements.length} placed)`);
  if (failures.length) { console.error(failures.join("\n")); process.exit(1); }
  console.log("✓ hamper fit engine OK");
}
if (failures.length) process.exit(1);
