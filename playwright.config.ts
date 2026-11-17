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

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    headless: true,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
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
      env: { API_URL: `http://localhost:${API_PORT}` },
    },
    {
      command: `npx next dev --port ${PORT}`,
      url: `http://localhost:${PORT}/images/hsp-mart-logo.png`,
      reuseExistingServer: false,
      timeout: 180_000,
      env: {
        BACKEND_URL: `http://localhost:${API_PORT}`,
        SESSION_SECRET: E2E_SESSION_SECRET,
        REVALIDATE_SECRET: E2E_REVALIDATE_SECRET,
      },
    },
  ],
});
