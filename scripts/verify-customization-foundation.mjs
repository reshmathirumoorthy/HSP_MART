/**
 * Wrapper so foundation checks resolve TypeScript path aliases via tsx.
 */

import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const script = path.join(root, "scripts", "verify-customization-foundation.ts");

const result = spawnSync(
  "npx",
  ["--yes", "tsx", "--tsconfig", "tsconfig.json", script],
  {
    cwd: root,
    stdio: "inherit",
    shell: true,
  },
);

process.exit(result.status ?? 1);
