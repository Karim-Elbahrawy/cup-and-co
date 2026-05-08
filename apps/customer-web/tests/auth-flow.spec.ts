import { test, expect } from '@playwright/test';

/**
 * Phase 1 happy path: phone OTP → verify → role select → profile setup → home.
 * The API is stubbed via Playwright route interception so the test runs
 * without the Express server (CI just needs the Next dev server).
 */
test('login → verify → role → profile-setup → home flow with stubbed API', async ({ page }) => {
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
          { id: '11111111-1111-1111-1111-111111111103', slug: 'milk_coffee', name_en: 'Milk Coffee', name_ar: 'قهوة بالحليب', sort_order: 1 },
        ],
        products: [
          {
            id: '22222222-0000-0000-0000-000000000001',
            category_id: '11111111-1111-1111-1111-111111111103',
            name_en: 'Velvet Cappuccino',
            name_ar: 'كابتشينو فيلفيت',
            description_en: 'Silky steamed milk',
            description_ar: '',
            base_price_egp: 65,
            image_url: '/images/products/hot_coffee.png',
            prep_minutes: 5,
            is_available: true,
            sort_order: 0,
            rating_avg: 4.9,
            rating_count: 128,
          },
        ],
        offers: [],
        kiosk: { id: 'kiosk-1', is_open: true, message_en: null, message_ar: null, capacity_per_slot: 10, slot_minutes: 15, opens_at: '07:00', closes_at: '22:00' },
      }),
    });
  });

  // Stub /me (GET for auth, PATCH for profile setup)
  await page.route('**/me', async (route) => {
    if (route.request().method() === 'PATCH') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { id: 'u-1', phone: '+201000000001', role: 'student', verificationStatus: 'approved', phoneVerified: true },
          points: 240,
        }),
      });
    }
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
  // Click the first box to guarantee focus before typing (autoFocus useEffect
  // runs async — keyboard.type() needs focus to already be there).
  await page.locator('[aria-label="Digit 1"]').click();
  for (const digit of '000000') {
    await page.keyboard.type(digit);
  }

  // Auto-advance triggers `verify` on the last digit.
  await expect(page).toHaveURL(/\/role/, { timeout: 10000 });

  // 4. Pick the default Student role and continue.
  await expect(page.getByText(/How do you take your campus/i)).toBeVisible();
  await page.getByRole('button', { name: /Continue/i }).click();

  // 5. Profile setup → Continue. Verify-ID flow was removed in this pass,
  // so profile-setup completes straight into the home tab.
  await expect(page).toHaveURL(/\/profile-setup/, { timeout: 10000 });
  await page.getByRole('button', { name: /Continue/i }).click();

  // 6. Land on home with the popular section visible.
  await expect(page).toHaveURL(/\/$/, { timeout: 10000 });
  await expect(page.getByRole('heading', { name: /Popular/i })).toBeVisible();
  await expect(page.getByText(/Velvet Cappuccino/i)).toBeVisible();
});
