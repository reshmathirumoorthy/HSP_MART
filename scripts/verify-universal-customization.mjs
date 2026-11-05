/**
 * Wrapper for universal customization verification.
 */

import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const audit = spawnSync("node", ["scripts/audit-universal-customization.mjs"], {
  cwd: root,
  stdio: "inherit",
  shell: true,
});
if ((audit.status ?? 1) !== 0) process.exit(audit.status ?? 1);

const verify = spawnSync(
  "npx",
  ["--yes", "tsx", "--tsconfig", "tsconfig.json", "scripts/verify-universal-customization.ts"],
  {
    cwd: root,
    stdio: "inherit",
    shell: true,
  },
);

process.exit(verify.status ?? 1);
