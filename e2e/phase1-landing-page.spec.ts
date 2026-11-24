import { test, expect } from '@playwright/test';



test.describe('Landing Page', () => {
  test('should have HSP Mart logo', async ({ page }) => {
    await page.goto('/');
    const logo = await page.locator('img[src*="hsp-mart-logo"]');
    await expect(logo).toBeVisible();
  });

  test('should have login button', async ({ page }) => {
    await page.goto('/');
    const loginButton = await page.locator('button:text("Login")');
    await expect(loginButton).toBeVisible();
  });
});
