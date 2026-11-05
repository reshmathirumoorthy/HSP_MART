/**
 * Development catalogue audit (Phase 12A).
 * Usage: npx tsx --tsconfig tsconfig.json scripts/validate-catalogue.ts
 */

import { existsSync } from "node:fs";
import path from "node:path";
import { products } from "../src/data/products";
import { auditCatalogue } from "../src/lib/validateCatalogue";

const root = process.cwd();
const report = auditCatalogue(products);
const missingFiles: string[] = [];

for (const product of products) {
  for (const imagePath of product.images ?? []) {
    if (typeof imagePath !== "string" || !imagePath.startsWith("/")) continue;
    const absolute = path.join(root, "public", imagePath.replace(/^\//, ""));
    if (!existsSync(absolute)) {
      missingFiles.push(`${product.id}: ${imagePath}`);
    }
  }
}

console.log("Phase 12A catalogue audit");
console.log(`Products audited: ${report.productCount}`);
console.log(`Errors: ${report.errors.length}`);
console.log(`Warnings: ${report.warnings.length}`);
console.log(`Duplicate SKUs: ${report.duplicateSkus.length}`);
console.log(`Duplicate slugs: ${report.duplicateSlugs.length}`);
console.log(`Missing primary images: ${report.productsMissingImages.length}`);
console.log(`Invalid image paths: ${report.productsWithBrokenImagePaths.length}`);
console.log(`Missing image files on disk: ${missingFiles.length}`);

if (report.errors.length) {
  console.log("\nERRORS:");
  for (const issue of report.errors) console.log(`- ${issue.message}`);
}

if (missingFiles.length) {
  console.log("\nMISSING FILES:");
  for (const entry of missingFiles) console.log(`- ${entry}`);
}

if (report.warnings.length) {
  console.log("\nWARNINGS (first 20):");
  for (const issue of report.warnings.slice(0, 20)) {
    console.log(`- ${issue.message}`);
  }
  if (report.warnings.length > 20) {
    console.log(`… +${report.warnings.length - 20} more`);
  }
}

const failed = report.errors.length > 0 || missingFiles.length > 0;
process.exit(failed ? 1 : 0);
