/**
 * Builds a product's 3D model for the hamper previews from what the admin entered (docs/hamper-builder-plan.md,
 * step 6): an uploaded .glb model, or photos of each side on a box or round shape, always at the product's real size.
 *
 * SHARED FILE: an identical copy lives at admin/src/lib/product3d.ts (the admin app is built on its own).
 * scripts/verify-hamper-fit.ts fails if the two differ.
 *
 * Units: 1 = 1 mm. The returned object has its base centred on the origin: x = length, y = height, z = breadth,
 * front facing +z.
 */
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export type Face = "front" | "back" | "left" | "right" | "top" | "bottom";
export const FACES: Face[] = ["front", "back", "left", "right", "top", "bottom"];
export const REQUIRED_FACES: Record<"box" | "round", Face[]> = {
  box: FACES,
  round: ["front", "back", "left", "right", "top"],
};

export type Model3d =
  | { kind: "glb"; url: string }
  | { kind: "photos"; shape: "box" | "round"; faces: Partial<Record<Face, string>> };

export type Dims = { lengthMm: number; breadthMm: number; heightMm: number };

const textures = new Map<string, Promise<THREE.Texture>>();
const images = new Map<string, Promise<HTMLImageElement>>();

function loadImage(url: string) {
  let p = images.get(url);
  if (!p) {
    p = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Could not load ${url}`));
      img.src = url;
    });
    images.set(url, p);
  }
  return p;
}

function loadTexture(url: string) {
  let p = textures.get(url);
  if (!p) {
    p = loadImage(url).then((img) => {
      const t = new THREE.Texture(img);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 4;
      t.needsUpdate = true;
      return t;
    });
    textures.set(url, p);
  }
  return p;
}

const plain = (colour = "#d9cbb0") => new THREE.MeshStandardMaterial({ color: colour, roughness: 0.7 });
const photo = (map: THREE.Texture) => new THREE.MeshStandardMaterial({ map, roughness: 0.6 });

/** The product as a 3D object at its real size, base centred on the origin. */
export async function buildProductObject(model: Model3d, dims: Dims): Promise<THREE.Object3D> {
  const { lengthMm: L, breadthMm: B, heightMm: H } = dims;
  const group = new THREE.Group();
  group.userData.model = model.kind;

  if (model.kind === "glb") {
    const gltf = await new GLTFLoader().loadAsync(model.url);
    const obj = gltf.scene;
    const box = new THREE.Box3().setFromObject(obj);
    const size = box.getSize(new THREE.Vector3());
    // Fit the model exactly to the catalogue size (the source file's units don't matter).
    obj.scale.set(L / (size.x || 1), H / (size.y || 1), B / (size.z || 1));
    const scaled = new THREE.Box3().setFromObject(obj);
    const centre = scaled.getCenter(new THREE.Vector3());
    obj.position.set(-centre.x, -scaled.min.y, -centre.z);
    obj.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
    group.add(obj);
    return group;
  }

  const tex = async (f: Face) => (model.faces[f] ? loadTexture(model.faces[f]!) : null);
  if (model.shape === "box") {
    // three.js box face order: +x right, -x left, +y top, -y bottom, +z front, -z back.
    const order: Face[] = ["right", "left", "top", "bottom", "front", "back"];
    const maps = await Promise.all(order.map(tex));
    const mats = maps.map((m) => (m ? photo(m) : plain()));
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(L, H, B), mats);
    mesh.position.y = H / 2;
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
    return group;
  }

  // Round: the four side photos wrapped around (front, right, back, left), top and bottom on the caps.
  const sides = await Promise.all((["front", "right", "back", "left"] as Face[]).map((f) => (model.faces[f] ? loadImage(model.faces[f]!) : null)));
  const strip = document.createElement("canvas");
  const h = 512;
  const widths = sides.map((img) => (img ? Math.round((img.naturalWidth / img.naturalHeight) * h) : h));
  strip.width = widths.reduce((a, b) => a + b, 0);
  strip.height = h;
  const ctx = strip.getContext("2d")!;
  let x = 0;
  sides.forEach((img, i) => {
    if (img) ctx.drawImage(img, x, 0, widths[i], h);
    else {
      ctx.fillStyle = "#d9cbb0";
      ctx.fillRect(x, 0, widths[i], h);
    }
    x += widths[i];
  });
  const side = new THREE.CanvasTexture(strip);
  side.colorSpace = THREE.SRGBColorSpace;
  side.wrapS = THREE.RepeatWrapping;
  // The cylinder's seam is at the front; shift so the middle of the front photo faces +z.
  side.offset.x = widths[0] / 2 / strip.width;
  const [top, bottom] = await Promise.all([tex("top"), tex("bottom")]);
  const r = 0.5;
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, H, 64), [photo(side), top ? photo(top) : plain(), bottom ? photo(bottom) : plain()]);
  mesh.scale.set(L, 1, B);
  mesh.position.y = H / 2;
  mesh.castShadow = mesh.receiveShadow = true;
  group.add(mesh);
  return group;
}

/**
 * Turns an object built at its catalogue size (L × H × B along x, y, z) so its extents match the packed size
 * (placed length along x, height along y, breadth along z). Returns a wrapper with the base still on the origin.
 */
export function orientTo(obj: THREE.Object3D, native: Dims, placed: { l: number; b: number; h: number }): THREE.Object3D {
  const want = [placed.l, placed.h, placed.b];
  const have = new THREE.Vector3(native.lengthMm, native.heightMm, native.breadthMm);
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  let best: THREE.Euler | null = null;
  outer: for (const rx of [0, 1, 2, 3]) {
    for (const ry of [0, 1, 2, 3]) {
      for (const rz of [0, 1, 2, 3]) {
        e.set((rx * Math.PI) / 2, (ry * Math.PI) / 2, (rz * Math.PI) / 2);
        q.setFromEuler(e);
        const v = have.clone().applyQuaternion(q);
        const ext = [Math.abs(v.x), Math.abs(v.y), Math.abs(v.z)];
        if (ext.every((d, i) => Math.abs(d - want[i]) < 0.5)) {
          best = e.clone();
          break outer;
        }
      }
    }
  }
  const wrap = new THREE.Group();
  const pivot = new THREE.Group();
  obj.position.y -= native.heightMm / 2; // rotate about the centre
  pivot.add(obj);
  if (best) pivot.rotation.copy(best);
  pivot.position.y = placed.h / 2;
  wrap.add(pivot);
  wrap.userData = obj.userData;
  return wrap;
}

/** Product readiness, same rule as the server (backend/app/services/hamper_fit.py: model_missing). */
export function modelMissing(model: Model3d | null | undefined): string[] {
  if (!model) return ["3D model"];
  if (model.kind === "glb") return model.url ? [] : ["3D model file"];
  return REQUIRED_FACES[model.shape].filter((f) => !model.faces[f]).map((f) => `${f} photo`);
}
