/**
 * Audit: every active storefront product must be customizable.
 * Usage: node scripts/audit-universal-customization.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = fs
  .readFileSync(path.join(root, "src/data/products.ts"), "utf8")
  .replace(/\r\n/g, "\n");

const blocks = src.split(/\n  \{\n/).slice(1);
const rows = [];

for (const block of blocks) {
  const id = block.match(/\bid:\s*"([^"]+)"/)?.[1];
  const name = block.match(/\bname:\s*"([^"]+)"/)?.[1];
  const slug = block.match(/\bslug:\s*"([^"]+)"/)?.[1];
  const sku = block.match(/\bsku:\s*"([^"]+)"/)?.[1];
  if (!id || !name) continue;

  const customizableMatch = block.match(
    /bulkAvailable:\s*(?:true|false),\n\s*customizable:\s*(true|false)/,
  );
  const customizable = customizableMatch
    ? customizableMatch[1] === "true"
    : false;
  const hasConfig = /\n {4}customization:\s*\{/.test(block);
  const activeMatch = block.match(/\bactive:\s*(true|false)/);
  const active = activeMatch ? activeMatch[1] === "true" : true;

  rows.push({
    id,
    name,
    slug: slug ?? "",
    sku: sku ?? "",
    customizable,
    hasConfig,
    active,
  });
}

const activeRows = rows.filter((r) => r.active);
const customizableRows = activeRows.filter((r) => r.customizable);
const notCustomizable = activeRows.filter((r) => !r.customizable);

console.log("TOTAL PRODUCTS:", activeRows.length);
console.log("CUSTOMIZABLE:", customizableRows.length);
console.log("NOT CUSTOMIZABLE:", notCustomizable.length);
console.log("");

for (const row of activeRows) {
  console.log(
    [
      row.customizable ? "YES" : "NO",
      row.slug || row.id,
      row.sku,
      row.name,
      row.hasConfig ? "authored-config" : "needs-synthesize",
    ].join(" | "),
  );
}

if (notCustomizable.length > 0 || activeRows.length !== 36) {
  console.log("\nFAIL:");
  if (activeRows.length !== 36) {
    console.log(`  Expected 36 products, found ${activeRows.length}`);
  }
  for (const row of notCustomizable) {
    console.log(`  - ${row.id} (${row.slug})`);
  }
  process.exit(1);
}

console.log(`\nPASS: ${activeRows.length}/${activeRows.length} customizable`);
process.exit(0);
