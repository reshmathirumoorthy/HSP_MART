import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const products = fs.readFileSync(path.join(root, "src/data/products.ts"), "utf8");
const media = fs.readFileSync(path.join(root, "src/data/productMedia.ts"), "utf8");

const blocks = products.split(/\n  \{/).slice(1);
const rows = [];

for (const b of blocks) {
  const id = (b.match(/id:\s*"([^"]+)"/) || [])[1];
  const slug = (b.match(/slug:\s*"([^"]+)"/) || [])[1];
  const name = (b.match(/name:\s*"([^"]+)"/) || [])[1];
  const sku = (b.match(/sku:\s*"([^"]+)"/) || [])[1];
  if (!id || !slug || !name) continue;
  // Skip nested option/variant objects that lack a top-level product shape
  if (!sku && !b.includes("categorySlug")) continue;

  const imgBlock = (b.match(/images:\s*\[([\s\S]*?)\],/) || [])[1] || "";
  const imgs = [...imgBlock.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  const hasMedia = media.includes(`"${id}"`);
  const missing = imgs.filter((p) => !fs.existsSync(path.join(root, "public", p)));
  rows.push({
    id,
    slug,
    name,
    sku: sku || "",
    count: imgs.length,
    hasMedia,
    missing,
    fallback: imgs.length === 0,
  });
}

const fallbacks = rows.filter((r) => r.fallback);
const withImages = rows.filter((r) => r.count > 0);
const missingFiles = rows.filter((r) => r.missing.length > 0);

console.log("Total products:", rows.length);
console.log("With local images:", withImages.length);
console.log("In productMedia.ts:", rows.filter((r) => r.hasMedia).length);
console.log("Fallback (images: []):", fallbacks.length);
console.log(
  "Missing files on disk:",
  missingFiles.length ? missingFiles.map((r) => `${r.id}:${r.missing.join("|")}`).join(", ") : "none",
);
console.log("\nFALLBACK PRODUCTS:");
for (const r of fallbacks) {
  console.log(`- ${r.id} | ${r.sku} | ${r.name} | /products/${r.slug}`);
}
console.log("\nCOVERAGE:");
for (const r of rows) {
  console.log(
    `${r.fallback ? "FALLBACK" : "REAL"}`.padEnd(10),
    String(r.count).padStart(2),
    r.hasMedia ? "mapped" : "     ",
    r.id.padEnd(28),
    r.name,
  );
}
