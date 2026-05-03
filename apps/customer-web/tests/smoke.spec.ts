import { test, expect } from '@playwright/test';

/**
 * Phase 1 smoke: an unauthenticated visit to `/` should land on the login
 * page (the auth guard in `(authed)/layout.tsx` redirects). The login screen
 * shows the wordmark + "Welcome back" heading + the country-code button.
 */
test('unauthenticated visit redirects to login and shows the welcome screen', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: /Welcome back/i })).toBeVisible();
  await expect(page.getByLabel(/Phone number/i)).toBeVisible();
  await expect(page.getByText(/\+20/)).toBeVisible();
});
