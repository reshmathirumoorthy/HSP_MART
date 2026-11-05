"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRfp } from "@/context/RfpContext";
import styles from "./CustomHamperBuilder.module.css";

const STORAGE_KEY = "hsp-mart-hamper-draft";

const boxes = [
  { name: "Classic Matte Rigid Box", price: 250 },
  { name: "Wooden Executive Trunk", price: 450 },
  { name: "Organic Canvas Tote", price: 180 },
];

const fillers = [
  {
    name: "Genuine Leather Journal",
    price: 420,
    image:
      "https://images.unsplash.com/photo-1544816155-12df9643f363?q=80&w=300&auto=format&fit=crop",
  },
  {
    name: "Matte Black Thermal Tumbler",
    price: 580,
    image:
      "https://images.unsplash.com/photo-1517256064527-09c73fc73e38?q=80&w=300&auto=format&fit=crop",
  },
  {
    name: "Brass Metallic Rollerball Pen",
    price: 350,
    image:
      "https://images.unsplash.com/photo-1585336261026-8f5786372966?q=80&w=300&auto=format&fit=crop",
  },
];

function inr(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

function shortName(name: string) {
  return name
    .replace("Genuine ", "")
    .replace("Matte Black ", "")
    .replace("Brass Metallic Rollerball ", "Brass Metallic ");
}

function readHamperDraft(): { boxIndex: number; selected: string[] } {
  if (typeof window === "undefined") {
    return { boxIndex: 0, selected: [] };
  }
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { boxIndex: 0, selected: [] };
    const parsed = JSON.parse(raw) as {
      boxIndex?: number;
      selected?: string[];
    };
    const nextIndex =
      typeof parsed.boxIndex === "number" &&
      parsed.boxIndex >= 0 &&
      parsed.boxIndex < boxes.length
        ? parsed.boxIndex
        : 0;
    const nextSelected = Array.isArray(parsed.selected)
      ? parsed.selected.filter((n) => fillers.some((f) => f.name === n))
      : [];
    return { boxIndex: nextIndex, selected: nextSelected };
  } catch {
    return { boxIndex: 0, selected: [] };
  }
}

export function CustomHamperBuilder() {
  const { addItem } = useRfp();
  const [boxIndex, setBoxIndex] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const errorId = useId();
  const statusId = useId();
  const canPersist = useRef(false);

  useEffect(() => {
    const draft = readHamperDraft();
    // Client-only restore after hydration (sessionStorage is unavailable on SSR).
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional session restore
    setBoxIndex(draft.boxIndex);
    setSelected(draft.selected);
    canPersist.current = true;
  }, []);

  useEffect(() => {
    if (!canPersist.current) return;
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ boxIndex, selected }),
      );
    } catch {
      /* ignore */
    }
  }, [boxIndex, selected]);

  const box = boxes[boxIndex];
  const selectedItems = useMemo(
    () => fillers.filter((f) => selected.includes(f.name)),
    [selected],
  );
  const unit = useMemo(() => {
    const itemsTotal = selectedItems.reduce((sum, f) => sum + f.price, 0);
    return box.price + itemsTotal;
  }, [box, selectedItems]);

  const toggle = (name: string) => {
    setError(null);
    setStatus(null);
    setSelected((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name],
    );
  };

  const save = () => {
    if (selectedItems.length === 0) {
      setError("Select at least one curated item before requesting a sample.");
      setStatus(null);
      return;
    }
    setError(null);
    addItem({
      name: "Custom Curated Gift Box",
      price: unit,
      qty: 50,
    });
    setStatus(
      "Hamper estimate added to your RFP list. Continue in the proposal drawer.",
    );
  };

  return (
    <section
      id="custom-hamper"
      className={styles.section}
      data-nav-surface="light"
      aria-labelledby="hamper-heading"
    >
      <div className="shell">
        <header className={styles.header}>
          <span className={styles.eyebrow}>Bespoke Curation</span>
          <h2 id="hamper-heading" className={styles.title}>
            Build Your Custom Corporate Gift Box
          </h2>
          <p className={styles.lead}>
            Curate luxury items, personalize packaging, and get an estimated
            custom box price. Final quotes are confirmed after review.
          </p>
          <p className={styles.progress} aria-live="polite">
            Step {selectedItems.length === 0 ? "1–2" : "2"} of 2 ·{" "}
            {selectedItems.length === 0
              ? "No items selected"
              : selectedItems.length === 1
                ? "1 item selected"
                : `${selectedItems.length} items selected`}
          </p>
        </header>

        <div className={styles.layout}>
          <div className={styles.steps}>
            <div className={styles.panel}>
              <h3 className={styles.stepTitle}>
                <span>1</span> Choose Packaging Style
              </h3>
              <div
                className={styles.boxGrid}
                role="radiogroup"
                aria-label="Packaging style"
              >
                {boxes.map((b, i) => (
                  <button
                    key={b.name}
                    type="button"
                    role="radio"
                    aria-checked={i === boxIndex}
                    className={`${styles.boxOption} ${i === boxIndex ? styles.boxActive : ""}`}
                    onClick={() => {
                      setBoxIndex(i);
                      setError(null);
                      setStatus(null);
                    }}
                  >
                    <strong>{b.name}</strong>
                    <span>{inr(b.price)} / box</span>
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.panel}>
              <h3 className={styles.stepTitle}>
                <span>2</span> Select Curated Items to Include
              </h3>
              <div className={styles.itemGrid}>
                {fillers.map((item) => {
                  const on = selected.includes(item.name);
                  return (
                    <button
                      key={item.name}
                      type="button"
                      aria-pressed={on}
                      className={`${styles.itemCard} ${on ? styles.itemOn : ""}`}
                      onClick={() => toggle(item.name)}
                    >
                      {on ? <span className={styles.added}>Added</span> : null}
                      <span className={styles.thumb}>
                        <Image
                          src={item.image}
                          alt=""
                          fill
                          sizes="160px"
                          className={styles.thumbImg}
                        />
                      </span>
                      <strong>{shortName(item.name)}</strong>
                      <em>{inr(item.price)}</em>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <aside
            className={styles.summary}
            aria-labelledby="hamper-summary-title"
          >
            <h3 id="hamper-summary-title" className={styles.summaryTitle}>
              Custom Hamper Summary
            </h3>
            <div className={styles.lines}>
              <div className={styles.line}>
                <span>
                  Box: <strong>{box.name}</strong>
                </span>
                <span>{inr(box.price)}</span>
              </div>
              {selectedItems.map((f) => (
                <div key={f.name} className={styles.line}>
                  <span>+ {shortName(f.name)}</span>
                  <span className={styles.lineActions}>
                    {inr(f.price)}
                    <button
                      type="button"
                      className={styles.removeLine}
                      aria-label={`Remove ${shortName(f.name)}`}
                      onClick={() => toggle(f.name)}
                    >
                      Remove
                    </button>
                  </span>
                </div>
              ))}
              {selectedItems.length === 0 ? (
                <p className={styles.emptyHint}>No curated items selected yet.</p>
              ) : null}
            </div>
            <div className={styles.unitRow}>
              <span>Estimated cost per hamper:</span>
              <strong>{inr(unit)}</strong>
            </div>
            {error ? (
              <p id={errorId} className={styles.error} role="alert">
                {error}
              </p>
            ) : null}
            {status ? (
              <p id={statusId} className={styles.status} role="status">
                {status}
              </p>
            ) : null}
            <button
              type="button"
              className={styles.cta}
              aria-describedby={error ? errorId : status ? statusId : undefined}
              onClick={save}
            >
              Save Hamper &amp; Request Sample
            </button>
            <p className={styles.note}>
              Adds an estimate to your RFP list (qty 50). Not a confirmed order.
            </p>
          </aside>
        </div>
      </div>
    </section>
  );
}
