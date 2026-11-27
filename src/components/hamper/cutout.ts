/**
 * Turns a catalogue photo into a product cut-out for the hamper previews: removes the flat studio background and
 * any frame by flood-filling from the edges, crops to the product, and samples its main colour.
 * A product's own "hamper view photo" (already transparent) passes through untouched apart from the crop.
 */

export type Cutout = {
  /** PNG data URL of the product alone, transparent around it. */
  url: string;
  /** Pixel size of the cut-out (aspect ratio matters for placement). */
  width: number;
  height: number;
  /** Main colour of the product (hex), for sides and tops the photo doesn't show. */
  colour: string;
  canvas: HTMLCanvasElement;
};

const cache = new Map<string, Promise<Cutout | null>>();
const MAX = 512;
/** Sum of RGB differences: frame pixels vs the edge colour. */
const FRAME_TOL = 36;
/** Backdrop pixels vs the colour just inside the frame. */
const BACKDROP_TOL = 42;
/** Neighbouring backdrop pixels may differ this much (soft gradients). */
const STEP = 18;

type RGB = readonly [number, number, number];
const dist = (px: Uint8ClampedArray, q: number, c: RGB) =>
  Math.abs(px[q] - c[0]) + Math.abs(px[q + 1] - c[1]) + Math.abs(px[q + 2] - c[2]);

function edgeSeeds(w: number, h: number) {
  const s: number[] = [];
  for (let x = 0; x < w; x++) s.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) s.push(y * w, y * w + w - 1);
  return s;
}

/** Foreground pixels touching the background: where pass 2 starts. */
function boundary(w: number, h: number, bg: Uint8Array) {
  const s: number[] = [];
  for (let i = 0; i < w * h; i++) {
    if (bg[i]) continue;
    const x = i % w;
    if ((x > 0 && bg[i - 1]) || (x < w - 1 && bg[i + 1]) || (i >= w && bg[i - w]) || (i < w * (h - 1) && bg[i + w])) s.push(i);
  }
  return s.length ? s : edgeSeeds(w, h);
}

function borderColour(px: Uint8ClampedArray, w: number, h: number, bg: Uint8Array): RGB | null {
  let r = 0, g = 0, b = 0, n = 0;
  for (const i of boundary(w, h, bg)) {
    const o = i * 4;
    r += px[o]; g += px[o + 1]; b += px[o + 2]; n++;
  }
  return n ? [r / n, g / n, b / n] : null;
}

/** Breadth-first fill from the seeds through pixels `accept(pixelOffset, fromPixelOffset)` allows. */
function flood(px: Uint8ClampedArray, w: number, h: number, bg: Uint8Array, seeds: number[],
  accept: (q: number, o: number) => boolean) {
  const queue = new Int32Array(w * h);
  let head = 0, tail = 0;
  for (const i of seeds) {
    if (!bg[i] && accept(i * 4, i * 4)) {
      bg[i] = 1;
      queue[tail++] = i;
    }
  }
  while (head < tail) {
    const i = queue[head++];
    const x = i % w;
    const y = (i - x) / w;
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const j = ny * w + nx;
      if (bg[j] || !accept(j * 4, i * 4)) continue;
      bg[j] = 1;
      queue[tail++] = j;
    }
  }
}

export function loadCutout(src: string): Promise<Cutout | null> {
  let p = cache.get(src);
  if (!p) {
    p = make(src).catch(() => null);
    cache.set(src, p);
  }
  return p;
}

async function make(src: string): Promise<Cutout | null> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = src;
  await img.decode();
  const scale = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h);
  const px = data.data;

  // Pass 1: the outer frame / padding — pixels close to the edge colour, reached from the edges.
  const edge = averageEdge(px, w, h);
  const bg = new Uint8Array(w * h);
  flood(px, w, h, bg, edgeSeeds(w, h), (q) => px[q + 3] < 16 || dist(px, q, edge) <= FRAME_TOL);
  // Pass 2: the studio backdrop inside the frame — a tight match to the colour just inside the frame, and only
  // through smooth areas, so a cream product on a white sweep keeps its body.
  const inner = borderColour(px, w, h, bg);
  const pass1 = bg.slice();
  if (inner) flood(px, w, h, bg, boundary(w, h, bg), (q, o) => dist(px, q, inner) <= BACKDROP_TOL && dist(px, q, [px[o], px[o + 1], px[o + 2]]) <= STEP);
  // If the backdrop pass ate most of the picture, the product matched the backdrop: keep only the frame crop.
  const left = (m: Uint8Array) => m.reduce((n, v) => n + (v ? 0 : 1), 0);
  if (left(bg) < left(pass1) * 0.22) bg.set(pass1);

  // Bounding box of what's left, and its colour.
  let minX = w, minY = h, maxX = -1, maxY = -1;
  let r = 0, g = 0, b = 0, n = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (bg[i]) { px[i * 4 + 3] = 0; continue; }
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      const o = i * 4;
      // Weight saturated pixels more so the product's colour wins over white highlights.
      const sat = Math.max(px[o], px[o + 1], px[o + 2]) - Math.min(px[o], px[o + 1], px[o + 2]);
      const wgt = 1 + sat / 16;
      r += px[o] * wgt; g += px[o + 1] * wgt; b += px[o + 2] * wgt; n += wgt;
    }
  }
  // Nothing found (or the fill ate almost everything): fall back to the whole photo.
  const area = (maxX - minX + 1) * (maxY - minY + 1);
  if (maxX < 0 || area < w * h * 0.04) {
    ctx.drawImage(img, 0, 0, w, h);
    return finish(c, w, h, rgbHex(edge[0], edge[1], edge[2]));
  }
  // Soften the cut edge by one pixel.
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const i = y * w + x;
      if (bg[i]) continue;
      const touching = (x > 0 && bg[i - 1]) || (x < w - 1 && bg[i + 1]) || (y > 0 && bg[i - w]) || (y < h - 1 && bg[i + w]);
      if (touching) px[i * 4 + 3] = 170;
    }
  }
  ctx.putImageData(data, 0, 0);
  const cw = maxX - minX + 1;
  const ch = maxY - minY + 1;
  const out = document.createElement("canvas");
  out.width = cw;
  out.height = ch;
  out.getContext("2d")!.drawImage(c, minX, minY, cw, ch, 0, 0, cw, ch);
  return finish(out, cw, ch, n ? rgbHex(r / n, g / n, b / n) : "#cccccc");
}

function finish(canvas: HTMLCanvasElement, width: number, height: number, colour: string): Cutout {
  return { url: canvas.toDataURL("image/png"), width, height, colour, canvas };
}

function averageEdge(px: Uint8ClampedArray, w: number, h: number): RGB {
  let r = 0, g = 0, b = 0, n = 0;
  const add = (x: number, y: number) => {
    const o = (y * w + x) * 4;
    r += px[o]; g += px[o + 1]; b += px[o + 2]; n++;
  };
  for (let x = 0; x < w; x += 4) { add(x, 0); add(x, h - 1); }
  for (let y = 0; y < h; y += 4) { add(0, y); add(w - 1, y); }
  return [r / n, g / n, b / n];
}

const rgbHex = (r: number, g: number, b: number) =>
  `#${[r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("")}`;

/** Items much flatter than they are wide (books, trays, cards) lie flat; the rest stand. */
export function liesFlat(p: { l: number; b: number; h: number }): boolean {
  return p.h < 0.45 * Math.min(p.l, p.b);
}

/** Round items: upright with a near-square footprint (bottles, mugs, jars, tumblers). */
export function isRound(item: { orientation?: string }, p: { l: number; b: number; h: number }): boolean {
  return item.orientation === "upright" && Math.abs(p.l - p.b) <= 0.15 * Math.max(p.l, p.b);
}
