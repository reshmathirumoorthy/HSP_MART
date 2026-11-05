/**
 * Crop individual bottle colour variants from official photographs.
 * No AI generation / no artificial recolouring.
 *
 * Side bottles in vacuum-bottle-2.jpg overlap — crops favour the target
 * bottle and frame a tall product portrait for the customizer.
 */
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const srcPath = "public/images/products/vacuum-bottle-2.jpg";
const styledPath = "public/images/products/vacuum-bottle-main.jpg";
const outDir = "public/images/products/variants";
fs.mkdirSync(outDir, { recursive: true });

const meta = await sharp(srcPath).metadata();
const W = meta.width;
const H = meta.height;
console.log("source", W, H);

const BG = { r: 246, g: 242, b: 233 };

// Fractions of the source. Width kept tight enough to reduce neighbours
// while retaining a full bottle silhouette where the photo allows.
const bottles = [
  {
    id: "blue",
    label: "Blue",
    swatch: "#2F5FA8",
    left: 0.0,
    top: 0.0,
    width: 0.195,
    height: 1,
  },
  {
    id: "lilac",
    label: "Lilac",
    swatch: "#B8A4C9",
    left: 0.175,
    top: 0.06,
    width: 0.175,
    height: 0.92,
  },
  {
    id: "red",
    label: "Red",
    swatch: "#C0392B",
    left: 0.39,
    top: 0.1,
    width: 0.22,
    height: 0.88,
  },
  {
    id: "pink",
    label: "Pink",
    swatch: "#E8B4C8",
    left: 0.63,
    top: 0.06,
    width: 0.185,
    height: 0.92,
  },
  {
    id: "green",
    label: "Green",
    swatch: "#2E6B4F",
    left: 0.805,
    top: 0.0,
    width: 0.195,
    height: 1,
  },
];

const canvas = 1000;
const manifest = [];

async function writeVariant(buffer, bottle) {
  const outName = `bottle-${bottle.id}.jpg`;
  const outPath = path.join(outDir, outName);

  const fitted = await sharp(buffer)
    .resize({
      width: Math.round(canvas * 0.85),
      height: Math.round(canvas * 0.95),
      fit: "inside",
      background: { r: BG.r, g: BG.g, b: BG.b, alpha: 1 },
    })
    .toBuffer();

  await sharp({
    create: {
      width: canvas,
      height: canvas,
      channels: 3,
      background: BG,
    },
  })
    .composite([{ input: fitted, gravity: "centre" }])
    .jpeg({ quality: 90 })
    .toFile(outPath);

  manifest.push({
    id: bottle.id,
    label: bottle.label,
    swatch: bottle.swatch,
    images: [`/images/products/variants/${outName}`],
  });
  console.log("wrote", outPath);
}

for (const bottle of bottles) {
  const left = Math.max(0, Math.round(bottle.left * W));
  const top = Math.max(0, Math.round(bottle.top * H));
  const width = Math.min(W - left, Math.round(bottle.width * W));
  const height = Math.min(H - top, Math.round(bottle.height * H));

  const extracted = await sharp(srcPath)
    .extract({ left, top, width, height })
    .toBuffer();

  await writeVariant(extracted, bottle);
}

try {
  const sMeta = await sharp(styledPath).metadata();
  const sW = sMeta.width;
  const sH = sMeta.height;
  const left = Math.round(sW * 0.23);
  const top = Math.round(sH * 0.03);
  const width = Math.round(sW * 0.2);
  const height = Math.round(sH * 0.94);

  const blackExtract = await sharp(styledPath)
    .extract({
      left: Math.max(0, left),
      top: Math.max(0, top),
      width: Math.min(sW - left, width),
      height: Math.min(sH - top, height),
    })
    .toBuffer();

  await writeVariant(blackExtract, {
    id: "black",
    label: "Black",
    swatch: "#1C211D",
  });
} catch (error) {
  console.warn("black crop skipped", error.message);
}

fs.writeFileSync(
  "scripts/bottle-variant-manifest.json",
  JSON.stringify(manifest, null, 2),
);
console.log("done", manifest.length);
