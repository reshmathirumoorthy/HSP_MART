import fs from "fs";
const src = fs.readFileSync("src/data/products.ts", "utf8");
const blocks = src.split(/\n  \{\n/).slice(1);
const rows = [];
for (const block of blocks) {
  const id = block.match(/id:\s*"([^"]+)"/)?.[1];
  const name = block.match(/name:\s*"([^"]+)"/)?.[1];
  const customizable = /customizable:\s*true/.test(block);
  const hasConfig = /customization:\s*\{/.test(block);
  const visual = block.match(/visual:\s*"([^"]+)"/)?.[1];
  const categorySlug = block.match(/categorySlug:\s*"([^"]+)"/)?.[1];
  const images = [...block.matchAll(/"\/images\/products\/[^"]+"/g)].map((m) => m[0]);
  if (!id) continue;
  if (customizable) {
    rows.push({ id, name, hasConfig, visual, categorySlug, imageCount: images.length });
  }
}
console.log(JSON.stringify(rows, null, 2));
console.log("\nTOTAL customizable:", rows.length);
console.log("WITH config:", rows.filter((r) => r.hasConfig).length);
console.log("WITHOUT config:", rows.filter((r) => !r.hasConfig).length);
