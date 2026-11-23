import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
export const E2E_BASE_URL = `http://localhost:${PORT}`;
const API_PORT = 8100;
export const ADMIN_PORT = 5174;
export const E2E_REVALIDATE_SECRET = "e2e-revalidate-secret-0123456789";
const E2E_SESSION_SECRET = "e2e-only-secret-e2e-only-secret-0123456789";
export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgres://localhost:5432/hsp_giftos_test";

export const E2E_WEBHOOK_SECRET = "e2e-razorpay-webhook-secret";
export const E2E_CRON_SECRET = "e2e-cron-secret-value";

// E2E_BROWSERS=chromium,firefox,webkit selects browsers (default chromium only, to keep the serial suite fast).
// Several browsers in ONE run share the test database (reset once), so one browser's data leaks into the next;
// `npm run test:e2e:all-browsers` runs each browser as its own pass instead.
const BROWSERS = (process.env.E2E_BROWSERS ?? "chromium").split(",").map((b) => b.trim());
const ALL_PROJECTS = [
  { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  { name: "firefox", use: { ...devices["Desktop Firefox"] } },
  { name: "webkit", use: { ...devices["Desktop Safari"] } },
];
// E2E_PROD=1 runs the storefront from a production build (next build + next start) instead of the dev server,
// which compiles each page on first visit and can exceed test timeouts on a loaded machine.
const NEXT_COMMAND = process.env.E2E_PROD === "1"
  ? `npx next build && npx next start --port ${PORT}`
  : `npx next dev --port ${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    headless: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: ALL_PROJECTS.filter((p) => BROWSERS.includes(p.name)),
  // FastAPI owns all data and business rules; Next.js renders the UI and forwards /api/* to it.
  webServer: [
    {
      command: `uv run --project backend uvicorn app.main:app --app-dir backend --port ${API_PORT} --timeout-keep-alive 75`,
      url: `http://localhost:${API_PORT}/api/health`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        DATABASE_URL: TEST_DATABASE_URL,
        SESSION_SECRET: E2E_SESSION_SECRET,
        AUTH_DEV_OTP: "1",
        RAZORPAY_WEBHOOK_SECRET: E2E_WEBHOOK_SECRET,
        RETURN_WINDOW_DAYS: "0",
        CRON_SECRET: E2E_CRON_SECRET,
        UPLOAD_DIR: "../.uploads-e2e",
        NEXT_REVALIDATE_URL: `http://localhost:${PORT}/revalidate`,
        REVALIDATE_SECRET: E2E_REVALIDATE_SECRET,
      },
    },
    {
      // React admin portal (Vite), proxying /api to the same FastAPI instance.
      command: `npm --prefix admin run dev -- --port ${ADMIN_PORT} --strictPort`,
      url: `http://localhost:${ADMIN_PORT}`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: { API_URL: `http://localhost:${API_PORT}`, STOREFRONT_URL: `http://localhost:${PORT}` },
    },
    {
      command: NEXT_COMMAND,
      url: `http://localhost:${PORT}/images/hsp-mart-logo.png`,
      reuseExistingServer: false,
      timeout: process.env.E2E_PROD === "1" ? 600_000 : 180_000,
      env: {
        BACKEND_URL: `http://localhost:${API_PORT}`,
        ADMIN_APP_URL: `http://localhost:${ADMIN_PORT}`,
        SESSION_SECRET: E2E_SESSION_SECRET,
        REVALIDATE_SECRET: E2E_REVALIDATE_SECRET,
      },
    },
  ],
});
