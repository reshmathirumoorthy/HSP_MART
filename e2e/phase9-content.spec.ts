/**
 * Phase 9: every storefront page renders catalogue and content from the backend, and staff change it
 * in the admin app — no code deploy needed.
 */
import { expect, test, type Page } from "@playwright/test";
import { ADMIN_PORT } from "../playwright.config";
import { asUser, sql } from "./helpers";

const ADMIN_APP = `http://localhost:${ADMIN_PORT}`;
test.describe.configure({ mode: "serial" });

async function adminApp(page: Page, path: string) {
  await page.goto(`${ADMIN_APP}${path}`);
  if (await page.getByLabel("Email or mobile").isVisible().catch(() => false)) {
    await page.getByLabel("Email or mobile").fill("admin@hspmart.test");
    await page.getByRole("button", { name: "Send code" }).click();
    const code = (await page.getByTestId("dev-code").textContent())!.replace(/\D/g, "");
    await page.getByLabel(/Code sent/).fill(code);
    await page.getByRole("button", { name: "Sign in" }).click();
  }
}

test("the storefront shows what the backend holds (announcement uses the live delivery threshold)", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("region", { name: "Store notices" })).toContainText("Free delivery on orders above ₹999");
  const [{ n }] = await sql`select count(*)::int as n from products where active`;
  expect(n).toBeGreaterThan(100);
});

test("editing the announcement and hero in Site content updates the storefront", async ({ browser }) => {
  const { ctx, page } = await asUser(browser, "admin@hspmart.test");
  await adminApp(page, "/content");
  const announcement = page.getByTestId("content-announcement");
  await announcement.getByLabel("announcement.messages.0").fill("Diwali orders close on 20 October");
  await announcement.getByRole("button", { name: "Save announcement" }).click();
  await expect(announcement.getByRole("status")).toContainText("Saved");

  await page.getByRole("tab", { name: "Homepage" }).click();
  const home = page.getByTestId("content-home");
  await home.getByLabel("home.hero.titleEmphasis").fill("festive");
  await home.getByRole("button", { name: "Save home" }).click();
  await expect(home.getByRole("status")).toContainText("Saved");

  const store = await browser.newPage();
  await store.goto("/");
  await expect(store.getByRole("region", { name: "Store notices" })).toContainText("Diwali orders close on 20 October");
  await expect(store.getByRole("heading", { level: 1 })).toContainText("The art of festive gifting.");
  await store.close();
  await ctx.close();
});

test("editing a product's price and name in Products updates the product page", async ({ browser }) => {
  const [p] = await sql`select id, slug, name from products where active and price_paise > 0 and min_order_quantity = 1 order by sort_order limit 1`;
  const { ctx, page } = await asUser(browser, "admin@hspmart.test");
  await adminApp(page, "/products");
  await page.getByLabel("Search products").fill(p.slug);
  await page.getByTestId("products-table").getByRole("link", { name: p.name }).click();
  await page.getByLabel(/^Selling price/).fill("1234");
  await page.getByLabel("Name", { exact: true }).fill(`${p.name} (2026 edition)`);
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("status")).toContainText("live on the store");

  const store = await browser.newPage();
  await store.goto(`/products/${p.slug}`);
  await expect(store.getByRole("heading", { level: 1 })).toContainText("(2026 edition)");
  await expect(store.locator("main")).toContainText("₹1,234");
  const [row] = await sql`select price_paise from products where id = ${p.id}`;
  expect(Number(row.price_paise)).toBe(123400);
  await store.close();
  await ctx.close();
});

test("delivery promises everywhere match the backend's checkout rule", async ({ page }) => {
  const [p] = await sql`select slug from products where active and price_paise > 0 order by sort_order limit 1`;
  await page.goto(`/products/${p.slug}`);
  await expect(page.locator("main")).toContainText("Free delivery on orders of ₹999 and above");
  await expect(page.locator("main")).not.toContainText("₹499");
});
