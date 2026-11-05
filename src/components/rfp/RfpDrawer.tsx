"use client";

import { useEffect, useId, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRfp } from "@/context/RfpContext";
import { getFocusableElements, trapTabKey } from "@/lib/focusTrap";
import styles from "./RfpDrawer.module.css";

function inr(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

export function RfpDrawer() {
  const router = useRouter();
  const { items, isOpen, closeRfp, removeItem, clear } = useRfp();
  const panelRef = useRef<HTMLElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    if (!isOpen) return;

    returnFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const panel = panelRef.current;
    const focusable = panel ? getFocusableElements(panel) : [];
    const initial = focusable[0] ?? panel;
    window.setTimeout(() => initial?.focus({ preventScroll: true }), 30);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRfp();
        return;
      }
      if (panel) trapTabKey(event, panel);
    };

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      returnFocusRef.current?.focus({ preventScroll: true });
    };
  }, [isOpen, closeRfp]);

  if (!isOpen) return null;

  const submit = () => {
    if (items.length === 0) return;
    const summary = items
      .map((i) => `${i.name} — est. ${inr(i.price)} × ${i.qty}`)
      .join("\n");
    try {
      sessionStorage.setItem("hsp-mart-rfp-draft", summary);
    } catch {
      /* ignore */
    }
    clear();
    closeRfp();
    router.push("/bulk-quote");
  };

  return (
    <div className={styles.root}>
      <button
        type="button"
        className={styles.backdrop}
        aria-label="Close proposal drawer"
        tabIndex={-1}
        onClick={closeRfp}
      />
      <aside
        ref={panelRef}
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        tabIndex={-1}
      >
        <header className={styles.header}>
          <div>
            <h2 id={titleId} className={styles.title}>
              Bulk Proposal Request (RFP)
            </h2>
            <p id={descId} className={styles.sub}>
              Compile items for a formal corporate quotation. Estimates are not
              final pricing.
            </p>
          </div>
          <button
            type="button"
            className={styles.close}
            aria-label="Close proposal drawer"
            onClick={closeRfp}
          >
            ×
          </button>
        </header>

        <div className={styles.body}>
          {items.length === 0 ? (
            <div className={styles.empty} role="status">
              <p>Your inquiry list is empty.</p>
              <p>Add products from the catalogue or start a bulk quote.</p>
              <div className={styles.emptyActions}>
                <Link
                  href="/products"
                  className={styles.emptyPrimary}
                  onClick={closeRfp}
                >
                  Browse catalogue
                </Link>
                <Link
                  href="/bulk-quote"
                  className={styles.emptySecondary}
                  onClick={closeRfp}
                >
                  Open bulk quote form
                </Link>
              </div>
            </div>
          ) : (
            <>
              <ul className={styles.list}>
                {items.map((item, idx) => (
                  <li key={`${item.name}-${idx}`} className={styles.item}>
                    <div>
                      <h3>{item.name}</h3>
                      <p>
                        Est. Rate: {inr(item.price)} × {item.qty} units
                      </p>
                    </div>
                    <button
                      type="button"
                      className={styles.remove}
                      aria-label={`Remove ${item.name}`}
                      onClick={() => removeItem(idx)}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
              <p className={styles.formHint}>
                Continue to the bulk quote form with these estimate notes. Final
                pricing is confirmed through the quote process — this does not
                place an order.
              </p>
            </>
          )}
        </div>

        <footer className={styles.footer}>
          <button
            type="button"
            className={styles.submit}
            disabled={items.length === 0}
            onClick={submit}
          >
            Continue to Bulk Quote Form
          </button>
        </footer>
      </aside>
    </div>
  );
}
