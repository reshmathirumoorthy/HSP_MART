"use client";

/**
 * Build-your-own hamper (docs/hamper-builder-plan.md): choose a box, add products that physically fit,
 * watch the fill and weight meter. Fit and packing come from src/lib/hamperPacking.ts; the server re-checks.
 */
import dynamic from "next/dynamic";
import {
  useCallback,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  evaluateFit,
  FIT_REASON_TEXT,
  formatKg,
  formatMm,
  type FitResult,
  type PackBox,
  type PackItem,
} from "@/lib/hamperPacking";
import { CatalogImage } from "@/components/CatalogImage";
import type { Model3d } from "@/lib/product3d";
import { HamperPreview2D, type PreviewItem } from "./HamperPreview2D";
import type { SceneBox, SceneItem } from "./hamperScene";
import { webglAvailable } from "./webgl";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import styles from "./HamperBuilder.module.css";

const noopSubscribe = () => () => {};

const HamperPreview3D = dynamic(() => import("./HamperPreview3D"), {
  ssr: false,
  loading: () => <p className={styles.muted}>Loading 3D view…</p>,
});
const HamperRendered2D = dynamic(() => import("./HamperRendered2D"), {
  ssr: false,
  loading: () => <p className={styles.muted}>Loading 2D views…</p>,
});

export type BuilderBox = PackBox & {
  id: string;
  name: string;
  price: number;
  image: string | null;
  tareG: number;
  wallThicknessMm: number;
  boxStyle: "kraft" | "rigid" | "basket";
  filler: "shred" | "none";
  model3d: Model3d;
};

export type BuilderItem = PackItem & {
  name: string;
  price: number;
  image: string | null;
  category: string;
  model3d: Model3d;
  /** Catalogue size (the packer may turn the item; the model is built at this size, then turned). */
  dims: { lengthMm: number; breadthMm: number; heightMm: number };
};

export type Line = { productId: string; quantity: number };

const inr = (n: number) =>
  `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export function expandLines(
  lines: Line[],
  byId: Map<string, BuilderItem>,
): PackItem[] {
  return lines.flatMap((l) => {
    const it = byId.get(l.productId);
    return it ? Array.from({ length: l.quantity }, () => it) : [];
  });
}

export function HamperBuilder({
  boxes,
  items,
}: {
  boxes: BuilderBox[];
  items: BuilderItem[];
}) {
  const [boxId, setBoxId] = useState<string | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [query, setQuery] = useState("");
  const byId = useMemo(
    () => new Map(items.map((i) => [i.productId, i])),
    [items],
  );
  const box = boxes.find((b) => b.id === boxId) ?? null;
  const packed = useMemo(() => expandLines(lines, byId), [lines, byId]);
  const fit = useMemo(
    () => (box ? evaluateFit(packed, box) : null),
    [box, packed],
  );

  const { addToCart } = useCart();
  const [added, setAdded] = useState(false);
  /** Box the shopper wants to switch to, while we ask what to do with items that won't fit it. */
  const [pending, setPending] = useState<{
    box: BuilderBox;
    keep: Line[];
    dropped: string[];
  } | null>(null);

  const chooseBox = (next: BuilderBox) => {
    setAdded(false);
    if (next.id === boxId) return;
    if (!lines.length || evaluateFit(packed, next).ok) {
      setPending(null);
      setBoxId(next.id);
      return;
    }
    const { keep, dropped } = keepWhatFits(lines, byId, next);
    setPending({ box: next, keep, dropped });
  };

  const addHamperToCart = () => {
    if (!box || !fit?.ok || !lines.length) return;
    if (addToCart(box.id, 1, { hamper: true, contents: lines })) setAdded(true);
  };

  /** Latest 3D snapshot getter, used as the cart thumbnail. */
  const snapshotRef = useRef<(() => string) | null>(null);

  const add = (productId: string) => {
    setAdded(false);
    return setLines((ls) =>
      ls.some((l) => l.productId === productId)
        ? ls.map((l) =>
            l.productId === productId ? { ...l, quantity: l.quantity + 1 } : l,
          )
        : [...ls, { productId, quantity: 1 }],
    );
  };
  const remove = (productId: string) =>
    setLines((ls) =>
      ls.flatMap((l) =>
        l.productId !== productId
          ? [l]
          : l.quantity > 1
            ? [{ ...l, quantity: l.quantity - 1 }]
            : [],
      ),
    );

  const shown = items.filter(
    (i) =>
      !query.trim() ||
      `${i.name} ${i.category}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  const total = box
    ? box.price +
      lines.reduce(
        (s, l) => s + (byId.get(l.productId)?.price ?? 0) * l.quantity,
        0,
      )
    : 0;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Build your own hamper</p>
        <h1 className={styles.title}>Choose a box, then fill it</h1>
        <p className={styles.copy}>
          Every product is measured, so we only let you add what really fits.
          Sizes are length × breadth × height.
        </p>
      </header>

      <section aria-labelledby="box-heading" className={styles.section}>
        <h2 id="box-heading" className={styles.h2}>
          1. Hamper box
        </h2>
        {boxes.length === 0 ? (
          <p className={styles.muted}>
            No hamper boxes are available right now.
          </p>
        ) : (
          <div
            className={styles.boxes}
            role="radiogroup"
            aria-label="Hamper box"
          >
            {boxes.map((b) => (
              <button
                key={b.id}
                type="button"
                role="radio"
                aria-checked={b.id === boxId}
                className={styles.boxCard}
                data-selected={b.id === boxId || undefined}
                onClick={() => chooseBox(b)}
              >
                <span className={styles.boxName}>{b.name}</span>
                <span className={styles.muted}>Inside {formatMm(b)}</span>
                <span className={styles.muted}>
                  Holds up to {formatKg(b.maxLoadG)}
                </span>
                <span className={styles.price}>{inr(b.price)}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      {pending && (
        <div
          role="alertdialog"
          aria-labelledby="switch-title"
          className={styles.confirm}
        >
          <p id="switch-title" className={styles.boxName}>
            Some items won&apos;t fit in {pending.box.name}
          </p>
          <ul aria-label="Items that will be removed">
            {pending.dropped.map((d, i) => (
              <li key={`${d}-${i}`}>{byId.get(d)?.name ?? d}</li>
            ))}
          </ul>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.add}
              onClick={() => {
                setLines(pending.keep);
                setBoxId(pending.box.id);
                setPending(null);
              }}
            >
              Switch and remove them
            </button>
            <button
              type="button"
              className={styles.link}
              onClick={() => setPending(null)}
            >
              Keep my current box
            </button>
          </div>
        </div>
      )}

      {box && fit && (
        <>
          <FillMeter fit={fit} />
          <div className={styles.columns}>
            <section aria-labelledby="add-heading" className={styles.section}>
              <h2 id="add-heading" className={styles.h2}>
                2. Add products
              </h2>
              <label className={styles.search}>
                <span className={styles.muted}>Search hamper products</span>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  type="search"
                />
              </label>
              <ul className={styles.items} aria-label="Products">
                {shown.map((it) => (
                  <ItemCard
                    key={it.productId}
                    item={it}
                    reason={addReason(it, packed, box)}
                    onAdd={() => add(it.productId)}
                  />
                ))}
              </ul>
            </section>

            <section
              aria-labelledby="inside-heading"
              className={styles.section}
            >
              <h2 id="inside-heading" className={styles.h2}>
                In your hamper
              </h2>
              {lines.length === 0 ? (
                <p className={styles.muted}>
                  Nothing yet. Add products on the left.
                </p>
              ) : (
                <ul className={styles.contents} aria-label="Hamper contents">
                  {lines.map((l) => {
                    const it = byId.get(l.productId)!;
                    return (
                      <li key={l.productId} className={styles.contentRow}>
                        <span>
                          {it.name} × {l.quantity}
                        </span>
                        <span>{inr(it.price * l.quantity)}</span>
                        <button
                          type="button"
                          className={styles.link}
                          onClick={() => remove(l.productId)}
                          aria-label={`Remove one ${it.name}`}
                        >
                          Remove
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
              {fit.placements.length > 0 && (
                <PackingPlan fit={fit} byId={byId} />
              )}
              <p className={styles.total} data-testid="hamper-total">
                Total {inr(total)}{" "}
                <span className={styles.muted}>
                  (box {inr(box.price)} + contents, excl. GST)
                </span>
              </p>
              <button
                type="button"
                className={styles.add}
                disabled={!fit.ok || !lines.length}
                onClick={addHamperToCart}
              >
                Add hamper to cart
              </button>
              {added && (
                <p role="status" className={styles.notice}>
                  Hamper added. <Link href="/cart">View cart</Link>
                </p>
              )}
            </section>
          </div>
          {fit.placements.length > 0 && (
            <Preview
              fit={fit}
              box={box}
              byId={byId}
              snapshotRef={snapshotRef}
            />
          )}
        </>
      )}
    </div>
  );
}

/** Keeps lines in order while they still fit the new box; returns what had to go (one entry per unit). */
export function keepWhatFits(
  lines: Line[],
  byId: Map<string, BuilderItem>,
  box: PackBox,
) {
  const kept: PackItem[] = [];
  const keep: Line[] = [];
  const dropped: string[] = [];
  for (const l of lines) {
    const it = byId.get(l.productId);
    if (!it) continue;
    let q = 0;
    for (let n = 0; n < l.quantity; n++) {
      if (evaluateFit([...kept, it], box).ok) {
        kept.push(it);
        q++;
      } else dropped.push(l.productId);
    }
    if (q) keep.push({ productId: l.productId, quantity: q });
  }
  return { keep, dropped };
}

/** Why the item cannot be added to the current contents, or null if it can. */
export function addReason(
  item: PackItem,
  current: PackItem[],
  box: PackBox,
): string | null {
  const r = evaluateFit([...current, item], box);
  if (r.ok) return null;
  const now = evaluateFit(current, box);
  // Only blame the new item for problems it causes, not ones that already exist.
  const fresh = r.reasons.filter((x) => !now.reasons.includes(x));
  return fresh.length ? FIT_REASON_TEXT[fresh[0]] : null;
}

function ItemCard({
  item,
  reason,
  onAdd,
}: {
  item: BuilderItem;
  reason: string | null;
  onAdd: () => void;
}) {
  return (
    <li className={styles.item} data-disabled={!!reason || undefined}>
      {item.image ? (
        <CatalogImage
          src={item.image}
          alt=""
          width={52}
          height={52}
          className={styles.thumb}
        />
      ) : (
        <span className={styles.thumb} />
      )}
      <span className={styles.itemText}>
        <span className={styles.itemName}>{item.name}</span>
        <span className={styles.muted}>
          {formatMm(item)} · {formatKg(item.weightG)}
          {item.orientation === "upright" ? " · keep upright" : ""}
          {item.fragile ? " · fragile" : ""}
        </span>
        {reason && <span className={styles.reason}>{reason}</span>}
      </span>
      <span className={styles.price}>{inr(item.price)}</span>
      <button
        type="button"
        className={styles.add}
        disabled={!!reason}
        onClick={onAdd}
        aria-label={`Add ${item.name}`}
      >
        Add
      </button>
    </li>
  );
}

function Preview({
  fit,
  box,
  byId,
  snapshotRef,
}: {
  fit: FitResult;
  box: BuilderBox;
  byId: Map<string, BuilderItem>;
  snapshotRef: React.RefObject<(() => string) | null>;
}) {
  const [tab, setTab] = useState<"2d" | "3d">("2d");
  // null on the server, then the real answer in the browser (no hydration mismatch).
  const gl = useSyncExternalStore(noopSubscribe, webglAvailable, () => null);
  const drawn = useMemo(
    () =>
      new Map<string, PreviewItem>(
        [...byId].map(([k, v]) => [k, { name: v.name, image: v.image, orientation: v.orientation }]),
      ),
    [byId],
  );
  const models = useMemo(
    () => new Map<string, SceneItem>([...byId].map(([k, v]) => [k, { name: v.name, model3d: v.model3d, dims: v.dims }])),
    [byId],
  );
  const box3d = useMemo<SceneBox>(
    () => ({
      lengthMm: box.lengthMm,
      breadthMm: box.breadthMm,
      heightMm: box.heightMm,
      wallThicknessMm: box.wallThicknessMm,
      boxStyle: box.boxStyle,
      filler: box.filler,
      model3d: box.model3d,
    }),
    [box.lengthMm, box.breadthMm, box.heightMm, box.wallThicknessMm, box.boxStyle, box.filler, box.model3d],
  );
  const onSnapshot = useCallback(
    (get: () => string) => {
      snapshotRef.current = get;
    },
    [snapshotRef],
  );
  const tabs = [
    ["2d", "2D views"],
    ["3d", "3D"],
  ] as const;
  return (
    <section
      aria-labelledby="preview-heading"
      className={styles.section}
      data-testid="preview-section"
    >
      <h2 id="preview-heading" className={styles.h2}>
        3. Preview
      </h2>
      <p className={styles.muted}>
        {box.name} · outside {formatMm(box)} · {fit.placements.length} items
      </p>
      <div role="tablist" aria-label="Preview type" className={styles.tabs}>
        {tabs.map(([k, label]) => (
          <button
            key={k}
            type="button"
            role="tab"
            id={`tab-${k}`}
            aria-selected={tab === k}
            aria-controls={`panel-${k}`}
            className={styles.tab}
            onClick={() => setTab(k)}
          >
            {label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {gl === false ? (
          <>
            {tab === "3d" && (
              <p role="status" className={styles.notice}>
                3D isn&apos;t available in this browser, so here is the to-scale 2D view.
              </p>
            )}
            <HamperPreview2D fit={fit} items={drawn} box={box3d} />
          </>
        ) : gl && tab === "2d" ? (
          <HamperRendered2D fit={fit} items={models} box={box3d} />
        ) : gl ? (
          <HamperPreview3D fit={fit} items={models} box={box3d} onSnapshot={onSnapshot} />
        ) : null}
      </div>
    </section>
  );
}

/** Step-by-step packing order for the warehouse: bottom layer first, positions from the box's back-left corner. */
function PackingPlan({
  fit,
  byId,
}: {
  fit: FitResult;
  byId: Map<string, BuilderItem>;
}) {
  const layers = [...new Set(fit.placements.map((p) => p.z))].sort(
    (a, b) => a - b,
  );
  const rows = [...fit.placements].sort(
    (a, b) => a.z - b.z || a.y - b.y || a.x - b.x,
  );
  return (
    <details className={styles.plan} open>
      <summary>
        Packing plan ({fit.placements.length}{" "}
        {fit.placements.length === 1 ? "item" : "items"})
      </summary>
      <table className={styles.planTable} aria-label="Packing plan">
        <thead>
          <tr>
            <th scope="col">Layer</th>
            <th scope="col">Item</th>
            <th scope="col">Position (mm)</th>
            <th scope="col">Placed size (mm)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr
              key={`${p.productId}-${p.index}`}
              data-product={p.productId}
              data-x={p.x}
              data-y={p.y}
              data-z={p.z}
              data-l={p.l}
              data-b={p.b}
              data-h={p.h}
            >
              <td>{layers.indexOf(p.z) + 1}</td>
              <td>{byId.get(p.productId)?.name ?? p.productId}</td>
              <td>
                {p.x}, {p.y}, {p.z}
              </td>
              <td>
                {p.l} × {p.b} × {p.h}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className={styles.muted}>
        Measured inside the {fit.usable.lengthMm} × {fit.usable.breadthMm} ×{" "}
        {fit.usable.heightMm} mm space left after padding, from the back-left
        floor corner.
      </p>
    </details>
  );
}

function FillMeter({ fit }: { fit: FitResult }) {
  const pct = Math.min(100, fit.fillPercent);
  const weightPct = Math.min(100, (fit.weightG / fit.maxLoadG) * 100);
  const label = `${fit.fillPercent} % full · ${formatKg(fit.weightG)} of ${formatKg(fit.maxLoadG)}`;
  return (
    <section
      className={styles.meter}
      aria-label="Hamper fill"
      data-testid="fill-meter"
    >
      <p className={styles.meterText} aria-live="polite">
        {label}
      </p>
      <div className={styles.bars}>
        <div
          role="meter"
          aria-label="Space used"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          className={styles.bar}
        >
          <span style={{ transform: `scaleX(${pct / 100})` }} data-over={!fit.ok || undefined} />
        </div>
        <div
          role="meter"
          aria-label="Weight used"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(weightPct)}
          className={styles.bar}
        >
          <span style={{ transform: `scaleX(${weightPct / 100})` }} />
        </div>
      </div>
      {!fit.ok && (
        <p role="alert" className={styles.reason}>
          {fit.reasons.map((r) => FIT_REASON_TEXT[r]).join(". ")}
        </p>
      )}
    </section>
  );
}
