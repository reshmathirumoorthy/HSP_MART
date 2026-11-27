/**
 * One 3D scene of the packed hamper, shared by the rotatable 3D view and the 2D (orthographic) views, so both always
 * show the same thing: the box built from its own model, the filler it ships with, and every product from its own
 * model at its packed position and orientation. Units: 1 = 1 mm.
 */
import * as THREE from "three";
import type { FitResult } from "@/lib/hamperPacking";
import { buildProductObject, orientTo, type Dims, type Model3d } from "@/lib/product3d";
import { boxPalette, mulberry32 } from "./hamperLook";

export type SceneItem = { name: string; model3d: Model3d; dims: Dims };
export type SceneBox = Dims & {
  wallThicknessMm: number;
  boxStyle: "kraft" | "rigid" | "basket";
  filler: "shred" | "none";
  model3d: Model3d;
};

export type HamperScene = {
  scene: THREE.Scene;
  /** The soft floor shadow, hidden in the flat 2D views. */
  ground: THREE.Object3D;
  group: THREE.Group;
  /** Hidden for the front cut-away view. */
  frontWall: THREE.Object3D | null;
  lid: THREE.Object3D | null;
  span: number;
  dispose: () => void;
};

export async function buildHamperScene(fit: FitResult, items: Map<string, SceneItem>, box: SceneBox): Promise<HamperScene> {
  const disposables: { dispose: () => void }[] = [];
  const track = <T extends { dispose: () => void }>(x: T) => (disposables.push(x), x);
  const scene = new THREE.Scene();
  const { lengthMm: L, breadthMm: B, heightMm: H, wallThicknessMm: t } = box;
  const span = Math.max(L, B, H);

  scene.add(new THREE.HemisphereLight(0xfff8ee, 0x8a7560, 1.4));
  const sun = new THREE.DirectionalLight(0xffffff, 2.1);
  sun.position.set(span * 0.6, span * 2.2, span * 1.2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.radius = 6;
  sun.shadow.bias = -0.0005;
  const sc = sun.shadow.camera as THREE.OrthographicCamera;
  sc.left = sc.bottom = -span;
  sc.right = sc.top = span;
  sc.far = span * 5;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xffeedd, 0.6);
  fill.position.set(-span, span * 0.8, -span * 0.4);
  scene.add(fill);

  const ground = new THREE.Mesh(track(new THREE.PlaneGeometry(span * 6, span * 6)), track(new THREE.ShadowMaterial({ opacity: 0.22 })));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -H / 2 - 0.5;
  ground.receiveShadow = true;
  scene.add(ground);

  const group = new THREE.Group();
  group.position.set(-L / 2, -H / 2, -B / 2);
  scene.add(group);

  // ── Box ──
  const look = boxPalette(box.boxStyle);
  let frontWall: THREE.Object3D | null = null;
  let lid: THREE.Object3D | null = null;
  if (box.model3d.kind === "glb") {
    // A supplied model of the open box: use it as is, at the box's size.
    const shell = await buildProductObject(box.model3d, box);
    shell.position.set(L / 2, 0, B / 2);
    group.add(shell);
  } else {
    const faces = box.model3d.faces;
    const loader = new THREE.TextureLoader();
    const load = (url?: string) => {
      if (!url) return null;
      const tx = track(loader.load(url));
      tx.colorSpace = THREE.SRGBColorSpace;
      return tx;
    };
    const outer = (url?: string) => track(new THREE.MeshStandardMaterial({ map: load(url), color: url ? 0xffffff : look.outer, roughness: 0.85 }));
    const innerMat = track(new THREE.MeshStandardMaterial({ color: look.inner, roughness: 0.95 }));
    const rimMat = track(new THREE.MeshStandardMaterial({ color: look.rim, roughness: 0.6 }));
    // Face order: +x, -x, +y, -y, +z, -z. Outside faces carry the box's own photos; inside faces its lining colour.
    const wall = (w: number, h: number, d: number, x: number, z: number, mats: THREE.Material[], name: string) => {
      const m = new THREE.Mesh(track(new THREE.BoxGeometry(w, h, d)), mats);
      m.position.set(x + w / 2, h / 2, z + d / 2);
      m.castShadow = m.receiveShadow = true;
      m.name = name;
      group.add(m);
      return m;
    };
    const floor = new THREE.Mesh(track(new THREE.BoxGeometry(L, t, B)), [innerMat, innerMat, innerMat, outer(faces.bottom), innerMat, innerMat]);
    floor.position.set(L / 2, t / 2, B / 2);
    floor.receiveShadow = true;
    group.add(floor);
    frontWall = wall(L, H, t, 0, B - t, [rimMat, rimMat, rimMat, rimMat, outer(faces.front), innerMat], "wall-front");
    wall(L, H, t, 0, 0, [rimMat, rimMat, rimMat, rimMat, innerMat, outer(faces.back)], "wall-back");
    wall(t, H, B - 2 * t, 0, t, [innerMat, outer(faces.left), rimMat, rimMat, rimMat, rimMat], "wall-left");
    wall(t, H, B - 2 * t, L - t, t, [outer(faces.right), innerMat, rimMat, rimMat, rimMat, rimMat], "wall-right");
    // Lid: the top photo is the lid as delivered.
    const lidGroup = new THREE.Group();
    const lidDepth = Math.min(40, H * 0.25);
    const lidTop = new THREE.Mesh(track(new THREE.BoxGeometry(L + 6, t, B + 6)),
      [rimMat, rimMat, outer(faces.top), innerMat, rimMat, rimMat]);
    lidTop.position.set(L / 2, H + lidDepth - t / 2, B / 2);
    lidTop.castShadow = true;
    lidGroup.add(lidTop);
    for (const [w, d, x, z] of [[L + 6, t, L / 2, -3 + t / 2], [L + 6, t, L / 2, B + 3 - t / 2], [t, B + 6, -3 + t / 2, B / 2], [t, B + 6, L + 3 - t / 2, B / 2]]) {
      const skirt = new THREE.Mesh(track(new THREE.BoxGeometry(w, lidDepth, d)), rimMat);
      skirt.position.set(x, H + lidDepth / 2, z);
      lidGroup.add(skirt);
    }
    lidGroup.visible = false;
    group.add(lidGroup);
    lid = lidGroup;
  }

  // ── Filler, only when the box ships with it ──
  const pad = (L - fit.usable.lengthMm) / 2;
  const fillDepth = box.filler === "shred" ? Math.max(pad + 6, Math.min(40, H * 0.22)) : 0;
  if (box.filler === "shred") addShred(group, box, look.shred, fillDepth, track);

  // ── Products, each from its own model ──
  const objects = await Promise.all(
    fit.placements.map(async (p) => {
      const it = items.get(p.productId);
      if (!it) return null;
      const obj = await buildProductObject(it.model3d, it.dims).catch(() => null);
      return obj ? orientTo(obj, it.dims, p) : null;
    }),
  );
  fit.placements.forEach((p, i) => {
    const obj = objects[i];
    if (!obj) return;
    obj.position.set(pad + p.x + p.l / 2, t + p.z + (p.z === 0 ? fillDepth * 0.45 : 0), pad + p.y + p.b / 2);
    obj.name = p.productId;
    obj.userData.item = true;
    group.add(obj);
  });

  return {
    scene,
    ground,
    group,
    frontWall,
    lid,
    span,
    dispose: () => {
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          m.geometry?.dispose();
          (Array.isArray(m.material) ? m.material : [m.material]).forEach((mat) => mat?.dispose());
        }
      });
      disposables.forEach((d) => d.dispose());
    },
  };
}

function addShred(group: THREE.Group, box: SceneBox, colours: string[], fillDepth: number,
  track: <T extends { dispose: () => void }>(x: T) => T) {
  const { lengthMm: L, breadthMm: B, heightMm: H, wallThicknessMm: t } = box;
  const rand = mulberry32(L * 31 + B * 17 + H);
  const inL = L - 2 * t, inB = B - 2 * t;
  const bedGeo = track(new THREE.PlaneGeometry(inL, inB, Math.max(8, Math.round(inL / 8)), Math.max(8, Math.round(inB / 8))));
  const pos = bedGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i);
    const atWall = Math.min(inL / 2 - Math.abs(x), inB / 2 - Math.abs(y)) < 10;
    pos.setZ(i, (atWall ? 6 : 0) + (rand() - 0.5) * 5 + Math.sin(x * 0.09) * Math.cos(y * 0.11) * 2.5);
  }
  bedGeo.computeVertexNormals();
  const tex = track(shredTexture(colours, L + B));
  tex.repeat.set(inL / 160, inB / 160);
  const bed = new THREE.Mesh(bedGeo, track(new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 })));
  bed.rotation.x = -Math.PI / 2;
  bed.position.set(L / 2, t + fillDepth * 0.55, B / 2);
  bed.receiveShadow = true;
  group.add(bed);
  const count = Math.min(900, Math.round((inL * inB) / 160));
  const shreds = new THREE.InstancedMesh(track(new THREE.BoxGeometry(3.2, 0.5, 1)), track(new THREE.MeshStandardMaterial({ roughness: 0.9 })), count);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const c = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const len = 12 + rand() * 16;
    const margin = len / 2 + 3;
    e.set((rand() - 0.5) * 0.9, rand() * Math.PI, (rand() - 0.5) * 0.9);
    q.setFromEuler(e);
    m4.compose(new THREE.Vector3(t + margin + rand() * (inL - 2 * margin), t + fillDepth * 0.55 + rand() * 6, t + margin + rand() * (inB - 2 * margin)),
      q, new THREE.Vector3(1, 1, len));
    shreds.setMatrixAt(i, m4);
    c.set(colours[Math.floor(rand() * colours.length)]).offsetHSL(0, 0, (rand() - 0.5) * 0.08);
    shreds.setColorAt(i, c);
  }
  shreds.castShadow = shreds.receiveShadow = true;
  group.add(shreds);
}

function shredTexture(colours: string[], seed: number) {
  const size = 256;
  const cv = document.createElement("canvas");
  cv.width = cv.height = size;
  const ctx = cv.getContext("2d")!;
  ctx.fillStyle = colours[0];
  ctx.fillRect(0, 0, size, size);
  const rand = mulberry32(seed);
  ctx.lineCap = "round";
  for (let i = 0; i < 260; i++) {
    const x = rand() * size, y = rand() * size, len = 24 + rand() * 40, a = rand() * Math.PI;
    const ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len;
    const mx = (x + ex) / 2 + (rand() - 0.5) * 18, my = (y + ey) / 2 + (rand() - 0.5) * 18;
    ctx.strokeStyle = "rgba(60,40,20,0.25)";
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(x + 1.5, y + 2); ctx.quadraticCurveTo(mx + 1.5, my + 2, ex + 1.5, ey + 2); ctx.stroke();
    ctx.strokeStyle = colours[Math.floor(rand() * colours.length)];
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(mx, my, ex, ey); ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Renders the scene from straight above or straight in front (front wall cut away) as a PNG data URL. */
export function renderOrtho(h: HamperScene, box: Dims, view: "top" | "front", widthPx: number): string {
  const { lengthMm: L, breadthMm: B, heightMm: H } = box;
  const margin = 20;
  const w = L + 2 * margin;
  const hgt = (view === "top" ? B : H) + 2 * margin;
  const cam = new THREE.OrthographicCamera(-w / 2, w / 2, hgt / 2, -hgt / 2, 1, h.span * 10);
  if (view === "top") {
    cam.position.set(0, h.span * 3, 0);
    cam.up.set(0, 0, -1);
    cam.lookAt(0, 0, 0);
  } else {
    cam.position.set(0, 0, h.span * 3);
    cam.lookAt(0, 0, 0);
  }
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(widthPx, Math.round((widthPx * hgt) / w));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  // Shadows add depth looking down; straight on they only smear across the back wall.
  renderer.shadowMap.enabled = view === "top";
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const hideFront = view === "front" && h.frontWall;
  if (hideFront) h.frontWall!.visible = false;
  h.ground.visible = false;
  renderer.render(h.scene, cam);
  const url = renderer.domElement.toDataURL("image/png");
  h.ground.visible = true;
  if (hideFront) h.frontWall!.visible = true;
  renderer.dispose();
  renderer.forceContextLoss();
  return url;
}
