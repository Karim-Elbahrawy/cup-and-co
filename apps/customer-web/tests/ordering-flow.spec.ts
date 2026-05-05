import { test, expect } from '@playwright/test';

/**
 * Full ordering happy path: home → product detail → add to cart → cart →
 * checkout → place order (cash) → order tracking page.
 * All API calls are stubbed via Playwright route interception so the test
 * runs without the Express server.
 */

// ─── Shared stub factories ─────────────────────────────────────────────────

const STUB_USER = {
  id: 'u-1',
  phone: '+201000000001',
  role: 'student',
  verificationStatus: 'approved',
  phoneVerified: true,
};

const STUB_PRODUCT = {
  id: 'velvet-cappuccino',
  category_id: 'cat-coffee',
  name_en: 'Velvet Cappuccino',
  name_ar: 'كابتشينو فيلفيت',
  description_en: 'Silky steamed milk',
  description_ar: 'حليب ناعم مطبوخ على البخار',
  base_price_egp: 65,
  image_url: '/images/products/velvet_cappuccino.png',
  prep_minutes: 5,
  is_available: true,
  sort_order: 0,
  rating_avg: 4.9,
  rating_count: 128,
};

const STUB_CATALOG = {
  categories: [{ id: 'cat-coffee', slug: 'coffee', name_en: 'Coffee', name_ar: 'قهوة', sort_order: 1 }],
  products: [STUB_PRODUCT],
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
};

async function stubAuth(page: import('@playwright/test').Page) {
  await page.route('**/auth/otp/send', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, phone: '+201000000001', devCode: '000000', message: 'OTP sent' }),
    }),
  );

  await page.route('**/auth/otp/verify', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ token: 'test-jwt', user: STUB_USER }),
    }),
  );

  // Handle both GET (auth check) and PATCH (profile setup)
  await page.route('**/me', async (route) => {
    if (route.request().method() === 'PATCH') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user: STUB_USER, points: 240 }),
      });
    }
  });

  await page.route('**/catalog', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(STUB_CATALOG),
    }),
  );
}

async function loginFlow(page: import('@playwright/test').Page) {
  await page.goto('/');
  await expect(page).toHaveURL(/\/login$/);

  await page.getByLabel('Phone number').fill('1000000001');
  await page.getByRole('button', { name: /Send Code/i }).click();
  await expect(page).toHaveURL(/\/verify/);

  // Click first box to guarantee focus before typing (autoFocus useEffect is async).
  await page.locator('[aria-label="Digit 1"]').click();
  for (const digit of '000000') {
    await page.keyboard.type(digit);
  }
  await expect(page).toHaveURL(/\/role/, { timeout: 10000 });

  await page.getByRole('button', { name: /Continue/i }).click();
  await expect(page).toHaveURL(/\/profile-setup/, { timeout: 10000 });
  await page.getByRole('button', { name: /Continue/i }).click();
  // Verify-ID step was removed; profile-setup now lands directly on home.
  await expect(page).toHaveURL(/\/$/, { timeout: 10000 });
}

// ─── Tests ─────────────────────────────────────────────────────────────────

test.describe('Ordering flow', () => {
  test('home → product detail → add to cart → cart shows item', async ({ page }) => {
    await stubAuth(page);

    await page.route('**/products/velvet-cappuccino', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          product: STUB_PRODUCT,
          options: [
            { id: 'opt-sm', group_name: 'size', name_en: 'Small', name_ar: 'صغير', price_delta_egp: -10 },
            { id: 'opt-md', group_name: 'size', name_en: 'Medium', name_ar: 'وسط', price_delta_egp: 0 },
            { id: 'opt-lg', group_name: 'size', name_en: 'Large', name_ar: 'كبير', price_delta_egp: 10 },
          ],
          reviews: [],
          is_favorited: false,
        }),
      }),
    );

    await page.route('**/loyalty', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ balance: 240, discountAvailableEgp: 10 }),
      }),
    );

    await loginFlow(page);

    // Home: product card is visible
    await expect(page.getByText('Velvet Cappuccino')).toBeVisible();

    // Navigate to product detail
    await page.getByRole('link', { name: /Velvet Cappuccino/i }).click();
    await expect(page).toHaveURL(/\/products\/velvet-cappuccino/, { timeout: 8000 });

    // Product detail page: name, add-to-cart button visible
    await expect(page.getByRole('heading', { name: /Velvet Cappuccino/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Add to Cart/i })).toBeVisible();

    // Add to cart — force bypasses the fixed bottom-nav which has a higher z-index
    await page.getByRole('button', { name: /Add to Cart/i }).click({ force: true });

    // Should redirect to cart
    await expect(page).toHaveURL(/\/cart/, { timeout: 3000 });

    // Cart shows the item
    await expect(page.getByText('Velvet Cappuccino')).toBeVisible();
    await expect(page.getByText(/EGP 65/).first()).toBeVisible();
  });

  test('cart → checkout → place order → order tracking', async ({ page }) => {
    await stubAuth(page);

    await page.route('**/loyalty', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ balance: 0, discountAvailableEgp: 0 }),
      }),
    );

    const ORDER_ID = 'ord-test-123';

    await page.route('**/orders', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            order: {
              id: ORDER_ID,
              status: 'received',
              pickupCode: 'A42',
              items: [{ productId: 'velvet-cappuccino', quantity: 1, productNameEn: 'Velvet Cappuccino', options: {}, unitPriceEgp: 65, lineTotalEgp: 65, imageUrl: '' }],
              subtotalEgp: 65,
              discountEgp: 0,
              totalEgp: 65,
              fulfillmentType: 'pickup',
              paymentMethod: 'cash',
              notes: null,
              createdAt: new Date().toISOString(),
            },
            timeline: [
              { id: 'tl-1', label: 'Order received', done: true, active: false, at: new Date().toISOString() },
              { id: 'tl-2', label: 'Accepted', done: false, active: false, at: null },
            ],
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.route(`**/orders/${ORDER_ID}`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          order: {
            id: ORDER_ID,
            status: 'received',
            pickupCode: 'A42',
            items: [{ productId: 'velvet-cappuccino', quantity: 1, productNameEn: 'Velvet Cappuccino', options: {}, unitPriceEgp: 65, lineTotalEgp: 65, imageUrl: '' }],
            subtotalEgp: 65,
            discountEgp: 0,
            totalEgp: 65,
            fulfillmentType: 'pickup',
            paymentMethod: 'cash',
            notes: null,
            createdAt: new Date().toISOString(),
          },
          timeline: [
            { id: 'tl-1', label: 'Order received', done: true, active: false, at: new Date().toISOString() },
            { id: 'tl-2', label: 'Accepted', done: false, active: false, at: null },
          ],
        }),
      }),
    );

    await loginFlow(page);

    // Inject a cart item directly via localStorage so we skip the product-detail flow
    await page.evaluate(() => {
      const cart = {
        state: {
          items: [
            {
              productId: 'velvet-cappuccino',
              productNameEn: 'Velvet Cappuccino',
              productNameAr: 'كابتشينو فيلفيت',
              imageUrl: '',
              quantity: 1,
              options: {},
              unitPriceEgp: 65,
            },
          ],
          redeemPoints: 0,
        },
        version: 1,
      };
      localStorage.setItem('cup-and-co.cart', JSON.stringify(cart));
    });

    // Go directly to cart
    await page.goto('/cart');
    await expect(page.getByText('Velvet Cappuccino')).toBeVisible();
    await expect(page.getByText(/EGP 65/).first()).toBeVisible();

    await page.getByRole('button', { name: /Checkout/i }).click();
    await expect(page).toHaveURL(/\/checkout/);

    // Checkout page heading visible
    await expect(page.getByText(/Checkout/i)).toBeVisible();

    // Place order (cash is default)
    await page.getByRole('button', { name: /Place Order/i }).click();

    // Should reach order tracking (after success overlay or direct redirect)
    await expect(page).toHaveURL(new RegExp(`/orders/${ORDER_ID}`), { timeout: 6000 });

    // Pickup code visible
    await expect(page.getByText('A42')).toBeVisible();
  });

  test('cart quantity stepper increases and decreases item count', async ({ page }) => {
    await stubAuth(page);

    await page.route('**/loyalty', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ balance: 0, discountAvailableEgp: 0 }),
      }),
    );

    await loginFlow(page);

    await page.evaluate(() => {
      const cart = {
        state: {
          items: [
            {
              productId: 'velvet-cappuccino',
              productNameEn: 'Velvet Cappuccino',
              productNameAr: 'كابتشينو فيلفيت',
              imageUrl: '',
              quantity: 1,
              options: {},
              unitPriceEgp: 65,
            },
          ],
          redeemPoints: 0,
        },
        version: 1,
      };
      localStorage.setItem('cup-and-co.cart', JSON.stringify(cart));
    });

    await page.goto('/cart');
    await expect(page.getByText('1')).toBeVisible();

    await page.getByRole('button', { name: 'Increase' }).click();
    await expect(page.getByText('2')).toBeVisible();
    await expect(page.getByText(/EGP 130/).first()).toBeVisible();

    await page.getByRole('button', { name: 'Decrease' }).click();
    await expect(page.getByText('1')).toBeVisible();
  });
});
