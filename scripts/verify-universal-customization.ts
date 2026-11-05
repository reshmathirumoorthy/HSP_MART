/**
 * Verify every active storefront product resolves a live customization studio config.
 * Usage: npx tsx --tsconfig tsconfig.json scripts/verify-universal-customization.ts
 */

import { products } from "../src/data/products";
import { isProductCustomizable } from "../src/lib/productModel";
import {
  productSupportsCustomizationStudio,
  resolveProductCustomizationConfig,
} from "../src/components/customization/resolveProductCustomization";

const active = products.filter((product) => product.active);
const failures: string[] = [];
const rows: {
  name: string;
  slug: string;
  sku: string;
  source: "authored" | "synthesized";
}[] = [];

for (const product of active) {
  if (!isProductCustomizable(product)) {
    failures.push(`${product.id}: isProductCustomizable=false`);
    continue;
  }
  if (!productSupportsCustomizationStudio(product)) {
    failures.push(`${product.id}: productSupportsCustomizationStudio=false`);
    continue;
  }
  if (!product.customizable) {
    failures.push(`${product.id}: product.customizable still false`);
    continue;
  }

  const config = resolveProductCustomizationConfig(product);
  if (!config?.enabled) {
    failures.push(`${product.id}: resolveProductCustomizationConfig not enabled`);
    continue;
  }
  if (!config.surfaces?.length) {
    failures.push(`${product.id}: no surfaces after resolve`);
    continue;
  }

  rows.push({
    name: product.name,
    slug: product.slug,
    sku: product.sku,
    source: product.customization?.enabled ? "authored" : "synthesized",
  });
}

console.log("Universal customization verify");
console.log(`TOTAL PRODUCTS: ${active.length}`);
console.log(`CUSTOMIZABLE: ${rows.length}`);
console.log(`NOT CUSTOMIZABLE: ${active.length - rows.length}`);
console.log("");

for (const row of rows) {
  console.log(`${row.sku} | ${row.slug} | ${row.name} | ${row.source}`);
}

if (failures.length || active.length !== 36 || rows.length !== 36) {
  console.log("\nFAIL:");
  for (const failure of failures) console.log(`- ${failure}`);
  if (active.length !== 36) {
    console.log(`- Expected 36 active products, found ${active.length}`);
  }
  process.exit(1);
}

console.log("\nPASS: 36/36 products resolve into the customization studio");
process.exit(0);
