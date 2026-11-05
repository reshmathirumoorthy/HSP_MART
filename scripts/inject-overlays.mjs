/**
 * Inject product-specific overlay calibration into customization.preview blocks.
 */
import fs from "node:fs";

const path = "src/data/products.ts";
let s = fs.readFileSync(path, "utf8");

const overlaysById = {
  "branded-tumbler-01": {
    objectPosition: "center 45%",
    overlays: {
      center: { x: 50, y: 54, scale: 0.95, rotation: 0, maxWidthPct: 26 },
      front: { x: 50, y: 46, scale: 1, rotation: 0, maxWidthPct: 28 },
      side: { x: 64, y: 52, scale: 0.8, rotation: 90, maxWidthPct: 16 },
    },
  },
  "executive-notebook-01": {
    objectPosition: "center",
    overlays: {
      cover: { x: 54, y: 40, scale: 1.1, rotation: -1, maxWidthPct: 40 },
      center: { x: 54, y: 50, scale: 1.05, rotation: -1, maxWidthPct: 40 },
    },
  },
  "custom-notebook-01": {
    objectPosition: "center",
    overlays: {
      cover: { x: 52, y: 44, scale: 1.15, rotation: 0, maxWidthPct: 44 },
      center: { x: 52, y: 54, scale: 1.1, rotation: 0, maxWidthPct: 44 },
    },
  },
  "premium-pen-set-01": {
    objectPosition: "center",
    overlays: {
      side: { x: 52, y: 47, scale: 0.7, rotation: -16, maxWidthPct: 46 },
      front: { x: 50, y: 44, scale: 0.75, rotation: -16, maxWidthPct: 44 },
    },
  },
  "signature-pen-01": {
    objectPosition: "center",
    overlays: {
      side: { x: 50, y: 48, scale: 0.68, rotation: -12, maxWidthPct: 42 },
      front: { x: 50, y: 45, scale: 0.72, rotation: -12, maxWidthPct: 42 },
    },
  },
  "custom-pen-01": {
    objectPosition: "center",
    overlays: {
      side: { x: 52, y: 47, scale: 0.7, rotation: -16, maxWidthPct: 46 },
      front: { x: 50, y: 44, scale: 0.75, rotation: -16, maxWidthPct: 44 },
    },
  },
  "presentation-folder-01": {
    objectPosition: "center",
    overlays: {
      front: { x: 52, y: 48, scale: 0.95, rotation: -3, maxWidthPct: 36 },
      center: { x: 52, y: 54, scale: 0.95, rotation: -3, maxWidthPct: 36 },
    },
  },
  "custom-folder-01": {
    objectPosition: "center",
    overlays: {
      front: { x: 52, y: 48, scale: 0.95, rotation: -3, maxWidthPct: 36 },
      center: { x: 52, y: 54, scale: 0.95, rotation: -3, maxWidthPct: 36 },
    },
  },
  "executive-gift-set-01": {
    objectPosition: "center",
    overlays: {
      center: { x: 50, y: 56, scale: 1, rotation: 0, maxWidthPct: 36 },
      front: { x: 50, y: 48, scale: 0.95, rotation: 0, maxWidthPct: 36 },
    },
  },
  "corporate-gift-box-01": {
    objectPosition: "center",
    overlays: {
      center: { x: 50, y: 56, scale: 1, rotation: 0, maxWidthPct: 36 },
      front: { x: 50, y: 48, scale: 0.95, rotation: 0, maxWidthPct: 36 },
    },
  },
};

function serializeOverlays(entry) {
  const overlayLines = Object.entries(entry.overlays)
    .map(([key, value]) => {
      const body = Object.entries(value)
        .map(([k, v]) => `${k}: ${typeof v === "string" ? JSON.stringify(v) : v}`)
        .join(", ");
      return `          ${key}: { ${body} },`;
    })
    .join("\n");
  return `        objectPosition: ${JSON.stringify(entry.objectPosition)},
        overlays: {
${overlayLines}
        },`;
}

for (const [id, entry] of Object.entries(overlaysById)) {
  const idIdx = s.indexOf(`id: "${id}"`);
  if (idIdx < 0) {
    console.log("missing", id);
    continue;
  }
  const customIdx = s.indexOf("customization: {", idIdx);
  if (customIdx < 0 || customIdx - idIdx > 2500) {
    console.log("no customization", id);
    continue;
  }
  const previewIdx = s.indexOf("preview: {", customIdx);
  const maxLenIdx = s.indexOf("maxLength:", previewIdx);
  if (previewIdx < 0 || maxLenIdx < 0) {
    console.log("no preview", id);
    continue;
  }
  const afterMax = s.indexOf("\n", maxLenIdx);
  // Avoid double-inject
  const previewSlice = s.slice(previewIdx, afterMax);
  if (previewSlice.includes("overlays:")) {
    console.log("skip existing", id);
    continue;
  }
  const inject = `\n${serializeOverlays(entry)}`;
  s = s.slice(0, afterMax) + inject + s.slice(afterMax);
  console.log("injected", id);
}

fs.writeFileSync(path, s);
console.log("done");
