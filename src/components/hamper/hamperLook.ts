/** Shared look of the hamper box in the 2D and 3D previews, so both show the same hamper. */

export type BoxLook = { outer: string; inner: string; rim: string; grain: string; shred: string[] };

export function boxPalette(style: "kraft" | "rigid" | "basket"): BoxLook {
  if (style === "rigid") {
    return { outer: "#1f4236", inner: "#f1ead9", rim: "#c9a45a", grain: "#0d2a21", shred: ["#efe3c4", "#e2cf9e", "#c9a45a", "#f6efdc"] };
  }
  if (style === "basket") {
    return { outer: "#b68449", inner: "#a7773f", rim: "#8c5f2e", grain: "#6e4a24", shred: ["#e9d6ae", "#d8bd86", "#f1e4c6", "#c9a66b"] };
  }
  return { outer: "#c49a68", inner: "#d2ac7c", rim: "#b8895a", grain: "#7a5634", shred: ["#d9b98a", "#c9a173", "#e6cfa6", "#b98f60"] };
}

/** Small deterministic random generator, so the filler looks the same on every render. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
