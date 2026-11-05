/**
 * Wrapper so `npm run validate:catalogue` works without a permanent tsx dependency.
 * Spawns `npx tsx` with the project tsconfig for path-alias resolution.
 */

import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const script = path.join(root, "scripts", "validate-catalogue.ts");

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
