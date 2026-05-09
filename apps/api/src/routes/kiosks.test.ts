import { describe, expect, it, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { resetKiosksForTests } from '../db/kiosksStore.js';

const KIOSK_BEARER_TOKEN = 'kiosk-test-bearer-secret';
const KIOSK_ID = '88888888-aaaa-bbbb-cccc-dddddddddddd';

const baristaHeaders = {
  'x-user-id': 'barista-kiosk-test',
  'x-user-role': 'barista',
  'x-verification-status': 'approved',
  'x-user-phone': '+201000000020',
};

const ownerHeaders = {
  'x-user-id': 'owner-kiosk-test',
  'x-user-role': 'owner',
  'x-verification-status': 'approved',
  'x-user-phone': '+201000000021',
};

describe('Phase K6.1/K6.3 — kiosks registry + heartbeat', () => {
  const prev = process.env.KIOSK_BEARER_TOKEN;
  beforeEach(() => {
    process.env.KIOSK_BEARER_TOKEN = KIOSK_BEARER_TOKEN;
    resetKiosksForTests();
  });

  it('rejects heartbeat without x-kiosk-id', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/kiosks/heartbeat')
      .set('Authorization', `Bearer ${KIOSK_BEARER_TOKEN}`)
      .send({ state: 'attract' });
    // No x-kiosk-id → kiosk-auth middleware itself fails first.
    expect(res.status).toBe(401);
  });

  it('auto-creates a kiosk record on first heartbeat', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/kiosks/heartbeat')
      .set('Authorization', `Bearer ${KIOSK_BEARER_TOKEN}`)
      .set('x-kiosk-id', KIOSK_ID)
      .send({ state: 'attract', version: 'sha-abc' });
    expect(res.status).toBe(200);
    expect(res.body.kiosk.id).toBe(KIOSK_ID);
    expect(res.body.kiosk.lastState).toBe('attract');
    expect(res.body.kiosk.version).toBe('sha-abc');
    expect(res.body.kiosk.active).toBe(true);
    expect(res.body.kiosk.name).toMatch(/^Kiosk /);
  });

  it('updates lastSeenAt + lastState on every subsequent heartbeat', async () => {
    const app = createApp();
    await request(app)
      .post('/kiosks/heartbeat')
      .set('Authorization', `Bearer ${KIOSK_BEARER_TOKEN}`)
      .set('x-kiosk-id', KIOSK_ID)
      .send({ state: 'attract' });

    // Wait a tick so lastSeenAt actually moves.
    await new Promise((r) => setTimeout(r, 5));

    const res = await request(app)
      .post('/kiosks/heartbeat')
      .set('Authorization', `Bearer ${KIOSK_BEARER_TOKEN}`)
      .set('x-kiosk-id', KIOSK_ID)
      .send({ state: 'checkout' });
    expect(res.status).toBe(200);
    expect(res.body.kiosk.lastState).toBe('checkout');
  });

  it('admin sees the kiosk in the list', async () => {
    const app = createApp();
    await request(app)
      .post('/kiosks/heartbeat')
      .set('Authorization', `Bearer ${KIOSK_BEARER_TOKEN}`)
      .set('x-kiosk-id', KIOSK_ID)
      .send({ state: 'browsing' });

    const res = await request(app).get('/admin/kiosks').set(baristaHeaders);
    expect(res.status).toBe(200);
    expect(res.body.kiosks).toHaveLength(1);
    expect(res.body.kiosks[0].id).toBe(KIOSK_ID);
  });

  it('admin can rename a kiosk', async () => {
    const app = createApp();
    await request(app)
      .post('/kiosks/heartbeat')
      .set('Authorization', `Bearer ${KIOSK_BEARER_TOKEN}`)
      .set('x-kiosk-id', KIOSK_ID)
      .send({ state: 'attract' });

    const res = await request(app)
      .patch(`/admin/kiosks/${KIOSK_ID}`)
      .set(ownerHeaders)
      .send({ name: 'Counter iPad' });
    expect(res.status).toBe(200);
    expect(res.body.kiosk.name).toBe('Counter iPad');
  });

  it('admin can deactivate a kiosk', async () => {
    const app = createApp();
    await request(app)
      .post('/kiosks/heartbeat')
      .set('Authorization', `Bearer ${KIOSK_BEARER_TOKEN}`)
      .set('x-kiosk-id', KIOSK_ID)
      .send({ state: 'attract' });

    const res = await request(app)
      .patch(`/admin/kiosks/${KIOSK_ID}`)
      .set(ownerHeaders)
      .send({ active: false });
    expect(res.status).toBe(200);
    expect(res.body.kiosk.active).toBe(false);
  });

  it('PATCH on unknown id returns 404', async () => {
    const app = createApp();
    const res = await request(app)
      .patch(`/admin/kiosks/${KIOSK_ID}`)
      .set(ownerHeaders)
      .send({ name: 'Ghost' });
    expect(res.status).toBe(404);
  });

  it('rejects admin endpoints without admin auth', async () => {
    const app = createApp();
    const res = await request(app).get('/admin/kiosks');
    expect(res.status).toBe(401);
  });

  // Restore env after tests.
  it('restores env teardown sentinel', () => {
    if (prev === undefined) delete process.env.KIOSK_BEARER_TOKEN;
    else process.env.KIOSK_BEARER_TOKEN = prev;
    expect(true).toBe(true);
  });
});

// ── Phase K6.4 — /admin/reports/by-kiosk ────────────────────────────────

describe('Phase K6.4 — /admin/reports/by-kiosk', () => {
  const KIOSK_TOKEN = 'kiosk-test-bearer-secret';
  const KIOSK_A = '11111111-aaaa-bbbb-cccc-dddddddddddd';
  const KIOSK_B = '22222222-aaaa-bbbb-cccc-dddddddddddd';
  const VELVET = '22222222-0000-0000-0000-000000000001';

  const ownerHeaders = {
    'x-user-id': 'owner-rep-test',
    'x-user-role': 'owner',
    'x-verification-status': 'approved',
    'x-user-phone': '+201000000022',
  };

  const prev = process.env.KIOSK_BEARER_TOKEN;
  beforeEach(() => {
    process.env.KIOSK_BEARER_TOKEN = KIOSK_TOKEN;
    resetKiosksForTests();
  });

  async function placeKioskOrder(
    app: ReturnType<typeof createApp>,
    kioskId: string,
    qty = 1,
  ) {
    return request(app)
      .post('/orders')
      .set('Authorization', `Bearer ${KIOSK_TOKEN}`)
      .set('x-kiosk-id', kioskId)
      .send({
        fulfillmentType: 'pickup',
        paymentMethod: 'cash',
        redeemPoints: 0,
        items: [{ productId: VELVET, quantity: qty, options: { size: 'Medium' } }],
      });
  }

  it('returns one row per registered kiosk, even with zero orders today', async () => {
    const app = createApp();
    // Register two kiosks via heartbeat.
    await request(app)
      .post('/kiosks/heartbeat')
      .set('Authorization', `Bearer ${KIOSK_TOKEN}`)
      .set('x-kiosk-id', KIOSK_A)
      .send({ state: 'attract' });
    await request(app)
      .post('/kiosks/heartbeat')
      .set('Authorization', `Bearer ${KIOSK_TOKEN}`)
      .set('x-kiosk-id', KIOSK_B)
      .send({ state: 'attract' });

    const res = await request(app)
      .get('/admin/reports/by-kiosk')
      .set(ownerHeaders);
    expect(res.status).toBe(200);
    expect(res.body.rows).toHaveLength(2);
    for (const row of res.body.rows) {
      expect(row.today.orderCount).toBe(0);
      expect(row.today.revenueEgp).toBe(0);
      expect(row.today.topItems).toEqual([]);
    }
  });

  it('aggregates today orders per kiosk + computes top items', async () => {
    const app = createApp();
    // Heartbeat both kiosks first so they're in the registry.
    await request(app)
      .post('/kiosks/heartbeat')
      .set('Authorization', `Bearer ${KIOSK_TOKEN}`)
      .set('x-kiosk-id', KIOSK_A)
      .send({ state: 'attract' });
    await request(app)
      .post('/kiosks/heartbeat')
      .set('Authorization', `Bearer ${KIOSK_TOKEN}`)
      .set('x-kiosk-id', KIOSK_B)
      .send({ state: 'attract' });

    // Kiosk A: 3 cappuccinos. Kiosk B: 1 cappuccino.
    await placeKioskOrder(app, KIOSK_A, 2);
    await placeKioskOrder(app, KIOSK_A, 1);
    await placeKioskOrder(app, KIOSK_B, 1);

    const res = await request(app)
      .get('/admin/reports/by-kiosk')
      .set(ownerHeaders);
    expect(res.status).toBe(200);
    const a = res.body.rows.find((r: { kiosk: { id: string } }) => r.kiosk.id === KIOSK_A);
    const b = res.body.rows.find((r: { kiosk: { id: string } }) => r.kiosk.id === KIOSK_B);
    expect(a.today.orderCount).toBe(2);
    // 3 cappuccinos at 65 EGP each — but cash goes paid only on completion;
    // for the report we count placed orders, revenue may be 0 until paid.
    // The endpoint counts revenue only for paid orders, so revenue here is 0.
    expect(a.today.revenueEgp).toBe(0);
    expect(a.today.topItems[0].count).toBe(3);
    expect(a.today.topItems[0].name_en).toBe('Velvet Cappuccino');
    expect(b.today.orderCount).toBe(1);
    expect(b.today.topItems[0].count).toBe(1);
  });

  it('rejects non-owner roles (reports:view_full is owner-scoped)', async () => {
    const app = createApp();
    const res = await request(app)
      .get('/admin/reports/by-kiosk')
      .set({
        'x-user-id': 'barista-rep-test',
        'x-user-role': 'barista',
        'x-verification-status': 'approved',
        'x-user-phone': '+201000000023',
      });
    expect(res.status).toBe(403);
  });

  // Restore env after tests.
  it('restores env teardown sentinel', () => {
    if (prev === undefined) delete process.env.KIOSK_BEARER_TOKEN;
    else process.env.KIOSK_BEARER_TOKEN = prev;
    expect(true).toBe(true);
  });
});

// ── Phase K7.3 — kiosk post-order rating ────────────────────────────────

describe('Phase K7.3 — POST /orders/:id/kiosk-rating', () => {
  const KIOSK_TOKEN = 'kiosk-test-bearer-secret';
  const KIOSK_ID = '99999999-aaaa-bbbb-cccc-ddddddddffff';
  const VELVET = '22222222-0000-0000-0000-000000000001';

  const prev = process.env.KIOSK_BEARER_TOKEN;
  beforeEach(async () => {
    process.env.KIOSK_BEARER_TOKEN = KIOSK_TOKEN;
    resetKiosksForTests();
    // Ratings store is module-level — wipe between tests so rolling-up
    // assertions don't see leftover rows from prior `it` blocks.
    const { resetRatingsForTests } = await import('../db/kioskRatingsStore.js');
    resetRatingsForTests();
  });

  async function placeKioskOrder(app: ReturnType<typeof createApp>) {
    return request(app)
      .post('/orders')
      .set('Authorization', `Bearer ${KIOSK_TOKEN}`)
      .set('x-kiosk-id', KIOSK_ID)
      .send({
        fulfillmentType: 'pickup',
        paymentMethod: 'cash',
        redeemPoints: 0,
        items: [{ productId: VELVET, quantity: 1, options: { size: 'Medium' } }],
      });
  }

  it('records a thumbs-up rating', async () => {
    const app = createApp();
    const placed = await placeKioskOrder(app);
    const orderId = placed.body.order.id;

    const res = await request(app)
      .post(`/orders/${orderId}/kiosk-rating`)
      .set('Authorization', `Bearer ${KIOSK_TOKEN}`)
      .set('x-kiosk-id', KIOSK_ID)
      .send({ rating: 'up' });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.alreadyRated).toBe(false);
  });

  it('returns alreadyRated=true on a second submit (idempotent)', async () => {
    const app = createApp();
    const placed = await placeKioskOrder(app);
    const orderId = placed.body.order.id;

    await request(app)
      .post(`/orders/${orderId}/kiosk-rating`)
      .set('Authorization', `Bearer ${KIOSK_TOKEN}`)
      .set('x-kiosk-id', KIOSK_ID)
      .send({ rating: 'up' });

    const second = await request(app)
      .post(`/orders/${orderId}/kiosk-rating`)
      .set('Authorization', `Bearer ${KIOSK_TOKEN}`)
      .set('x-kiosk-id', KIOSK_ID)
      .send({ rating: 'down' });
    expect(second.status).toBe(200);
    expect(second.body.alreadyRated).toBe(true);
  });

  it('404s when another kiosk tries to rate the order', async () => {
    const app = createApp();
    const placed = await placeKioskOrder(app);
    const orderId = placed.body.order.id;

    const res = await request(app)
      .post(`/orders/${orderId}/kiosk-rating`)
      .set('Authorization', `Bearer ${KIOSK_TOKEN}`)
      .set('x-kiosk-id', '88888888-aaaa-bbbb-cccc-ffffffffffff') // different
      .send({ rating: 'up' });
    expect(res.status).toBe(404);
  });

  it('rejects rating without x-kiosk-id', async () => {
    const app = createApp();
    const res = await request(app)
      .post(`/orders/some-fake-id/kiosk-rating`)
      .set('Authorization', `Bearer ${KIOSK_TOKEN}`)
      .send({ rating: 'up' });
    // No x-kiosk-id → kiosk-auth itself rejects first.
    expect(res.status).toBe(401);
  });

  it('by-kiosk report rolls ratings up per kiosk', async () => {
    const app = createApp();
    const ownerHeaders = {
      'x-user-id': 'owner-rate-test',
      'x-user-role': 'owner',
      'x-verification-status': 'approved',
      'x-user-phone': '+201000000050',
    };

    // Heartbeat the kiosk, place 2 orders, rate them.
    await request(app)
      .post('/kiosks/heartbeat')
      .set('Authorization', `Bearer ${KIOSK_TOKEN}`)
      .set('x-kiosk-id', KIOSK_ID)
      .send({ state: 'attract' });

    const a = await placeKioskOrder(app);
    const b = await placeKioskOrder(app);

    await request(app)
      .post(`/orders/${a.body.order.id}/kiosk-rating`)
      .set('Authorization', `Bearer ${KIOSK_TOKEN}`)
      .set('x-kiosk-id', KIOSK_ID)
      .send({ rating: 'up' });
    await request(app)
      .post(`/orders/${b.body.order.id}/kiosk-rating`)
      .set('Authorization', `Bearer ${KIOSK_TOKEN}`)
      .set('x-kiosk-id', KIOSK_ID)
      .send({ rating: 'down' });

    const res = await request(app).get('/admin/reports/by-kiosk').set(ownerHeaders);
    expect(res.status).toBe(200);
    const row = res.body.rows.find((r: { kiosk: { id: string } }) => r.kiosk.id === KIOSK_ID);
    expect(row.today.ratings).toEqual({ up: 1, down: 1 });
  });

  // Restore env
  it('restores env teardown sentinel', () => {
    if (prev === undefined) delete process.env.KIOSK_BEARER_TOKEN;
    else process.env.KIOSK_BEARER_TOKEN = prev;
    expect(true).toBe(true);
  });
});

// ── Post-prod — admin-pause guard on POST /orders ───────────────────────

describe('Admin pause guard — POST /orders rejects when kiosk.active=false', () => {
  const KIOSK_TOKEN = 'kiosk-test-bearer-secret';
  const KIOSK_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeffff';
  const VELVET = '22222222-0000-0000-0000-000000000001';
  const ownerHeaders = {
    'x-user-id': 'owner-pause-test',
    'x-user-role': 'owner',
    'x-verification-status': 'approved',
    'x-user-phone': '+201000000060',
  };

  const prev = process.env.KIOSK_BEARER_TOKEN;
  beforeEach(() => {
    process.env.KIOSK_BEARER_TOKEN = KIOSK_TOKEN;
    resetKiosksForTests();
  });

  async function place(app: ReturnType<typeof createApp>) {
    return request(app)
      .post('/orders')
      .set('Authorization', `Bearer ${KIOSK_TOKEN}`)
      .set('x-kiosk-id', KIOSK_ID)
      .send({
        fulfillmentType: 'pickup',
        paymentMethod: 'cash',
        redeemPoints: 0,
        items: [{ productId: VELVET, quantity: 1, options: { size: 'Medium' } }],
      });
  }

  it('places order normally when kiosk is active (default)', async () => {
    const app = createApp();
    // Heartbeat first so the kiosk row exists.
    await request(app)
      .post('/kiosks/heartbeat')
      .set('Authorization', `Bearer ${KIOSK_TOKEN}`)
      .set('x-kiosk-id', KIOSK_ID)
      .send({ state: 'attract' });

    const res = await place(app);
    expect(res.status).toBe(201);
  });

  it('returns 423 when admin has paused the kiosk', async () => {
    const app = createApp();
    await request(app)
      .post('/kiosks/heartbeat')
      .set('Authorization', `Bearer ${KIOSK_TOKEN}`)
      .set('x-kiosk-id', KIOSK_ID)
      .send({ state: 'attract' });
    await request(app)
      .patch(`/admin/kiosks/${KIOSK_ID}`)
      .set(ownerHeaders)
      .send({ active: false });

    const res = await place(app);
    expect(res.status).toBe(423);
    expect(res.body.error).toMatch(/paused/i);
  });

  it('resumes accepting orders after admin reactivates', async () => {
    const app = createApp();
    await request(app)
      .post('/kiosks/heartbeat')
      .set('Authorization', `Bearer ${KIOSK_TOKEN}`)
      .set('x-kiosk-id', KIOSK_ID)
      .send({ state: 'attract' });
    await request(app)
      .patch(`/admin/kiosks/${KIOSK_ID}`)
      .set(ownerHeaders)
      .send({ active: false });
    expect((await place(app)).status).toBe(423);

    await request(app)
      .patch(`/admin/kiosks/${KIOSK_ID}`)
      .set(ownerHeaders)
      .send({ active: true });
    expect((await place(app)).status).toBe(201);
  });

  it('does NOT block when no kiosk record exists yet (auto-create on first heartbeat is normal)', async () => {
    const app = createApp();
    // Place an order BEFORE the kiosk has heartbeat'd. The guard should
    // be permissive — the first POST /orders for a fresh iPad shouldn't
    // 423 just because no registry row exists yet.
    const res = await place(app);
    expect(res.status).toBe(201);
  });

  // Restore env
  it('restores env teardown sentinel', () => {
    if (prev === undefined) delete process.env.KIOSK_BEARER_TOKEN;
    else process.env.KIOSK_BEARER_TOKEN = prev;
    expect(true).toBe(true);
  });
});
