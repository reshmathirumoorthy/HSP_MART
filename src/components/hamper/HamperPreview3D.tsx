"use client";

/**
 * Rotatable 3D hamper: the shared hamper scene (box from its own model, filler, every product from its own model at its
 * packed position) with orbit controls and a lid toggle. Loaded only when the 3D tab opens.
 */
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { FitResult } from "@/lib/hamperPacking";
import { buildHamperScene, type HamperScene, type SceneBox, type SceneItem } from "./hamperScene";
import styles from "./HamperPreview.module.css";

export default function HamperPreview3D({
  fit,
  items,
  box,
  onSnapshot,
}: {
  fit: FitResult;
  items: Map<string, SceneItem>;
  box: SceneBox;
  onSnapshot?: (getDataUrl: () => string) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [lidClosed, setLidClosed] = useState(false);
  const lidClosedRef = useRef(false);
  const sceneRef = useRef<HamperScene | null>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let disposed = false;
    let frame = 0;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const width = el.clientWidth || 600;
    const height = Math.round(width * 0.66);
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.setAttribute("aria-hidden", "true");
    renderer.domElement.dataset.testid = "hamper-3d-canvas";
    el.appendChild(renderer.domElement);

    const span = Math.max(box.lengthMm, box.breadthMm, box.heightMm);
    const camera = new THREE.PerspectiveCamera(32, width / height, 1, span * 20);
    camera.position.set(span * 0.3, span * 1.75, span * 1.3);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !reduce;
    controls.autoRotate = !reduce;
    controls.autoRotateSpeed = 0.7;
    controls.minDistance = span * 0.9;
    controls.maxDistance = span * 5;
    controls.maxPolarAngle = Math.PI * 0.49;
    controls.target.set(0, -box.heightMm * 0.25, 0);
    controls.addEventListener("start", () => (controls.autoRotate = false));
    onSnapshot?.(() => renderer.domElement.toDataURL("image/png"));

    void buildHamperScene(fit, items, box).then((h) => {
      if (disposed) return h.dispose();
      sceneRef.current = h;
      if (h.lid) h.lid.visible = lidClosedRef.current;
      const tick = () => {
        controls.update();
        renderer.render(h.scene, camera);
        frame = requestAnimationFrame(tick);
      };
      tick();
      const models = h.group.children.filter((o) => o.userData.item).map((o) => String(o.userData.model));
      el.dataset.models = models.join(",");
      el.dataset.items = String(models.length);
      el.dataset.ready = "true";
    });

    const onResize = () => {
      const w = el.clientWidth || width;
      const h = Math.round(w * 0.66);
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
      controls.dispose();
      sceneRef.current?.dispose();
      sceneRef.current = null;
      renderer.dispose();
      renderer.domElement.remove();
      delete el.dataset.ready;
    };
  }, [fit, items, box, onSnapshot]);

  useEffect(() => {
    lidClosedRef.current = lidClosed;
    if (sceneRef.current?.lid) sceneRef.current.lid.visible = lidClosed;
  }, [lidClosed]);

  return (
    <div className={styles.three}>
      <div ref={host} className={styles.canvasHost} data-testid="preview-3d"
        role="img" aria-label={`3D view of the hamper with ${fit.placements.length} items. Drag to turn it, scroll to zoom.`} />
      <label className={styles.toggle}>
        <input type="checkbox" checked={lidClosed} onChange={(e) => setLidClosed(e.target.checked)} /> Close the lid
      </label>
    </div>
  );
}
