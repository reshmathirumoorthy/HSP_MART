/**
 * Phase 8: every screen is backed by the FastAPI service. Storefront forms, the customer account
 * and the React admin portal all read and write real records.
 */
import { expect, test } from "@playwright/test";
import { ADMIN_PORT } from "../playwright.config";
import { adminSignIn, asUser, createUser, signIn, sql, uniqueEmail } from "./helpers";

const ADMIN_APP = `http://localhost:${ADMIN_PORT}`;

test.describe.configure({ mode: "serial" });

test.describe("8.1 storefront forms create real enquiries", () => {
  test("the contact form is delivered to HSP with a reference", async ({ page }) => {
    const email = uniqueEmail("contact");
    await page.goto("/contact");
    await page.getByLabel(/^Full name/).fill("Asha Rao");
    await page.getByLabel(/^Email/).fill(email);
    await page.getByLabel(/^Phone/).fill("9876543210");
    await page.getByLabel(/^Enquiry type/).selectOption("Bulk Order");
    await page.getByLabel(/^Subject/).fill("Diwali hampers");
    await page.getByLabel(/^Message/).fill("We need 300 branded hampers delivered to Pune and Mumbai.");
    await page.getByRole("button", { name: /Send/ }).click();
    const ref = page.getByTestId("enquiry-reference");
    await expect(ref).toHaveText(/^ENQ-/);
    const [e] = await sql`select kind, status, subject from enquiries where email = ${email}`;
    expect(e).toMatchObject({ kind: "contact", status: "new", subject: "Bulk Order: Diwali hampers" });
  });
});

test.describe("8.2 the customer account is server-backed", () => {
  const email = uniqueEmail("acct");

  test("account pages require sign-in", async ({ page }) => {
    await page.goto("/account/orders");
    await expect(page).toHaveURL(/\/login\?next=%2Faccount%2Forders/);
  });

  test("profile and addresses persist on the account, across devices", async ({ browser }) => {
    await createUser(email, "customer", "New Customer");
    const { ctx, page } = await asUser(browser, email);
    await page.goto("/account/profile");
    await page.getByRole("button", { name: "Edit profile" }).click();
    await page.locator("#profile-name").fill("Meera Iyer");
    await page.getByRole("button", { name: "Save Changes" }).click();
    await expect(page.getByRole("status")).toContainText("saved to your HSP account");
    const [u] = await sql`select name from users where email = ${email}`;
    expect(u.name).toBe("Meera Iyer");

    await page.goto("/account/addresses");
    await page.getByRole("button", { name: "Add address" }).first().click();
    await page.locator("#addr-label").fill("Office");
    await page.locator("#addr-name").fill("Meera Iyer");
    await page.locator("#addr-phone").fill("9876543210");
    await page.locator("#addr-line1").fill("12 Lake View Road");
    await page.locator("#addr-city").fill("Coimbatore");
    await page.locator("#addr-state").selectOption("Tamil Nadu");
    await page.locator("#addr-postal").fill("641002");
    await page.getByRole("button", { name: "Save address" }).click();
    await expect(page.getByRole("status")).toContainText("Address saved to your account");
    await ctx.close();

    // A fresh browser (no local storage) sees the same address and name.
    const other = await browser.newContext();
    const p2 = await other.newPage();
    await signIn(p2, email, "/account/addresses");
    await expect(p2.getByText("12 Lake View Road")).toBeVisible();
    await p2.goto("/account/profile");
    await expect(p2.locator("#profile-name")).toHaveValue("Meera Iyer");
    await other.close();
  });

  test("a bulk request shows under Account → Bulk requests, and HSP turns it into a quote", async ({ browser }) => {
    const { ctx, page } = await asUser(browser, email);
    const res = await page.request.post("/api/enquiries/bulk-quote", {
      data: {
        lines: [{ productId: "executive-notebook-01", quantity: 150, notes: "Navy" }],
        requirements: { orderType: "corporate", branding: "yes", brandName: "Iyer & Co" },
        customer: { fullName: "Meera Iyer", email, phone: "9876543210", organizationName: "Iyer & Co", customerType: "business" },
        address: { line1: "12 Lake View Road", city: "Coimbatore", state: "Tamil Nadu", pincode: "641002" },
      },
    });
    const { number } = await res.json();
    await page.goto("/account/quotes");
    await expect(page.getByText(number)).toBeVisible();
    await ctx.close();

    const admin = await asUser(browser, "admin@hspmart.test");
    await sql`delete from otp_codes where identifier = ${"admin@hspmart.test"}`;
    await adminSignIn(admin.page, `${ADMIN_APP}/enquiries`, "admin@hspmart.test");
    const card = admin.page.getByTestId(`enquiry-${number}`);
    await expect(card).toContainText("Iyer & Co");
    await card.getByRole("button", { name: "Create priced quote" }).click();
    await expect(admin.page.getByTestId("quote-status")).toHaveText("approved");
    const [e] = await sql`select e.status, q.number from enquiries e join quotations q on q.id = e.quotation_id where e.number = ${number}`;
    expect(e.status).toBe("quoted");
    await admin.ctx.close();
  });
});

test.describe("8.3 the React admin portal runs on the API", () => {
  test("staff sign in, see orders and run a fulfilment step with business-rule errors shown", async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await sql`delete from otp_codes where identifier = ${"admin@hspmart.test"}`;
    await adminSignIn(page, `${ADMIN_APP}/suppliers`, "admin@hspmart.test");

    const name = `SPA Supplier ${Date.now().toString(36)}`;
    await page.getByLabel("name", { exact: true }).fill(name);
    await page.getByRole("button", { name: "Add", exact: true }).click();
    const card = page.getByTestId(`supplier-${name}`);
    await card.getByRole("button", { name: "Approve" }).click();
    await expect(card.getByText("approved", { exact: true })).toBeVisible();
    await card.getByLabel("SKU").fill("NOT-A-SKU");
    await card.getByLabel("Cost (₹)").fill("100");
    await card.getByRole("button", { name: "Save rate" }).click();
    await expect(card.getByRole("alert")).toContainText("Unknown SKU");

    await page.getByRole("link", { name: "Orders" }).click();
    await expect(page.getByTestId("orders-table")).toBeVisible();
    await page.getByRole("link", { name: "Payouts" }).click();
    await expect(page.getByRole("link", { name: "Tally vouchers (XML)" })).toBeVisible();
    await ctx.close();
  });

  test("customers cannot use the admin portal", async ({ browser }) => {
    const email = uniqueEmail("nosy");
    await createUser(email, "customer");
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await adminSignIn(page, ADMIN_APP, email, false);
    await expect(page.getByText("has no admin access")).toBeVisible();
    const api = await page.request.get(`${ADMIN_APP}/api/admin/dashboard`);
    expect(api.status()).toBe(403);
    await ctx.close();
  });
});
