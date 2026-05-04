import { test, expect } from '@playwright/test';

/**
 * Admin dashboard E2E tests. Covers:
 *  1. Owner login → orders kanban page
 *  2. Kanban shows SSE-loaded orders
 *  3. Barista role guard — /users redirects to /
 *
 * Admin auth is localStorage-based (dev stub, no real API needed).
 * The admin API calls (orders SSE, users list) are stubbed via route interception.
 */

// Admin session keys matching apps/admin/src/lib/session.ts
const OWNER_SESSION = JSON.stringify({
  email: 'owner@cupandco.app',
  role: 'owner',
  phone: '+201000000004',
  userId: 'demo-owner',
});

const BARISTA_SESSION = JSON.stringify({
  email: 'barista@cupandco.app',
  role: 'barista',
  phone: '+201000000005',
  userId: 'demo-barista',
});

const STUB_ORDERS = [
  {
    id: 'ord-1',
    status: 'received',
    pickupCode: 'A01',
    userId: 'u-1',
    items: [{ productId: 'velvet-cappuccino', productNameEn: 'Velvet Cappuccino', quantity: 1, options: {}, unitPriceEgp: 65, lineTotalEgp: 65 }],
    subtotalEgp: 65,
    discountEgp: 0,
    totalEgp: 65,
    fulfillmentType: 'pickup',
    paymentMethod: 'cash',
    notes: null,
    createdAt: new Date(Date.now() - 60_000).toISOString(),
    scheduledFor: null,
  },
  {
    id: 'ord-2',
    status: 'preparing',
    pickupCode: 'B02',
    userId: 'u-2',
    items: [{ productId: 'flat-white', productNameEn: 'Flat White', quantity: 2, options: {}, unitPriceEgp: 55, lineTotalEgp: 110 }],
    subtotalEgp: 110,
    discountEgp: 0,
    totalEgp: 110,
    fulfillmentType: 'pickup',
    paymentMethod: 'cash',
    notes: null,
    createdAt: new Date(Date.now() - 120_000).toISOString(),
    scheduledFor: null,
  },
];

async function stubAdminOrders(page: import('@playwright/test').Page) {
  // Stub both the polling endpoint and the SSE endpoint
  await page.route('**/admin/orders**', (route) => {
    const url = route.request().url();
    if (url.includes('stream=true') || url.includes('/stream')) {
      // SSE — return an empty stream that immediately closes
      route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
        body: `data: ${JSON.stringify({ type: 'snapshot', orders: STUB_ORDERS })}\n\n`,
      });
    } else {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ orders: STUB_ORDERS }),
      });
    }
  });
}

// ─── Tests ──────────────────────────────────────────────────────────────────

test.describe('Admin login', () => {
  test('owner can log in and reaches the orders page', async ({ page }) => {
    await page.goto('/');
    // Unauthenticated → redirected to /login
    await expect(page).toHaveURL(/\/login$/);

    await page.getByLabel('Email').fill('owner@cupandco.app');
    await page.getByLabel('Password').fill('anypassword');
    await page.getByRole('button', { name: /Sign in/i }).click();

    // Should land on a non-login page (dashboard root → orders kanban)
    await expect(page).not.toHaveURL(/\/login/, { timeout: 8000 });
  });

  test('unknown email shows error', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('unknown@example.com');
    await page.getByLabel('Password').fill('anypassword');
    await page.getByRole('button', { name: /Sign in/i }).click();

    await expect(page.locator('p[role="alert"]')).toBeVisible();
    await expect(page.locator('p[role="alert"]')).toContainText(/owner@cupandco.app/i);
  });

  test('empty password shows error', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('owner@cupandco.app');
    // Leave password empty
    await page.getByRole('button', { name: /Sign in/i }).click();
    // HTML5 validation or our error should prevent login
    // The form has `required` so it won't submit; just verify we stay on login
    await expect(page).toHaveURL(/\/login$/);
  });
});

test.describe('Orders kanban', () => {
  test.beforeEach(async ({ page }) => {
    // Pre-seed the owner session so we skip the login page
    await page.goto('/login');
    await page.evaluate((sessionJson) => {
      localStorage.setItem('admin_session', sessionJson);
    }, OWNER_SESSION);
    await stubAdminOrders(page);
  });

  test('shows kanban board with column headers', async ({ page }) => {
    await page.goto('/orders');
    await expect(page.getByRole('heading', { name: /Orders/i })).toBeVisible();

    const board = page.getByRole('region', { name: 'Order kanban board' });
    await expect(board).toBeVisible();

    // All 5 column headers
    for (const col of ['Received', 'Accepted', 'Preparing', 'Ready', 'Completed']) {
      await expect(board.getByRole('region', { name: `${col} column` })).toBeVisible();
    }
  });

  test('orders appear in correct columns after data load', async ({ page }) => {
    await page.goto('/orders');

    const receivedCol = page.getByRole('region', { name: 'Received column' });
    const preparingCol = page.getByRole('region', { name: 'Preparing column' });

    // Wait for SSE/polling to deliver data
    await expect(receivedCol.getByText('A01')).toBeVisible({ timeout: 8000 });
    await expect(preparingCol.getByText('B02')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Role-based access control', () => {
  test('barista cannot access /users — redirected to /', async ({ page }) => {
    await page.goto('/login');
    await page.evaluate((sessionJson) => {
      localStorage.setItem('admin_session', sessionJson);
    }, BARISTA_SESSION);

    // Stub the users API (should never be called, but safety net)
    await page.route('**/admin/users**', (route) =>
      route.fulfill({ status: 403, body: '{"error":"Forbidden"}' }),
    );

    await page.goto('/users');

    // UsersPage useEffect redirects non-owners to /
    await expect(page).not.toHaveURL(/\/users/, { timeout: 5000 });
  });

  test('owner can access /users', async ({ page }) => {
    await page.goto('/login');
    await page.evaluate((sessionJson) => {
      localStorage.setItem('admin_session', sessionJson);
    }, OWNER_SESSION);

    await page.route('**/admin/users**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ users: [] }),
      }),
    );

    await page.goto('/users');

    // Should stay on /users and show the heading
    await expect(page).toHaveURL(/\/users/);
    await expect(page.getByRole('heading', { name: /Users/i })).toBeVisible({ timeout: 5000 });
  });
});
