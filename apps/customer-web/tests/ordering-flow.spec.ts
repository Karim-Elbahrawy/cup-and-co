import { test, expect } from '@playwright/test';

/**
 * Phase 7 E2E: full ordering flow — browse product, add to cart,
 * checkout with cash, view order tracking.
 */
test('full ordering flow with stubbed API', async ({ page }) => {
  // Stub auth
  await page.route('**/auth/otp/verify', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        token: 'test-jwt',
        user: { id: 'u-1', phone: '+201000000001', role: 'student', verificationStatus: 'approved', phoneVerified: true },
      }),
    });
  });

  // Stub catalog with UUID product IDs
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
        kiosk: {
          id: 'kiosk-1', is_open: true,
          message_en: null, message_ar: null,
          capacity_per_slot: 10, slot_minutes: 15,
          opens_at: '07:00', closes_at: '22:00',
        },
      }),
    });
  });

  // Stub product detail
  await page.route('**/products/*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        product: {
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
        options: [
          { id: 'opt-1', product_id: '22222222-0000-0000-0000-000000000001', group_name: 'size', name_en: 'Small', name_ar: 'صغير', price_delta_egp: -5 },
          { id: 'opt-2', product_id: '22222222-0000-0000-0000-000000000001', group_name: 'size', name_en: 'Medium', name_ar: 'وسط', price_delta_egp: 0 },
          { id: 'opt-3', product_id: '22222222-0000-0000-0000-000000000001', group_name: 'size', name_en: 'Large', name_ar: 'كبير', price_delta_egp: 10 },
          { id: 'opt-4', product_id: '22222222-0000-0000-0000-000000000001', group_name: 'sugar', name_en: 'Normal', name_ar: 'عادي', price_delta_egp: 0 },
        ],
        reviews: [],
        is_favorited: false,
      }),
    });
  });

  // Stub create order
  await page.route('**/orders', async (route) => {
    if (route.request().method() !== 'POST') { await route.continue(); return; }
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        order: {
          id: 'order-test-123',
          userId: 'u-1',
          status: 'received',
          fulfillmentType: 'pickup',
          paymentMethod: 'cash',
          paymentStatus: 'pending',
          totalEgp: 130,
          pickupCode: '4827',
          createdAt: new Date().toISOString(),
          items: [
            { productId: '22222222-0000-0000-0000-000000000001', productNameEn: 'Velvet Cappuccino', quantity: 2, lineTotalEgp: 130 },
          ],
        },
        timeline: [
          { status: 'received', label: 'Received', at: new Date().toISOString(), active: true, done: true },
          { status: 'accepted', label: 'Accepted', at: null, active: false, done: false },
        ],
      }),
    });
  });

  // Stub order detail
  await page.route('**/orders/order-test-123', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        order: {
          id: 'order-test-123',
          userId: 'u-1',
          status: 'received',
          fulfillmentType: 'pickup',
          paymentMethod: 'cash',
          paymentStatus: 'pending',
          totalEgp: 130,
          pickupCode: '4827',
          createdAt: new Date().toISOString(),
          items: [
            { productId: '22222222-0000-0000-0000-000000000001', productNameEn: 'Velvet Cappuccino', quantity: 2, lineTotalEgp: 130 },
          ],
        },
        timeline: [
          { status: 'received', label: 'Received', at: new Date().toISOString(), active: true, done: true },
        ],
      }),
    });
  });

  await page.route('**/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ user: { id: 'u-1', phone: '+201000000001', role: 'student', verificationStatus: 'approved' }, points: 240 }),
    });
  });

  // 1. Login
  await page.goto('/login');
  await page.getByLabel('Phone number').fill('1000000001');
  await page.getByRole('button', { name: /Send Code/i }).click();
  for (const digit of '000000') { await page.keyboard.type(digit); }
  await expect(page).toHaveURL(/\/role/, { timeout: 5000 });
  await page.getByRole('button', { name: /Continue/i }).click();
  await page.getByRole('button', { name: /Skip for now/i }).click();

  // 2. Click product
  await expect(page.getByText(/Velvet Cappuccino/i)).toBeVisible();
  await page.getByText(/Velvet Cappuccino/i).first.click();

  // 3. Product detail
  await expect(page).toHaveURL(/\/products\//);
  await expect(page.getByRole('heading', { name: /Velvet Cappuccino/i })).toBeVisible();

  // 4. Add to cart
  await page.getByRole('button', { name: /Add to Cart/i }).click();

  // 5. Go to cart
  await page.goto('/cart');
  await expect(page.getByText(/Velvet Cappuccino/i)).toBeVisible();

  // 6. Checkout
  await page.getByRole('button', { name: /Checkout/i }).click();
  await expect(page).toHaveURL(/\/checkout/);

  // 7. Place order (cash)
  await page.getByRole('button', { name: /Place Order/i }).click();

  // 8. Order tracking
  await expect(page).toHaveURL(/\/orders\//);
  await expect(page.getByText(/Pickup Code/i)).toBeVisible();
  await expect(page.getByText(/4827/)).toBeVisible();
});
