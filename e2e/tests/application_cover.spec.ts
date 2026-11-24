import { test, expect } from '@playwright/test';

// Example test to cover the complete application

test.describe('Application Coverage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000'); // Adjust the URL based on your application
  });

  test('should navigate through the application', async ({ page }) => {
    await page.click('text=Home'); // Adjust the selector based on your application
    await expect(page).toHaveURL('/');

    await page.click('text=Products');
    await expect(page).toHaveURL('/products');

    await page.click('text=Cart');
    await expect(page).toHaveURL('/cart');
  });

  test('should perform a search', async ({ page }) => {
    await page.fill('input[name="search"]', 'iPhone');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/search?query=iPhone');
  });

  test('should add an item to the cart', async ({ page }) => {
    await page.click('text=Add to Cart');
    await expect(page).toHaveText('Added to Cart');
  });
});
