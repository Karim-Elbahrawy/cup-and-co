import { test, expect } from '@playwright/test';

/**
 * Phase 7 E2E: admin dashboard smoke tests — login, orders board,
 * and owner-only pages.
 */

test('admin login with demo credentials', async ({ page }) => {
  await page.goto('/login');

  await page.getByLabel(/Email/i).fill('owner@cupandco.app');
  await page.getByLabel(/Password/i).fill('any-password');
  await page.getByRole('button', { name: /Sign in/i }).click();

  await expect(page).toHaveURL('/');
  await expect(page.getByText(/Your morning, handled/i)).toBeVisible();
});

test('admin orders kanban loads', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel(/Email/i).fill('owner@cupandco.app');
  await page.getByLabel(/Password/i).fill('any-password');
  await page.getByRole('button', { name: /Sign in/i }).click();

  await page.getByRole('link', { name: /Orders/i }).click();
  await expect(page).toHaveURL('/orders');

  await expect(page.getByText(/Received/i)).toBeVisible();
  await expect(page.getByText(/Preparing/i)).toBeVisible();
  await expect(page.getByText(/Ready/i)).toBeVisible();
  await expect(page.getByText(/Completed/i)).toBeVisible();
});

test('barista cannot access owner-only pages', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel(/Email/i).fill('barista@cupandco.app');
  await page.getByLabel(/Password/i).fill('any-password');
  await page.getByRole('button', { name: /Sign in/i }).click();

  await expect(page).toHaveURL('/');

  await expect(page.getByRole('link', { name: /Reviews/i })).not.toBeVisible();
  await expect(page.getByRole('link', { name: /Users/i })).not.toBeVisible();
  await expect(page.getByRole('link', { name: /Offers/i })).not.toBeVisible();
  await expect(page.getByRole('link', { name: /Reports/i })).not.toBeVisible();

  await expect(page.getByRole('link', { name: /Orders/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /QR Receipts/i })).toBeVisible();
});