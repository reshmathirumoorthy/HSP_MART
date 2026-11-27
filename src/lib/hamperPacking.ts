/**
 * Hamper fit and packing engine (docs/hamper-builder-plan.md, steps 2–3).
 *
 * Mirror of backend/app/services/hamper_fit.py — both are checked against e2e/fixtures/hamper-fit-cases.json,
 * so the instant browser result and the authoritative server result never disagree. Units are integer mm and g
 * (ISO 80000); sizes are length × breadth × height (ISO 3394). Axes: x along length, y along breadth, z up.
 */

export type PackBox = {
  lengthMm: number;
  breadthMm: number;
  heightMm: number;
  maxLoadG: number;
  /** Filler allowance on every side (tissue, shred). */
  paddingMm?: number;
  /** Largest share of the usable volume the contents may take. */
  maxFillPercent?: number;
};

export type PackItem = {
  productId: string;
  lengthMm: number;
  breadthMm: number;
  heightMm: number;
  weightG: number;
  /** ISO 780 "this way up": may only turn about the vertical axis. */
  orientation?: "any" | "upright";
  /** Nothing may be packed on top of a fragile item. */
  fragile?: boolean;
};

export type Placement = {
  productId: string;
  /** Position of this copy among items with the same product id (0-based). */
  index: number;
  x: number;
  y: number;
  z: number;
  l: number;
  b: number;
  h: number;
};

export type FitReason = "too_large" | "too_tall" | "over_volume" | "over_weight" | "cannot_pack";

export type FitResult = {
  ok: boolean;
  reasons: FitReason[];
  /** Product ids responsible for too_large / too_tall. */
  oversized: string[];
  fillPercent: number;
  volumeUsedMm3: number;
  volumeCapacityMm3: number;
  weightG: number;
  maxLoadG: number;
  usable: { lengthMm: number; breadthMm: number; heightMm: number };
  placements: Placement[];
  /** Items the packer could not place (empty when ok). */
  unplaced: string[];
};

export const DEFAULT_PADDING_MM = 10;
export const DEFAULT_MAX_FILL_PERCENT = 85;
/** Share of an item's base that must rest on the floor or on items below it. */
export const MIN_SUPPORT = 0.6;

type Dims = [number, number, number];

export function usableSize(box: PackBox) {
  const pad = box.paddingMm ?? DEFAULT_PADDING_MM;
  return {
    lengthMm: Math.max(0, box.lengthMm - 2 * pad),
    breadthMm: Math.max(0, box.breadthMm - 2 * pad),
    heightMm: Math.max(0, box.heightMm - 2 * pad),
  };
}

/** Allowed orientations in a fixed order (deterministic). Upright items keep their height vertical. */
export function rotations(item: PackItem): Dims[] {
  const { lengthMm: l, breadthMm: b, heightMm: h } = item;
  const all: Dims[] =
    item.orientation === "upright"
      ? [[l, b, h], [b, l, h]]
      : [[l, b, h], [b, l, h], [l, h, b], [h, l, b], [b, h, l], [h, b, l]];
  const seen = new Set<string>();
  return all.filter((d) => {
    const k = d.join("x");
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/** Whether the item fits the empty box alone; for an upright item, whether only its height is the problem. */
export function fitsAlone(item: PackItem, box: PackBox): "ok" | "too_large" | "too_tall" {
  const u = usableSize(box);
  const rs = rotations(item);
  if (rs.some(([l, b, h]) => l <= u.lengthMm && b <= u.breadthMm && h <= u.heightMm)) return "ok";
  // "Too tall" only makes sense for something that must stand upright; anything else is simply too big.
  if (item.orientation === "upright" && rs.some(([l, b]) => l <= u.lengthMm && b <= u.breadthMm)) return "too_tall";
  return "too_large";
}

const overlap1 = (a0: number, a1: number, b0: number, b1: number) => Math.max(0, Math.min(a1, b1) - Math.max(a0, b0));

function sortForPacking(items: PackItem[]) {
  const counts = new Map<string, number>();
  const tagged = items.map((it) => {
    const index = counts.get(it.productId) ?? 0;
    counts.set(it.productId, index + 1);
    return { it, index };
  });
  const vol = (i: PackItem) => i.lengthMm * i.breadthMm * i.heightMm;
  const face = (i: PackItem) => {
    const [a, b] = [i.lengthMm, i.breadthMm, i.heightMm].sort((x, y) => y - x);
    return a * b;
  };
  // Sturdy before fragile (fragile ends up on top), then big and heavy first; ids break ties.
  return tagged.sort(
    (p, q) =>
      Number(!!p.it.fragile) - Number(!!q.it.fragile) ||
      vol(q.it) - vol(p.it) ||
      face(q.it) - face(p.it) ||
      q.it.weightG - p.it.weightG ||
      (p.it.productId < q.it.productId ? -1 : p.it.productId > q.it.productId ? 1 : 0) ||
      p.index - q.index,
  );
}

/** Extreme-point first-fit-decreasing packer. Same input always gives the same layout. */
export function pack(items: PackItem[], box: PackBox): { placements: Placement[]; unplaced: string[] } {
  const u = usableSize(box);
  const placed: (Placement & { fragile: boolean })[] = [];
  const unplaced: string[] = [];
  let points: Dims[] = [[0, 0, 0]];

  for (const { it, index } of sortForPacking(items)) {
    const ordered = [...points].sort((p, q) => p[2] - q[2] || p[1] - q[1] || p[0] - q[0]);
    let chosen: Placement | null = null;
    search: for (const [x, y, z] of ordered) {
      for (const [l, b, h] of rotations(it)) {
        if (x + l > u.lengthMm || y + b > u.breadthMm || z + h > u.heightMm) continue;
        let collides = false;
        let supported = 0;
        let onFragile = false;
        for (const p of placed) {
          const ox = overlap1(x, x + l, p.x, p.x + p.l);
          const oy = overlap1(y, y + b, p.y, p.y + p.b);
          if (ox > 0 && oy > 0 && overlap1(z, z + h, p.z, p.z + p.h) > 0) {
            collides = true;
            break;
          }
          if (z > 0 && p.z + p.h === z && ox > 0 && oy > 0) {
            supported += ox * oy;
            if (p.fragile) onFragile = true;
          }
        }
        if (collides || onFragile) continue;
        if (z > 0 && supported < MIN_SUPPORT * l * b) continue;
        chosen = { productId: it.productId, index, x, y, z, l, b, h };
        break search;
      }
    }
    if (!chosen) {
      unplaced.push(it.productId);
      continue;
    }
    placed.push({ ...chosen, fragile: !!it.fragile });
    const { x, y, z, l, b, h } = chosen;
    points = points.filter((p) => !(p[0] === x && p[1] === y && p[2] === z));
    for (const p of [[x + l, y, z], [x, y + b, z], [x, y, z + h]] as Dims[]) {
      if (!points.some((q) => q[0] === p[0] && q[1] === p[1] && q[2] === p[2])) points.push(p);
    }
  }
  return { placements: placed.map(({ productId, index, x, y, z, l, b, h }) => ({ productId, index, x, y, z, l, b, h })), unplaced };
}

/** Full check: every item fits alone, volume and weight limits, and a real packing exists. */
export function evaluateFit(items: PackItem[], box: PackBox): FitResult {
  const u = usableSize(box);
  const capacity = u.lengthMm * u.breadthMm * u.heightMm;
  const used = items.reduce((s, i) => s + i.lengthMm * i.breadthMm * i.heightMm, 0);
  const weight = items.reduce((s, i) => s + i.weightG, 0);
  const reasons: FitReason[] = [];
  const oversized: string[] = [];
  let worst: "ok" | "too_large" | "too_tall" = "ok";
  for (const it of items) {
    const f = fitsAlone(it, box);
    if (f !== "ok") {
      if (!oversized.includes(it.productId)) oversized.push(it.productId);
      if (worst !== "too_large") worst = f;
    }
  }
  if (worst !== "ok") reasons.push(worst);
  const maxFill = box.maxFillPercent ?? DEFAULT_MAX_FILL_PERCENT;
  if (capacity === 0 || used * 100 > capacity * maxFill) reasons.push("over_volume");
  if (weight > box.maxLoadG) reasons.push("over_weight");
  const { placements, unplaced } = pack(items, box);
  if (unplaced.length && !reasons.includes("too_large") && !reasons.includes("too_tall")) reasons.push("cannot_pack");
  return {
    ok: reasons.length === 0,
    reasons,
    oversized,
    fillPercent: capacity ? Math.round((used * 1000) / capacity) / 10 : 0,
    volumeUsedMm3: used,
    volumeCapacityMm3: capacity,
    weightG: weight,
    maxLoadG: box.maxLoadG,
    usable: u,
    placements,
    unplaced,
  };
}

export const FIT_REASON_TEXT: Record<FitReason, string> = {
  too_large: "Too big for this box",
  too_tall: "Too tall for this box",
  over_volume: "No room left in this box",
  over_weight: "Over the box's weight limit",
  cannot_pack: "Won't fit with what's already inside",
};

/** ISO 80000 style display: number, space, unit. */
export const formatMm = (d: { lengthMm: number; breadthMm: number; heightMm: number }) =>
  `${d.lengthMm} × ${d.breadthMm} × ${d.heightMm} mm`;
export const formatKg = (g: number) => `${(g / 1000).toFixed(g % 100 === 0 ? 1 : 2)} kg`;
