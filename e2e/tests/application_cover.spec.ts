import { expect, test } from "@playwright/test";
import { sql } from "../helpers";

// Smoke test of the main storefront journeys: navigation, search and add to cart.
test.describe("Application Coverage", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("navigates through the main pages", async ({ page }) => {
    const nav = page.getByRole("navigation", { name: "Main navigation" });
    await nav.getByRole("link", { name: "Products", exact: true }).click();
    await expect(page).toHaveURL(/\/products/);
    await nav.getByRole("link", { name: "Home", exact: true }).click();
    await expect(page).toHaveURL(/\/$/);
    await page.getByRole("banner").getByRole("button", { name: /Open cart/ }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("searches from the header", async ({ page }) => {
    const box = page.getByRole("banner").getByLabel("Search products");
    await box.fill("pen");
    await box.press("Enter");
    await expect(page).toHaveURL(/\/search\?q=pen/);
  });

  test("adds an item to the cart", async ({ page }) => {
    const [p] = await sql`select slug from products where active and price_paise > 0 and min_order_quantity = 1
                          and not customizable and stock_status = 'in_stock' order by sort_order limit 1`;
    await page.goto(`/products/${p.slug}`);
    await page.getByRole("button", { name: "Add to cart" }).first().click();
    await expect(page.getByText(/Added to cart/).first()).toBeVisible();
  });
});
