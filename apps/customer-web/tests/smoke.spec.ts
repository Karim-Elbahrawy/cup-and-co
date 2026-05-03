import { test, expect } from '@playwright/test';

test('home page renders Cup & Co branding', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Cup & Co/i })).toBeVisible();
  await expect(page.getByText(/Today Only/i)).toBeVisible();
  await expect(page.getByText(/70% OFF/i)).toBeVisible();
});
