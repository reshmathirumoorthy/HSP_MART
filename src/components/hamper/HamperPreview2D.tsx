"use client";

/**
 * To-scale 2D hamper preview with the same look as the 3D view: the box in its material, a shredded-paper bed, and
 * each product's own photo cut-out. Top view looks down into the open box; front view is a cut-away through the
 * front wall. Also the accessible / no-WebGL alternative to 3D.
 */
import { useMemo } from "react";
import type { FitResult, Placement } from "@/lib/hamperPacking";
import { isRound, liesFlat, type Cutout } from "./cutout";
import { boxPalette, mulberry32 } from "./hamperLook";
import { useCutouts } from "./useCutouts";
import styles from "./HamperPreview.module.css";

export type PreviewItem = { name: string; image: string | null; orientation?: "any" | "upright" };
type BoxStyle = "kraft" | "rigid" | "basket";
type Box = { lengthMm: number; breadthMm: number; heightMm: number; boxStyle?: BoxStyle };

export function HamperPreview2D({ fit, items, box }: { fit: FitResult; items: Map<string, PreviewItem>; box: Box }) {
  const cuts = useCutouts([...fit.placements].map((p) => items.get(p.productId)?.image));
  return (
    <div className={styles.views} data-testid="preview-2d">
      <TopView fit={fit} items={items} box={box} cuts={cuts} />
      <FrontView fit={fit} items={items} box={box} cuts={cuts} />
    </div>
  );
}

type ViewProps = { fit: FitResult; items: Map<string, PreviewItem>; box: Box; cuts: Map<string, Cutout> };
const M = 28; // drawing margin, mm

function Shred({ id, colours, seed }: { id: string; colours: string[]; seed: number }) {
  // A tile of crinkled paper strips, repeated over the bed.
  const paths = useMemo(() => {
    const rand = mulberry32(seed);
    return Array.from({ length: 70 }, () => {
      const x = rand() * 120, y = rand() * 120, len = 14 + rand() * 22, a = rand() * Math.PI;
      const mx = x + Math.cos(a) * len * 0.5 + (rand() - 0.5) * 8;
      const my = y + Math.sin(a) * len * 0.5 + (rand() - 0.5) * 8;
      return { d: `M${x},${y} Q${mx},${my} ${x + Math.cos(a) * len},${y + Math.sin(a) * len}`, c: colours[Math.floor(rand() * colours.length)] };
    });
  }, [colours, seed]);
  return (
    <pattern id={id} width={120} height={120} patternUnits="userSpaceOnUse">
      <rect width={120} height={120} fill={colours[0]} />
      {paths.slice(0, 25).map((p, i) => <path key={`s${i}`} d={p.d} stroke="rgba(60,40,20,0.22)" strokeWidth={1.2} fill="none" transform="translate(1.5,2)" />)}
      {paths.map((p, i) => <path key={i} d={p.d} stroke={p.c} strokeWidth={2.4} fill="none" strokeLinecap="round" />)}
    </pattern>
  );
}

function TopView({ fit, items, box, cuts }: ViewProps) {
  const look = boxPalette(box.boxStyle ?? "kraft");
  const pad = (box.lengthMm - fit.usable.lengthMm) / 2;
  const wall = 6;
  const W = box.lengthMm, D = box.breadthMm;
  // Draw lower items first so higher ones cover them.
  const order = [...fit.placements].sort((a, b) => a.z + a.h - (b.z + b.h) || a.y - b.y);
  return (
    <figure className={styles.view}>
      <svg viewBox={`${-M} ${-M} ${W + 2 * M} ${D + 2 * M}`} role="img"
        aria-label={`Top view of the hamper, ${W} × ${D} mm, ${fit.placements.length} items`} data-view="top">
        <defs>
          <Shred id="shred-top" colours={look.shred} seed={W + D} />
          <radialGradient id="lid-shine" cx="35%" cy="30%" r="70%">
            <stop offset="0" stopColor="#fff" stopOpacity="0.35" />
            <stop offset="1" stopColor="#000" stopOpacity="0.15" />
          </radialGradient>
          <linearGradient id="top-light" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="0.18" />
            <stop offset="1" stopColor="#000" stopOpacity="0.12" />
          </linearGradient>
          <filter id="drop-top" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="3" dy="5" stdDeviation="4" floodColor="#2b1d0e" floodOpacity="0.35" />
          </filter>
        </defs>
        <rect x={-6} y={-4} width={W + 12} height={D + 12} rx={8} fill="#2b1d0e" opacity={0.18} />
        <rect x={0} y={0} width={W} height={D} rx={4} fill={look.outer} />
        <rect x={wall} y={wall} width={W - 2 * wall} height={D - 2 * wall} rx={2} fill="url(#shred-top)" />
        <rect x={wall} y={wall} width={W - 2 * wall} height={D - 2 * wall} rx={2} fill="none" stroke="rgba(40,25,10,0.35)" strokeWidth={3} />
        {order.map((p) => (
          <TopItem key={`${p.productId}-${p.index}`} p={p} pad={pad} item={items.get(p.productId)} cut={cutFor(items, cuts, p)} />
        ))}
        <rect x={0} y={0} width={W} height={D} rx={4} fill="none" stroke={look.rim} strokeWidth={3} />
        <text x={W / 2} y={-10} textAnchor="middle" className={styles.dim}>{W} mm</text>
        <text x={W + 12} y={D / 2} className={styles.dim} textAnchor="middle" transform={`rotate(90 ${W + 12} ${D / 2})`}>{D} mm</text>
      </svg>
      <figcaption className={styles.caption}>Top view · {W} × {D} mm</figcaption>
    </figure>
  );
}

function TopItem({ p, pad, item, cut }: { p: Placement; pad: number; item?: PreviewItem; cut?: Cutout }) {
  const x = pad + p.x, y = pad + p.y;
  const colour = cut?.colour ?? "#d8c8a8";
  const clip = `clip-top-${p.productId}-${p.index}`;
  const round = item && isRound(item, p);
  const flat = liesFlat(p);
  return (
    <g data-item={p.productId} filter="url(#drop-top)">
      <defs>
        <clipPath id={clip}>
          {round ? <circle cx={x + p.l / 2} cy={y + p.b / 2} r={Math.min(p.l, p.b) / 2 - 1} /> : <rect x={x + 1} y={y + 1} width={p.l - 2} height={p.b - 2} rx={4} />}
        </clipPath>
      </defs>
      <g clipPath={`url(#${clip})`}>
        <rect x={x} y={y} width={p.l} height={p.b} fill={colour} />
        {round && <circle cx={x + p.l / 2} cy={y + p.b / 2} r={Math.min(p.l, p.b) / 2 - 1} fill="url(#lid-shine)" />}
        {cut && flat && <image href={cut.url} x={x} y={y} width={p.l} height={p.b} preserveAspectRatio="xMidYMid slice" />}
        {cut && !flat && (
          // Seen from above, a standing product shows its top: its colour with the photo as a small label.
          <image href={cut.url} x={x + p.l * 0.2} y={y + p.b * 0.2} width={p.l * 0.6} height={p.b * 0.6} preserveAspectRatio="xMidYMid meet" opacity={0.9} />
        )}
        <rect x={x} y={y} width={p.l} height={p.b} fill="url(#top-light)" />
      </g>
      <title>{`${item?.name ?? p.productId}: ${p.l} × ${p.b} × ${p.h} mm`}</title>
    </g>
  );
}

function FrontView({ fit, items, box, cuts }: ViewProps) {
  const look = boxPalette(box.boxStyle ?? "kraft");
  const pad = (box.lengthMm - fit.usable.lengthMm) / 2;
  const W = box.lengthMm, H = box.heightMm;
  const wall = 6;
  const bed = Math.max(pad + 6, Math.min(40, H * 0.22));
  // Back items first, front items over them.
  const order = [...fit.placements].sort((a, b) => a.y - b.y || a.z - b.z);
  const lift = (p: Placement) => (p.z === 0 ? bed * 0.45 : 0); // same as the 3D view: resting on the paper bed
  return (
    <figure className={styles.view}>
      <svg viewBox={`${-M} ${-M} ${W + 2 * M} ${H + 2 * M}`} role="img"
        aria-label={`Front view of the hamper, ${W} × ${H} mm, ${fit.placements.length} items`} data-view="front">
        <defs>
          <Shred id="shred-front" colours={look.shred} seed={W + H} />
          <linearGradient id="back-wall" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={look.inner} />
            <stop offset="1" stopColor={look.outer} />
          </linearGradient>
          <filter id="drop-front" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="2" dy="3" stdDeviation="3" floodColor="#2b1d0e" floodOpacity="0.3" />
          </filter>
        </defs>
        <ellipse cx={W / 2} cy={H + 6} rx={W * 0.55} ry={10} fill="#2b1d0e" opacity={0.15} />
        <rect x={0} y={0} width={W} height={H} fill="url(#back-wall)" />
        <rect x={wall} y={H - wall - bed} width={W - 2 * wall} height={bed} fill="url(#shred-front)" />
        {order.map((p) => {
          const it = items.get(p.productId);
          const cut = cutFor(items, cuts, p);
          const x = pad + p.x, w = p.l, h = p.h;
          const bottom = H - wall - p.z - lift(p);
          const flat = liesFlat(p);
          return (
            <g key={`${p.productId}-${p.index}`} data-item={p.productId} filter="url(#drop-front)">
              {cut && !flat ? (
                // Standing product: its photo at its real height, centred in its packed slot.
                <image href={cut.url} x={x} y={bottom - h} width={w} height={h} preserveAspectRatio="xMidYMax meet" />
              ) : (
                <>
                  <rect x={x + 1} y={bottom - h} width={w - 2} height={h} rx={2} fill={cut?.colour ?? "#d8c8a8"} />
                  <rect x={x + 1} y={bottom - h} width={w - 2} height={Math.min(3, h)} fill="#fff" opacity={0.35} />
                </>
              )}
              <title>{`${it?.name ?? p.productId}: ${p.l} × ${p.b} × ${p.h} mm`}</title>
            </g>
          );
        })}
        {/* Front wall cut away down to the shred line, so the contents show. */}
        <rect x={0} y={H - wall - bed * 0.55} width={W} height={bed * 0.55 + wall} fill={look.outer} opacity={0.92} />
        <rect x={0} y={0} width={W} height={H} fill="none" stroke={look.rim} strokeWidth={3} />
        <line x1={0} y1={H - wall - bed * 0.55} x2={W} y2={H - wall - bed * 0.55} stroke={look.rim} strokeWidth={2} strokeDasharray="8 5" />
        <text x={W / 2} y={-10} textAnchor="middle" className={styles.dim}>{W} mm</text>
        <text x={W + 12} y={H / 2} className={styles.dim} textAnchor="middle" transform={`rotate(90 ${W + 12} ${H / 2})`}>{H} mm</text>
      </svg>
      <figcaption className={styles.caption}>Front view, front wall cut away · {W} × {H} mm</figcaption>
    </figure>
  );
}

function cutFor(items: Map<string, PreviewItem>, cuts: Map<string, Cutout>, p: Placement) {
  const src = items.get(p.productId)?.image;
  return src ? cuts.get(src) : undefined;
}
