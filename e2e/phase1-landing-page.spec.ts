import { expect, test } from "@playwright/test";

test.describe("Landing Page", () => {
  test("shows the HSP Mart logo linking home", async ({ page }) => {
    await page.goto("/");
    const logo = page.getByRole("banner").getByRole("link", { name: "HSP Mart home" });
    await expect(logo).toBeVisible();
    await expect(logo.locator('img[src*="hsp-mart-logo"]')).toBeVisible();
  });

  test("the account button sends visitors to sign in", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("banner").getByRole("link", { name: "Account" }).click();
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByLabel("Email or mobile number")).toBeVisible();
  });
});
