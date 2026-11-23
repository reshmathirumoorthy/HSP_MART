/**
 * Phase 12: application-wide integrity, added by the codebase audit to close coverage gaps:
 * - every public storefront page renders without JavaScript errors, and its internal links resolve;
 * - the store fits a phone screen (no horizontal scrolling);
 * - every React admin page loads against the real API (several had no E2E coverage);
 * - one sign-in is shared by the store and the admin app, and signing out of one signs out of both.
 */
import { expect, test, type Page } from "@playwright/test";
import { ADMIN_PORT } from "../playwright.config";
import { asUser, createUser, dropSession, uniqueEmail } from "./helpers";

const ADMIN_APP = `http://localhost:${ADMIN_PORT}`;
test.describe.configure({ mode: "serial" });

/** Collects uncaught page errors and console errors (ignoring the browser's own resource-load noise). */
function watchErrors(page: Page) {
  const errors: string[] = [];
  // WebKit reports Next.js background prefetches (?_rsc=) cancelled by a navigation as "access control" errors;
  // they are aborted requests, not application faults.
  // Firefox also reports the Google Maps embed on /contact abandoning its lazy modules ('Could not load "util"')
  // when the test leaves the page; that is third-party code, not ours.
  const benign = (t: string) => /_rsc=.*access control checks/.test(t) || /^Could not load "[a-z_]+"\.?$/.test(t)
    // Firefox logs an image download cut off by the next navigation as "corrupt or truncated".
    || /Image corrupt or truncated/.test(t);
  page.on("pageerror", (e) => { if (!benign(e.message)) errors.push(`pageerror: ${e.message}`); });
  page.on("console", (m) => {
    if (m.type() === "error" && !/Failed to load resource/.test(m.text()) && !benign(m.text())) errors.push(`console: ${m.text()}`);
  });
  return errors;
}

const PUBLIC_PAGES = ["/", "/products", "/search?q=notebook", "/about", "/faq", "/contact", "/bulk-quote", "/cart",
  "/compare", "/wishlist", "/join", "/login"];

test("every public storefront page renders without JavaScript errors", async ({ page }) => {
  test.setTimeout(180_000); // visits many pages
  const errors = watchErrors(page);
  const statuses: string[] = [];
  for (const path of PUBLIC_PAGES) {
    const res = await page.goto(path);
    if (!res || res.status() >= 400) statuses.push(`${path} → ${res?.status()}`);
    await expect(page.locator("main, [role=main]").first()).toBeVisible();
  }
  // A product page, reached the way a shopper would.
  await page.goto("/products");
  await page.locator('a[href^="/products/"]').first().click();
  await expect(page).toHaveURL(/\/products\/[^/]+$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(statuses, "pages returning errors").toEqual([]);
  expect(errors, "browser errors").toEqual([]);
});

test("internal links on the home page and header/footer all resolve", async ({ page, request }) => {
  test.setTimeout(180_000); // visits many pages
  await page.goto("/");
  const hrefs = await page.locator("a[href^='/']").evaluateAll((as) =>
    [...new Set(as.map((a) => (a as HTMLAnchorElement).getAttribute("href")!.split("#")[0]))].filter(Boolean));
  expect(hrefs.length).toBeGreaterThan(5);
  const broken: string[] = [];
  for (const href of hrefs) {
    const res = await request.get(href, { maxRedirects: 5 });
    if (res.status() >= 400) broken.push(`${href} → ${res.status()}`);
  }
  expect(broken, "broken internal links").toEqual([]);
});

test("the sitemap lists the live catalogue's product pages", async ({ request }) => {
  const xml = await (await request.get("/sitemap.xml")).text();
  const products = xml.match(/\/products\/[a-z0-9-]+</g) ?? [];
  expect(products.length).toBeGreaterThan(100);
});

test("store pages and API responses carry security headers", async ({ request }) => {
  const page = await request.get("/");
  expect(page.headers()["x-frame-options"]).toBe("DENY");
  expect(page.headers()["x-content-type-options"]).toBe("nosniff");
  expect(page.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
  // /api/* is forwarded to FastAPI by the store; its headers survive the hop.
  const api = await request.get("/api/health");
  expect(api.headers()["x-content-type-options"]).toBe("nosniff");
  expect(api.headers()["x-request-id"]).toBeTruthy();
});

test("the Content Security Policy uses a fresh nonce per request and blocks unsigned inline scripts", async ({ request, page }) => {
  const csp = (await request.get("/")).headers()["content-security-policy"];
  expect(csp).toMatch(/script-src 'self' 'nonce-[A-Za-z0-9+/=]+' 'strict-dynamic'/);
  expect(csp).not.toContain("'unsafe-inline' 'strict-dynamic'");
  const nonce = (h: string) => h.match(/'nonce-([^']+)'/)![1];
  expect(nonce((await request.get("/")).headers()["content-security-policy"])).not.toBe(nonce(csp));

  // Simulate stored XSS: splice an unsigned inline script into the real HTML, keeping the real CSP header.
  // It must not run, while the page's own (nonce-signed) scripts still do.
  await page.route("**/", async (route) => {
    const res = await route.fetch();
    const html = (await res.text()).replace("</body>", "<script>window.__xss = true</script></body>");
    await route.fulfill({ response: res, body: html });
  });
  await page.goto("/");
  expect(await page.evaluate(() => (window as unknown as { __xss?: boolean }).__xss)).toBeUndefined();
  await page.unroute("**/");

  // Control: the same payload served without the CSP header does run, so the check above is meaningful.
  await page.route("**/", async (route) => {
    const res = await route.fetch();
    const html = (await res.text()).replace("</body>", "<script>window.__xss = true</script></body>");
    const headers = { ...res.headers() };
    delete headers["content-security-policy"];
    await route.fulfill({ response: res, body: html, headers });
  });
  await page.goto("/");
  expect(await page.evaluate(() => (window as unknown as { __xss?: boolean }).__xss)).toBe(true);
  await page.unroute("**/");
  await expect(page.getByRole("navigation", { name: "Main navigation" })).toBeVisible();
});

test("no page in the store, portals or checkout breaks the Content Security Policy", async ({ browser }) => {
  test.setTimeout(180_000);
  const email = uniqueEmail("csp-buyer");
  const { ctx, page } = await asUser(browser, email);
  await page.addInitScript(() => {
    const w = window as unknown as { __csp: string[] };
    w.__csp = [];
    document.addEventListener("securitypolicyviolation", (e) => w.__csp.push(`${e.violatedDirective} ${e.blockedURI}`));
  });
  const violations: string[] = [];
  for (const path of [...PUBLIC_PAGES, "/account", "/account/orders", "/checkout"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle").catch(() => {});
    for (const v of await page.evaluate(() => (window as unknown as { __csp: string[] }).__csp)) violations.push(`${path}: ${v}`);
  }
  await page.goto("/products");
  await page.locator('a[href^="/products/"]').first().click();
  await page.waitForLoadState("networkidle").catch(() => {});
  for (const v of await page.evaluate(() => (window as unknown as { __csp: string[] }).__csp)) violations.push(`product: ${v}`);
  expect(violations).toEqual([]);
  await ctx.close();
});

test("the store fits a phone screen without horizontal scrolling", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  for (const path of ["/", "/products", "/contact", "/login"]) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `${path} overflows by ${overflow}px`).toBeLessThanOrEqual(1);
  }
  await ctx.close();
});

test("every React admin page loads against the API without errors", async ({ browser }) => {
  test.setTimeout(180_000); // visits many pages
  const { ctx, page } = await asUser(browser, "admin@hspmart.test");
  const errors = watchErrors(page);
  const pages: [string, RegExp][] = [
    ["/", /Overview/], ["/orders", /Orders/], ["/enquiries", /Storefront enquiries/], ["/complaints", /Customer complaints/],
    ["/products", /Products/], ["/content", /Site content/], ["/quotes", /Quotes/], ["/assistant", /Quotation assistant/],
    ["/suppliers", /Suppliers/], ["/partners", /Partner network/], ["/payouts", /Partner payouts/],
    ["/insights", /Management insights/], ["/plan", /Financial plan/], ["/imports", /Data imports/],
    ["/programmes", /Gifting programmes/],
  ];
  for (const [path, title] of pages) {
    await page.goto(`${ADMIN_APP}${path}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
    await expect(page.getByRole("alert")).toHaveCount(0);
  }
  // Product detail opens from the list.
  await page.goto(`${ADMIN_APP}/products`);
  await page.locator('table a[href^="/products/"]').first().click();
  await expect(page).toHaveURL(/\/products\/(?!new).+/);
  await expect(page.getByRole("alert")).toHaveCount(0);
  expect(errors, "browser errors in the admin app").toEqual([]);
  await ctx.close();
});

test("one sign-in covers the store and the admin app; signing out of the admin signs out everywhere", async ({ browser }) => {
  const staff = uniqueEmail("sso-staff");
  await createUser(staff, "hsp_admin", "SSO Staff");
  const { ctx, page } = await asUser(browser, staff);
  // Signed in on the store (same host, different port: the session cookie is shared).
  await page.goto(`${ADMIN_APP}/`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Overview");
  // Sign-out ends with a full reload of the admin app; wait for it so it cannot cancel the next navigation.
  await Promise.all([page.waitForEvent("load"), page.getByRole("button", { name: "Sign out" }).click()]);
  dropSession(staff);
  await page.goto("/account");
  await expect(page).toHaveURL(/\/login\?next=%2Faccount/);
  await page.goto(`${ADMIN_APP}/`);
  await expect(page.getByLabel("Email or mobile")).toBeVisible();
  await ctx.close();
});
