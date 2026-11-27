/**
 * "3D model" panel on the product editor (docs/hamper-builder-plan.md, step 6). The admin either uploads a .glb model
 * or photographs every side; the portal builds the model at the product's real size and shows it live.
 * Products and boxes are offered in the hamper builder only when this is complete.
 */
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { api } from "../api";
import { btnGhost, Field, input } from "../ui";
import { buildProductObject, FACES, modelMissing, REQUIRED_FACES, type Dims, type Face, type Model3d } from "../lib/product3d";

type Upload = { url: string; contentType: string };

const FACE_LABEL: Record<Face, string> = { front: "Front", back: "Back", left: "Left side", right: "Right side", top: "Top", bottom: "Bottom" };

export function Model3dPanel({
  productId, creating, canEdit, isBox, dims, model, onModel, onFace, image2d, onImage2d, filler, onFiller,
}: {
  productId: string; creating: boolean; canEdit: boolean; isBox: boolean; dims: Partial<Dims>;
  model: Model3d | undefined; onModel: (m: Model3d | undefined) => void;
  /** Sets one side photo, merged into the latest model (several uploads can finish close together). */
  onFace: (face: Face, url: string) => void;
  image2d: string | undefined; onImage2d: (u: string | undefined) => void;
  filler: "shred" | "none"; onFiller: (f: "shred" | "none") => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Remembered separately: switching to "upload a file" has no model until the file is uploaded.
  const [mode, setMode] = useState<"photos" | "glb">(model?.kind ?? "photos");
  const shape = model?.kind === "photos" ? model.shape : "box";
  const faces = model?.kind === "photos" ? model.faces : {};

  const upload = async (file: File, slot: string): Promise<Upload | null> => {
    setBusy(slot);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      return await api<Upload>(`/admin/products/${productId}/media`, fd);
    } catch (e) {
      setError((e as Error).message);
      return null;
    } finally {
      setBusy(null);
    }
  };

  const complete = dims.lengthMm && dims.breadthMm && dims.heightMm;
  const missing = [
    ...(!complete ? ["length × breadth × height"] : []),
    ...modelMissing(model),
    ...(!isBox && !image2d ? ["2D photo"] : []),
  ];

  if (creating) {
    return <p className="text-sm text-muted">Save the product first, then add its 2D photo and 3D model here.</p>;
  }
  return (
    <div className="space-y-4" data-testid="model3d-panel">
      <p aria-live="polite" data-testid="hamper-readiness"
        className={`rounded-md px-3 py-2 text-sm ${missing.length ? "bg-amber-50 text-amber-900" : "bg-green-50 text-good"}`}>
        {missing.length ? `Not in the hamper builder yet. Missing: ${missing.join(", ")}.` : "Ready for the hamper builder."}
      </p>

      {!isBox && (
        <Field label="2D photo (the product alone, PNG with a clear background)">
          <div className="flex items-center gap-3">
            {image2d && <img src={image2d} alt="2D photo" className="h-14 w-14 rounded bg-white object-contain" />}
            <input aria-label="Upload 2D photo" type="file" accept="image/png,image/jpeg,image/webp" disabled={!canEdit || !!busy}
              onChange={async (e) => { const f = e.target.files?.[0]; if (f) { const u = await upload(f, "2d"); if (u) onImage2d(u.url); } e.target.value = ""; }} />
          </div>
        </Field>
      )}

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">How to make the 3D model</legend>
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" name="model-mode" checked={mode === "photos"} disabled={!canEdit}
            onChange={() => { setMode("photos"); onModel(model?.kind === "photos" ? model : undefined); }} /> Build it here from photos of every side
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" name="model-mode" checked={mode === "glb"} disabled={!canEdit}
            onChange={() => { setMode("glb"); onModel(model?.kind === "glb" ? model : undefined); }} /> Upload a 3D model file (.glb)
        </label>
      </fieldset>

      {mode === "photos" ? (
        <>
          <Field label="Shape">
            <select className={input} value={shape} disabled={!canEdit}
              onChange={(e) => onModel({ kind: "photos", shape: e.target.value as "box" | "round", faces })}>
              <option value="box">{isBox ? "Box (rectangular)" : "Box shape (books, boxes, packs)"}</option>
              {!isBox && <option value="round">Round (bottles, mugs, jars, tins)</option>}
            </select>
          </Field>
          <p className="text-xs text-muted">
            Photograph each side straight on, filling the frame. {isBox ? "The top photo is the lid as delivered." : ""}
            {shape === "round" ? " The four side photos are wrapped around the product in order: front, right, back, left." : ""}
          </p>
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {FACES.map((f) => {
              const required = REQUIRED_FACES[shape].includes(f);
              return (
                <li key={f} className="rounded-md border border-line p-2 text-xs">
                  <p className="mb-1 font-medium">{FACE_LABEL[f]}{required ? "" : " (optional)"}</p>
                  <div className="mb-1 flex h-20 items-center justify-center rounded bg-white">
                    {faces[f] ? <img src={faces[f]} alt={`${FACE_LABEL[f]} photo`} className="max-h-20 max-w-full object-contain" /> : <span className="text-muted">No photo</span>}
                  </div>
                  <input aria-label={`Upload ${f} photo`} type="file" accept="image/png,image/jpeg,image/webp" disabled={!canEdit || !!busy} className="w-full"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (!file) return;
                      const u = await upload(file, f);
                      if (u) onFace(f, u.url);
                    }} />
                  {faces[f] && canEdit && (
                    <button type="button" className={`${btnGhost} mt-1`} onClick={() => { const n = { ...faces }; delete n[f]; onModel({ kind: "photos", shape, faces: n }); }}>
                      Remove
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <Field label="3D model file (.glb, up to 25 MB)">
          <input aria-label="Upload 3D model file" type="file" accept=".glb,model/gltf-binary" disabled={!canEdit || !!busy}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              const u = await upload(file, "glb");
              if (u) onModel({ kind: "glb", url: u.url });
            }} />
          {model?.kind === "glb" && <p className="mt-1 text-xs text-muted">Uploaded. It is resized to the product&apos;s length, breadth and height.</p>}
        </Field>
      )}

      {isBox && (
        <Field label="Ships with">
          <select className={input} value={filler} disabled={!canEdit} onChange={(e) => onFiller(e.target.value as "shred" | "none")}>
            <option value="shred">Shredded-paper filler</option>
            <option value="none">No filler</option>
          </select>
        </Field>
      )}

      {busy && <p aria-live="polite" className="text-xs text-muted">Uploading…</p>}
      {error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-bad">{error}</p>}

      {model && complete ? <LivePreview model={model} dims={dims as Dims} /> : null}
    </div>
  );
}

/** Rotatable preview of the model exactly as the hamper builder will draw it. */
function LivePreview({ model, dims }: { model: Model3d; dims: Dims }) {
  const host = useRef<HTMLDivElement>(null);
  const key = JSON.stringify([model, dims]);
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let frame = 0;
    let disposed = false;
    const w = el.clientWidth || 360;
    const h = Math.round(w * 0.75);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.setAttribute("aria-hidden", "true");
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffffff, 0x887766, 1.6));
    const sun = new THREE.DirectionalLight(0xffffff, 1.6);
    sun.position.set(1, 2, 1.5);
    scene.add(sun);
    const span = Math.max(dims.lengthMm, dims.breadthMm, dims.heightMm);
    const camera = new THREE.PerspectiveCamera(35, w / h, 1, span * 20);
    camera.position.set(span * 1.3, span * 1.1, span * 1.7);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, dims.heightMm / 2, 0);
    controls.autoRotate = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    void buildProductObject(model, dims).then((obj) => {
      if (disposed) return;
      scene.add(obj);
      el.dataset.ready = "true";
      el.dataset.model = model.kind;
    }).catch((e) => { el.dataset.error = String(e); });
    const tick = () => { controls.update(); renderer.render(scene, camera); frame = requestAnimationFrame(tick); };
    tick();
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      controls.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      delete el.dataset.ready;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- rebuilt when the model or size changes (key)
  }, [key]);
  return (
    <figure className="space-y-1">
      <div ref={host} data-testid="model3d-preview" role="img" aria-label="Live 3D preview of the product at its real size"
        className="w-full cursor-grab overflow-hidden rounded-md bg-gradient-to-b from-white to-stone-100" />
      <figcaption className="text-xs text-muted">Drag to turn it. This is how it appears in the hamper preview, at {dims.lengthMm} × {dims.breadthMm} × {dims.heightMm} mm.</figcaption>
    </figure>
  );
}
