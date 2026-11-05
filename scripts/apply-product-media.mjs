/**
 * Inject official image paths + aligned display names into products.ts.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const productsPath = path.join(root, "src/data/products.ts");
const mediaPath = path.join(root, "src/data/productMedia.ts");

const mediaSource = fs.readFileSync(mediaPath, "utf8");
const media = {};
const blockRe =
  /"([^"]+)":\s*\{[\s\S]*?officialName:\s*"([^"]+)",[\s\S]*?images:\s*\[([\s\S]*?)\],/g;
let match;
while ((match = blockRe.exec(mediaSource))) {
  const [, id, officialName, imagesBlock] = match;
  const images = [...imagesBlock.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  media[id] = { officialName, images };
}

console.log("media entries", Object.keys(media).length);

let source = fs.readFileSync(productsPath, "utf8");

const idRe = /id:\s*"([^"]+)",[\s\S]*?images:\s*\[[^\]]*\]/g;
let updated = 0;
source = source.replace(idRe, (full, id) => {
  const entry = media[id];
  if (!entry) return full;
  updated += 1;
  let next = full;
  next = next.replace(
    /name:\s*"[^"]*"/,
    `name: ${JSON.stringify(entry.officialName)}`,
  );
  const list = entry.images.map((img) => `      "${img}",`).join("\n");
  next = next.replace(/images:\s*\[[^\]]*\]/, `images: [\n${list}\n    ]`);
  return next;
});

fs.writeFileSync(productsPath, source);
console.log(`Updated ${updated} products with official media`);
