import { test, expect } from '@playwright/test';

/**
 * Phase 1 happy path: phone OTP → role select → home. The API is stubbed
 * via Playwright route interception so the test runs without the Express
 * server (CI just needs the Next dev server).
 */
test('login → verify → role → home flow with stubbed API', async ({ page }) => {
  await page.route('**/auth/otp/send', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, phone: '+201000000001', devCode: '000000', message: 'OTP sent' }),
    });
  });

  await page.route('**/auth/otp/verify', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        token: 'test-jwt-token',
        user: {
          id: 'u-1',
          phone: '+201000000001',
          role: 'student',
          verificationStatus: 'approved',
          phoneVerified: true,
        },
      }),
    });
  });

  await page.route('**/catalog', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        categories: [
          { id: 'cat-coffee', slug: 'coffee', name_en: 'Coffee', name_ar: 'قهوة', sort_order: 1 },
        ],
        products: [
          {
            id: 'velvet-cappuccino',
            category_id: 'cat-coffee',
            name_en: 'Velvet Cappuccino',
            name_ar: 'كابتشينو فيلفيت',
            description_en: 'Silky steamed milk',
            description_ar: '',
            base_price_egp: 65,
            image_url: '/images/products/velvet-cappuccino.svg',
            prep_minutes: 5,
            is_available: true,
            sort_order: 0,
            rating_avg: 4.9,
            rating_count: 128,
          },
        ],
        offers: [
          {
            id: 'offer-today',
            name_en: 'Today Only',
            name_ar: 'اليوم فقط',
            type: 'percentage',
            value: 70,
            starts_at: new Date().toISOString(),
            ends_at: new Date(Date.now() + 86_400_000).toISOString(),
            target_roles: ['student', 'faculty', 'office'],
            code: null,
            usage_limit: null,
            usage_count: 0,
          },
        ],
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
    });
  });

  await page.route('**/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: {
          id: 'u-1',
          phone: '+201000000001',
          role: 'student',
          verificationStatus: 'approved',
          phoneVerified: true,
        },
        points: 240,
      }),
    });
  });

  // 1. Land on root → redirected to login.
  await page.goto('/');
  await expect(page).toHaveURL(/\/login$/);

  // 2. Enter phone, send code.
  await page.getByLabel('Phone number').fill('1000000001');
  await page.getByRole('button', { name: /Send Code/i }).click();

  // 3. Verify page → enter the dev code.
  await expect(page).toHaveURL(/\/verify/);
  await expect(page.getByRole('heading', { name: /Verify your number/i })).toBeVisible();
  // Type the 6 digits of the demo code; auto-advance should hit the last box.
  for (const digit of '000000') {
    await page.keyboard.type(digit);
  }

  // Auto-advance triggers `verify` on the last digit. Allow the route change
  // to settle.
  await expect(page).toHaveURL(/\/role/, { timeout: 5000 });

  // 4. Pick the default Student role and continue.
  await expect(page.getByText(/How do you take your campus\?/i)).toBeVisible();
  await page.getByRole('button', { name: /Continue/i }).click();

  // 5. Verify-ID page (skippable). Skip.
  await expect(page).toHaveURL(/\/verify-id/);
  await page.getByRole('button', { name: /Skip for now/i }).click();

  // 6. Land on home with the popular section visible.
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: /Popular/i })).toBeVisible();
  await expect(page.getByText(/Velvet Cappuccino/i)).toBeVisible();
});
