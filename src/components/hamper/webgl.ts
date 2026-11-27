/** True when the browser can create a WebGL context (kept out of the 3D module so the check doesn't load three.js). */
export function webglAvailable(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}
