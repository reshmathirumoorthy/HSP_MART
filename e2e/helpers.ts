import { createHmac } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, type Page } from "@playwright/test";
import postgres from "postgres";
import { ADMIN_PORT, TEST_DATABASE_URL } from "../playwright.config";

export const sql = postgres(TEST_DATABASE_URL, { max: 2, onnotice: () => {} });

/** The React admin app (the staff console). Same host as the store, so the session cookie is shared. */
export const ADMIN_APP = `http://localhost:${ADMIN_PORT}`;
export const adminUrl = (path: string) => `${ADMIN_APP}${path.startsWith("/") ? path : `/${path}`}`;

/** The admin app confirms an action with a role="status" message and reports a refusal with role="alert". */
export async function expectNotice(page: Page, text: string | RegExp) {
  await expect(page.getByRole("status").filter({ hasText: text }).first()).toBeVisible();
}
export async function expectProblem(page: Page, text: string | RegExp) {
  await expect(page.getByRole("alert").filter({ hasText: text }).first()).toBeVisible();
}

let counter = 0;
export const uniqueEmail = (tag: string) =>
  `${tag}.${Date.now().toString(36)}${(counter++).toString(36)}@e2e.test`;

/** Signs in through the real OTP UI, reading the dev-echoed code from the page. */
export async function signIn(page: Page, identifier: string, next?: string) {
  await page.goto(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  await page.getByLabel("Email or mobile number").fill(identifier);
  await page.getByRole("button", { name: "Send sign-in code" }).click();
  const code = (await page.getByTestId("dev-otp").locator("code").textContent())!.trim();
  await page.getByLabel("Sign-in code").fill(code);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).not.toHaveURL(/\/login/);
  // Staff go store /admin → admin app: wait for the final page, not the intermediate hop, or the next navigation
  // in the test can be interrupted by the redirect.
  await page.waitForURL((u) => !(u.pathname.startsWith("/admin") && u.port !== String(ADMIN_PORT)));
  // Let the post-login page finish loading; otherwise an immediate page.goto() can be aborted (seen in Firefox).
  await page.waitForLoadState("load");
}

export async function createUser(email: string, role: string, name = role) {
  const [u] = await sql`
    insert into users (email, role, name) values (${email}, ${role}, ${name})
    returning id`;
  return u.id as string;
}

type Browser = import("@playwright/test").Browser;
type StorageState = Awaited<ReturnType<import("@playwright/test").BrowserContext["storageState"]>>;
const sessions = new Map<string, StorageState>();
/** Cleared by global setup each run (the DB reset invalidates every session). */
export const SESSION_DIR = join("test-results", ".auth");

// Sessions are also kept on disk: Playwright restarts its worker after any failure, and an in-memory cache alone
// would then re-request OTP codes for shared staff accounts, hit the (correct) 5-per-15-min limit and fail
// unrelated tests in a cascade.
function sessionFile(identifier: string) {
  return join(SESSION_DIR, `${identifier.replace(/[^a-z0-9]+/gi, "_")}.json`);
}
function cachedSession(identifier: string): StorageState | undefined {
  if (sessions.has(identifier)) return sessions.get(identifier);
  const f = sessionFile(identifier);
  if (!existsSync(f)) return undefined;
  const state = JSON.parse(readFileSync(f, "utf8")) as StorageState;
  sessions.set(identifier, state);
  return state;
}
function saveSession(identifier: string, state: StorageState) {
  sessions.set(identifier, state);
  mkdirSync(SESSION_DIR, { recursive: true });
  writeFileSync(sessionFile(identifier), JSON.stringify(state));
}
/** Forget a cached session (e.g. after a test signs that user out). */
export function dropSession(identifier: string) {
  sessions.delete(identifier);
  try { unlinkSync(sessionFile(identifier)); } catch { /* not cached */ }
}

/** New isolated context signed in as `identifier`; the session is reused (OTP sends are rate limited). */
export async function asUser(browser: Browser, identifier: string) {
  const cached = cachedSession(identifier);
  const ctx = await browser.newContext(cached ? { storageState: cached } : {});
  const page = await ctx.newPage();
  page.on("dialog", (d) => d.accept()); // staff pages confirm destructive actions; tests always proceed
  if (!cached) {
    await signIn(page, identifier);
    saveSession(identifier, await ctx.storageState());
  }
  return { ctx, page };
}

/** Creates an already-verified, active partner directly (for tests that aren't about onboarding). */
export async function createPartner(email: string, type: "associate" | "franchise", city = "Pune") {
  const role = type === "associate" ? "associate" : "franchise";
  const userId = await createUser(email, role, `${type} ${city}`);
  const [p] = await sql`
    insert into partners (user_id, code, type, status, city, pan, bank_ifsc, bank_account_last4, kyc_verified_at,
                          agreement_version, agreement_accepted_at, commission_bps, service_fee_bps)
    values (${userId}, ${"HSP-T-" + Math.random().toString(36).slice(2, 8).toUpperCase()}, ${type}, 'active', ${city},
            'ABCDE1234F', 'HDFC0001234', '4321', now(), 'HSP-PA-2026.1', now(), 1000, ${type === "franchise" ? 200 : 0})
    returning id, code`;
  return { userId, partnerId: p.id as string, code: p.code as string };
}

export function webhookSigner(secret: string) {
  let seq = 0;
  return async (request: import("@playwright/test").APIRequestContext, body: object) => {
    const raw = JSON.stringify(body);
    const res = await request.post("/api/webhooks/razorpay", {
      data: raw,
      headers: {
        "content-type": "application/json",
        "x-razorpay-signature": createHmac("sha256", secret).update(raw).digest("hex"),
        "x-razorpay-event-id": `evt_${Date.now()}_${seq++}_${Math.random().toString(36).slice(2)}`,
      },
    });
    return (await res.json()).result as string;
  };
}

/** Customer pays the full balance on an order through the UI + a signed webhook. */
export async function payInFull(page: Page, request: import("@playwright/test").APIRequestContext, orderNo: string, secret: string) {
  await page.goto(`/my/orders/${orderNo}`);
  await page.getByRole("button", { name: /^Pay ₹/ }).click();
  const orderId = (await page.getByTestId("provider-order-id").textContent())!;
  const amount = Number(await page.getByTestId("pending-amount").textContent());
  const result = await webhookSigner(secret)(request, {
    event: "payment.captured",
    payload: { payment: { entity: { id: `pay_${orderId.slice(-10)}`, order_id: orderId, amount, status: "captured" } } },
  });
  expect(result).toBe("processed");
}

/** Inserts an order directly (for tests that exercise later stages, not the quote flow). */
export async function makeOrder(opts: {
  customerEmail: string;
  status: string;
  lines: { productId: string; quantity: number; pricePaise: number }[];
  paidFraction?: number;
  partnerId?: string;
  deliveredDaysAgo?: number;
}) {
  const [c] = await sql`
    insert into customers (kind, name, email, dedupe_key) values ('organisation', ${"Test " + opts.customerEmail}, ${opts.customerEmail}, ${"email:" + opts.customerEmail})
    on conflict do nothing returning id`;
  const customerId = c?.id ?? (await sql`select id from customers where email = ${opts.customerEmail}`)[0].id;
  const subtotal = opts.lines.reduce((a, l) => a + l.quantity * l.pricePaise, 0);
  const gst = Math.round(subtotal * 0.18);
  const total = subtotal + gst;
  const paid = Math.round(total * (opts.paidFraction ?? 0));
  const number = `O-T-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
  const deliveredAt = opts.deliveredDaysAgo != null ? new Date(Date.now() - opts.deliveredDaysAgo * 86_400_000) : null;
  const [o] = await sql`
    insert into orders (number, customer_id, partner_id, status, subtotal_paise, gst_paise, total_paise, paid_paise, delivered_at)
    values (${number}, ${customerId}, ${opts.partnerId ?? null}, ${opts.status}, ${subtotal}, ${gst}, ${total}, ${paid}, ${deliveredAt})
    returning id`;
  for (const l of opts.lines) {
    await sql`insert into order_lines (order_id, product_id, quantity, unit_price_paise, gst_rate_bps)
              values (${o.id}, ${l.productId}, ${l.quantity}, ${l.pricePaise}, 1800)`;
  }
  return { id: o.id as string, number, subtotal, total };
}
