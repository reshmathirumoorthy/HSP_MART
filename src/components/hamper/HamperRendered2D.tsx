"use client";

/**
 * 2D views rendered from the same 3D scene as the 3D tab (straight down, and straight in with the front wall cut
 * away), so 2D and 3D always show the same hamper. Loaded only in browsers with WebGL.
 */
import { useEffect, useState } from "react";
import type { FitResult } from "@/lib/hamperPacking";
import { buildHamperScene, renderOrtho, type SceneBox, type SceneItem } from "./hamperScene";
import styles from "./HamperPreview.module.css";

export default function HamperRendered2D({ fit, items, box }: { fit: FitResult; items: Map<string, SceneItem>; box: SceneBox }) {
  const [views, setViews] = useState<{ top: string; front: string } | null>(null);
  useEffect(() => {
    let live = true;
    void buildHamperScene(fit, items, box).then((h) => {
      if (live) setViews({ top: renderOrtho(h, box, "top", 900), front: renderOrtho(h, box, "front", 900) });
      h.dispose();
    });
    return () => {
      live = false;
    };
  }, [fit, items, box]);

  const n = fit.placements.length;
  const { lengthMm: L, breadthMm: B, heightMm: H } = box;
  return (
    <div className={styles.views} data-testid="preview-2d" data-rendered={views ? "true" : undefined} data-items={n}>
      {[
        { key: "top" as const, title: "Top view", size: `${L} × ${B} mm` },
        { key: "front" as const, title: "Front view", size: `${L} × ${H} mm` },
      ].map((v) => (
        <figure key={v.key} className={styles.view}>
          {views ? (
            // eslint-disable-next-line @next/next/no-img-element -- a data URL rendered in the browser
            <img src={views[v.key]} alt={`${v.title} of the hamper, ${v.size}, ${n} items`} data-view={v.key} className={styles.render} />
          ) : (
            <div className={styles.renderLoading} aria-hidden="true" />
          )}
          <figcaption className={styles.caption}>{v.title}{v.key === "front" ? ", front wall cut away" : ""} · {v.size}</figcaption>
        </figure>
      ))}
    </div>
  );
}
