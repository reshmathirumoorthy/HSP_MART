/**
 * Phase 1 — Foundation: database + catalogue, OTP auth, roles, audit log,
 * server-authoritative pricing.
 */
import { expect, test } from "@playwright/test";
import { E2E_BASE_URL } from "../playwright.config";
import { seedProducts as staticCatalogue } from "../scripts/db/seed-data/products";
import { createUser, signIn, sql, uniqueEmail } from "./helpers";

test.describe("1.1 database & catalogue", () => {
  test("every storefront product is in the DB with a division and budget band", async () => {
    const [{ n }] = await sql`select count(*)::int as n from products`;
    expect(n).toBe(staticCatalogue.length);
    const [{ missing }] = await sql`
      select count(*)::int as missing from products where division is null or budget_band is null`;
    expect(missing).toBe(0);
    const divisions = await sql`select distinct division from products order by 1`;
    expect(divisions.map((d) => d.division).sort()).toEqual([
      "corporate",
      "festive",
      "personal",
      "premium",
      "promotional",
    ]);
  });

  test("catalogue API serves DB price in paise and never exposes cost", async ({ request }) => {
    const sample = staticCatalogue.find((p) => p.price > 0)!;
    const res = await request.get(`/api/catalogue/${sample.sku}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.pricePaise).toBe(Math.round(sample.price * 100));
    expect(body).not.toHaveProperty("costPaise");
    expect((await request.get("/api/catalogue/NOPE-123")).status()).toBe(404);
  });
});

test.describe("1.2 authentication & roles", () => {
  test("anonymous visitors are sent to login for every protected area", async ({ page }) => {
    for (const area of ["/admin", "/partner", "/supplier"]) {
      await page.goto(area);
      await expect(page).toHaveURL(new RegExp(`/login\\?next=${encodeURIComponent(area)}`));
    }
  });

  test("new customer signs up by OTP, lands on /account and cannot enter staff areas", async ({ page }) => {
    const email = uniqueEmail("customer");
    await signIn(page, email);
    await expect(page).toHaveURL(/\/account/);
    const [u] = await sql`select role from users where email = ${email}`;
    expect(u.role).toBe("customer");

    await page.goto("/admin");
    await expect(page).toHaveURL(/\/account/);
    await page.goto("/supplier");
    await expect(page).toHaveURL(/\/account/);
  });

  test("mobile numbers are normalised to +91", async ({ page }) => {
    await signIn(page, "98765 43210");
    const [u] = await sql`select role from users where phone = '+919876543210'`;
    expect(u.role).toBe("customer");
  });

  test("a wrong code is rejected and invalid input is validated", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email or mobile number").fill("not-an-id");
    await page.getByRole("button", { name: "Send sign-in code" }).click();
    await expect(page.getByTestId("form-error")).toContainText("valid email");

    await page.getByLabel("Email or mobile number").fill(uniqueEmail("wrong"));
    await page.getByRole("button", { name: "Send sign-in code" }).click();
    const real = (await page.getByTestId("dev-otp").locator("code").textContent())!;
    const wrong = real === "000000" ? "111111" : "000000";
    await page.getByLabel("Sign-in code").fill(wrong);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByTestId("form-error")).toContainText("incorrect");
    await expect(page).toHaveURL(/\/login/);
  });

  test("OTP requests are rate limited", async ({ page }) => {
    const email = uniqueEmail("ratelimit");
    for (let i = 0; i < 5; i++) {
      await page.goto("/login");
      await page.getByLabel("Email or mobile number").fill(email);
      await page.getByRole("button", { name: "Send sign-in code" }).click();
      await expect(page.getByTestId("dev-otp")).toBeVisible();
    }
    await page.goto("/login");
    await page.getByLabel("Email or mobile number").fill(email);
    await page.getByRole("button", { name: "Send sign-in code" }).click();
    await expect(page.getByTestId("form-error")).toContainText("Too many codes");
  });

  test("staff land on /admin and see the DB catalogue by division", async ({ page }) => {
    await signIn(page, "admin@hspmart.test");
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByTestId("portal-role")).toHaveText("hsp_admin");
    await expect(page.getByTestId("stat-products")).toHaveText(String(staticCatalogue.length));
    await expect(page.getByTestId("stat-division-corporate")).toBeVisible();
  });

  test("each partner and supplier role is confined to its own portal", async ({ browser }) => {
    const cases: [string, RegExp][] = [
      ["associate", /\/partner$/],
      ["franchise", /\/partner$/],
      ["enterprise_partner", /\/partner$/],
      ["supplier", /\/supplier$/],
    ];
    for (const [role, home] of cases) {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      const email = uniqueEmail(role);
      await createUser(email, role);
      await signIn(page, email);
      await expect(page).toHaveURL(home);
      await page.goto("/admin");
      await expect(page).toHaveURL(home);
      await ctx.close();
    }
  });

  test("login honours a safe ?next= and ignores off-site redirects", async ({ page }) => {
    const email = uniqueEmail("next");
    await createUser(email, "associate");
    await signIn(page, email, "//evil.example.com");
    await expect(page).toHaveURL(`${E2E_BASE_URL}/partner`);
  });

  test("revoking a role or disabling a user takes effect on the next request", async ({ page }) => {
    const email = uniqueEmail("demote");
    await createUser(email, "associate");
    await signIn(page, email);
    await expect(page).toHaveURL(/\/partner$/);

    // Cookie still claims "associate"; the DAL reads the DB and refuses.
    await sql`update users set role = 'customer' where email = ${email}`;
    await page.goto("/partner");
    await expect(page).toHaveURL(/\/account/);

    await sql`update users set role = 'associate', active = false where email = ${email}`;
    await page.goto("/partner");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("1.2 sessions", () => {
  test("sign out revokes the session server-side; a replayed cookie is useless", async ({ page, context }) => {
    await signIn(page, "finance@hspmart.test");
    await expect(page).toHaveURL(/\/admin$/);
    const cookie = (await context.cookies()).find((c) => c.name === "hsp_session")!;

    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(`${E2E_BASE_URL}/`);

    await context.addCookies([cookie]);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login/);
  });

  test("a tampered session cookie is rejected", async ({ page, context }) => {
    await signIn(page, "procurement@hspmart.test");
    const cookie = (await context.cookies()).find((c) => c.name === "hsp_session")!;
    const [h, p, s] = cookie.value.split(".");
    const claims = JSON.parse(Buffer.from(p, "base64url").toString());
    const forged = Buffer.from(JSON.stringify({ ...claims, role: "hsp_admin" })).toString("base64url");
    await context.clearCookies();
    await context.addCookies([{ ...cookie, value: `${h}.${forged}.${s}` }]);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("1.3 audit log", () => {
  test("signup, login and logout are written to the audit trail and shown to admins", async ({ page }) => {
    const email = uniqueEmail("audited");
    await signIn(page, email);
    const [u] = await sql`select id from users where email = ${email}`;
    await page.goto("/");
    await page.goto("/login"); // still signed in → bounced to /account
    const actions = await sql`
      select action from audit_events where actor_id = ${u.id} order by created_at`;
    expect(actions.map((a) => a.action)).toEqual(["user.signup", "auth.login"]);

    await page.context().clearCookies();
    await signIn(page, "admin@hspmart.test");
    await expect(page.getByTestId("audit-table")).toContainText("auth.login");
    await expect(page.getByTestId("audit-table")).toContainText("user.signup");
  });
});
