import { test, expect } from '@playwright/test';

/**
 * RTL smoke tests — verify that when the user has Arabic selected, the HTML
 * root element flips to dir="rtl" and key text renders in Arabic.
 * API is stubbed; the test injects the language preference via localStorage.
 */

const STUB_USER = {
  id: 'u-1',
  phone: '+201000000001',
  role: 'student',
  verificationStatus: 'approved',
  phoneVerified: true,
};

test.describe('RTL / Arabic locale', () => {
  test.beforeEach(async ({ page }) => {
    // Stub all API calls needed for home page
    await page.route('**/me', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user: STUB_USER, points: 240 }),
      }),
    );

    await page.route('**/catalog', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          categories: [{ id: 'cat-coffee', slug: 'coffee', name_en: 'Coffee', name_ar: 'قهوة', sort_order: 1 }],
          products: [
            {
              id: 'velvet-cappuccino',
              category_id: 'cat-coffee',
              name_en: 'Velvet Cappuccino',
              name_ar: 'كابتشينو فيلفيت',
              description_en: 'Silky steamed milk',
              description_ar: 'حليب ناعم',
              base_price_egp: 65,
              image_url: '',
              prep_minutes: 5,
              is_available: true,
              sort_order: 0,
              rating_avg: 4.9,
              rating_count: 128,
            },
          ],
          offers: [],
          kiosk: {
            id: 'kiosk-1',
            is_open: true,
            message_en: null,
            message_ar: null,
            capacity_per_slot: 10,
            slot_minutes: 15,
            opens_at: '07:00',
            closes_at: '22:00',
          },
        }),
      }),
    );
  });

  test('html[dir] is rtl when language preference is Arabic', async ({ page }) => {
    // Pre-seed the Zustand session store with Arabic language
    await page.goto('/');
    await page.evaluate(() => {
      const sessionKey = 'cup-and-co.session';
      const existing = JSON.parse(localStorage.getItem(sessionKey) ?? '{}');
      localStorage.setItem(
        sessionKey,
        JSON.stringify({
          ...existing,
          state: {
            ...(existing.state ?? {}),
            token: 'test-jwt',
            language: 'ar',
            user: {
              id: 'u-1',
              phone: '+201000000001',
              role: 'student',
              verificationStatus: 'approved',
              phoneVerified: true,
            },
          },
          version: existing.version ?? 0,
        }),
      );
    });

    // Reload to apply the stored preference
    await page.reload();

    // HtmlLangSync fires on hydration and sets dir="rtl"
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl', { timeout: 5000 });
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  });

  test('home page shows Arabic product name when language is Arabic', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem(
        'cup-and-co.session',
        JSON.stringify({
          state: {
            token: 'test-jwt',
            language: 'ar',
            user: {
              id: 'u-1',
              phone: '+201000000001',
              role: 'student',
              verificationStatus: 'approved',
              phoneVerified: true,
            },
          },
          version: 0,
        }),
      );
    });

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl', { timeout: 5000 });

    // Arabic product name should be visible instead of English
    await expect(page.getByText('كابتشينو فيلفيت')).toBeVisible({ timeout: 5000 });
  });

  test('html[dir] is ltr when language is English (default)', async ({ page }) => {
    await page.goto('/');
    // Default session is English — dir should be ltr
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  });
});
