/**
 * Phase 13A — run customization foundation model checks.
 * Usage: npx tsx --tsconfig tsconfig.json scripts/verify-customization-foundation.ts
 */

import { runCustomizationFoundationChecks } from "../src/lib/customization/foundationChecks";

const result = runCustomizationFoundationChecks();

console.log("Phase 13A customization foundation checks");
console.log(`Passed: ${result.passed.length}`);
for (const label of result.passed) {
  console.log(`  ✓ ${label}`);
}

if (result.failures.length > 0) {
  console.log(`Failures: ${result.failures.length}`);
  for (const label of result.failures) {
    console.log(`  ✗ ${label}`);
  }
  process.exit(1);
}

console.log("All foundation checks passed.");
