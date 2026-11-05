"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { useCompare } from "@/context/CompareContext";
import styles from "./discovery.module.css";

function CompareBarBody({
  count,
  limitMessage,
  onClear,
  onHide,
  onDismissLimit,
  hideLabelId,
}: {
  count: number;
  limitMessage: string | null;
  onClear: () => void;
  onHide: () => void;
  onDismissLimit: () => void;
  hideLabelId?: string;
}) {
  return (
    <div className={`shell ${styles.compareBarInner}`}>
      <div className={styles.compareBarCopy}>
        <p className={styles.compareBarLabel}>Compare</p>
        <p className={styles.compareBarMeta}>
          {count} {count === 1 ? "product" : "products"} selected
        </p>
      </div>
      <div className={styles.compareBarActions}>
        {count >= 2 ? (
          <Link href="/compare" className="btn btn--dark">
            View comparison
          </Link>
        ) : (
          <span className={styles.pageCopy}>Select one more product</span>
        )}
        <button
          type="button"
          className={styles.ghost}
          onClick={onHide}
          aria-describedby={hideLabelId}
        >
          Hide
        </button>
        <button type="button" className={styles.ghost} onClick={onClear}>
          Clear
        </button>
      </div>
      {hideLabelId ? (
        <p id={hideLabelId} className="sr-only">
          Hides this tray. Your comparison list stays saved on this device.
        </p>
      ) : null}
      {limitMessage ? (
        <div className={styles.compareLimit} role="status">
          <span>{limitMessage} Remove one to add another.</span>
          <Link href="/compare" className={styles.ghost}>
            View comparison
          </Link>
          <button type="button" className={styles.ghost} onClick={onDismissLimit}>
            Dismiss
          </button>
        </div>
      ) : null}
    </div>
  );
}

function otherOverlayOpen() {
  if (typeof document === "undefined") return false;
  return Boolean(
    document.querySelector(
      '[aria-modal="true"], dialog[open], [data-search-open="true"]',
    ),
  );
}

export function CompareBar() {
  const pathname = usePathname();
  const {
    ids,
    count,
    hydrated,
    limitMessage,
    clearCompare,
    dismissLimitMessage,
  } = useCompare();
  const hideHintId = useId();
  /** When set to the current ids signature, the tray is hidden without clearing compare data. */
  const [hiddenForKey, setHiddenForKey] = useState<string | null>(null);
  const idsKey = ids.join("|");
  const trayHidden = hiddenForKey === idsKey;

  const hideOnRoute =
    pathname === "/compare" ||
    pathname === "/cart" ||
    pathname === "/checkout" ||
    pathname.startsWith("/checkout/");
  const eligible = hydrated && count >= 1 && !hideOnRoute;
  const visible = eligible && !trayHidden;

  const hideTray = () => setHiddenForKey(idsKey);

  useEffect(() => {
    if (!visible) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (event.defaultPrevented) return;
      if (otherOverlayOpen()) return;
      event.preventDefault();
      setHiddenForKey(idsKey);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [visible, idsKey]);

  if (!eligible) return null;
  if (!visible) return null;

  return (
    <>
      <div className={styles.compareSpacer} inert aria-hidden="true">
        <CompareBarBody
          count={count}
          limitMessage={limitMessage}
          onClear={clearCompare}
          onHide={hideTray}
          onDismissLimit={dismissLimitMessage}
        />
      </div>
      <div
        className={styles.compareBar}
        role="region"
        aria-label="Product comparison"
        data-compare-open="true"
      >
        <CompareBarBody
          count={count}
          limitMessage={limitMessage}
          onClear={clearCompare}
          onHide={hideTray}
          onDismissLimit={dismissLimitMessage}
          hideLabelId={hideHintId}
        />
      </div>
    </>
  );
}
