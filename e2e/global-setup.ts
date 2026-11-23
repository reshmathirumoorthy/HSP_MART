/** Resets the test database to a clean, migrated and seeded state before every run. */
import { execSync } from "node:child_process";
import { rmSync } from "node:fs";
import postgres from "postgres";
import { TEST_DATABASE_URL } from "../playwright.config";

export default async function globalSetup() {
  if (!/_test\b|_test$/.test(new URL(TEST_DATABASE_URL).pathname)) {
    throw new Error(`Refusing to reset non-test database: ${TEST_DATABASE_URL}`);
  }
  // Cached sign-in sessions belong to the previous database; drop them.
  rmSync("test-results/.auth", { recursive: true, force: true }); // = SESSION_DIR in helpers.ts
  const sql = postgres(TEST_DATABASE_URL, { max: 1, onnotice: () => {} });
  await sql.unsafe("drop schema if exists public cascade; drop schema if exists drizzle cascade; create schema public;");
  await sql.end();

  const env = { ...process.env, DATABASE_URL: TEST_DATABASE_URL };
  const tsx = "npx tsx --tsconfig tsconfig.json";
  execSync(`${tsx} scripts/db/migrate.mts`, { env, stdio: "inherit" });
  execSync(`${tsx} scripts/db/seed.mts`, { env, stdio: "inherit" });

  // The web servers may have fetched (and cached) storefront data before the reset; drop it.
  const { E2E_BASE_URL, E2E_REVALIDATE_SECRET } = await import("../playwright.config");
  await fetch(`${E2E_BASE_URL}/revalidate`, { method: "POST", headers: { "x-revalidate-secret": E2E_REVALIDATE_SECRET } }).catch(() => {});
}
