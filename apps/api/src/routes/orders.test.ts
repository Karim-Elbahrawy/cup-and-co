import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';

const customerHeaders = (id: string) => ({
  'x-user-id': id,
  'x-user-role': 'student',
  'x-verification-status': 'approved',
  'x-user-phone': `+2010000000${id.slice(-1)}`,
});

const ownerHeaders = {
  'x-user-id': 'owner-1',
  'x-user-role': 'owner',
  'x-verification-status': 'approved',
  'x-user-phone': '+201000000004',
};

const baristaHeaders = {
  'x-user-id': 'barista-1',
  'x-user-role': 'barista',
  'x-verification-status': 'approved',
  'x-user-phone': '+201000000005',
};

const cappuccinoMedium = {
  productId: '22222222-0000-0000-0000-000000000001',
  quantity: 2,
  options: { size: 'Medium', sugar: 'Normal' },
};

describe('POST /orders (customer)', () => {
  it('creates an order and returns timeline', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/orders')
      .set(customerHeaders('order-cust-1'))
      .send({
        fulfillmentType: 'pickup',
        paymentMethod: 'cash',
        redeemPoints: 0,
        items: [cappuccinoMedium],
      })
      .expect(201);

    expect(res.body.order).toBeDefined();
    expect(res.body.order.status).toBe('received');
    expect(res.body.order.items).toHaveLength(1);
    expect(res.body.order.items[0].productNameEn).toBe('Velvet Cappuccino');
    expect(res.body.order.items[0].lineTotalEgp).toBe(130); // 65 base × 2
    expect(res.body.order.subtotalEgp).toBe(130);
    expect(res.body.order.totalEgp).toBe(130);
    expect(res.body.order.paymentStatus).toBe('pending'); // cash
    expect(res.body.order.pickupCode).toMatch(/^[1-9]\d{3}$/);
    expect(Array.isArray(res.body.timeline)).toBe(true);
    expect(res.body.timeline.find((s: { active: boolean; status: string }) => s.active).status).toBe('received');
  });

  it('applies size price-delta from product options', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/orders')
      .set(customerHeaders('order-cust-2'))
      .send({
        fulfillmentType: 'pickup',
        paymentMethod: 'paymob_card',
        redeemPoints: 0,
        items: [{ ...cappuccinoMedium, options: { size: 'Large', sugar: 'Normal' } }],
      })
      .expect(201);

    expect(res.body.order.items[0].unitPriceEgp).toBe(75); // 65 + 10 (Large)
    expect(res.body.order.items[0].lineTotalEgp).toBe(150);
    expect(res.body.order.paymentStatus).toBe('unpaid'); // card -> unpaid until webhook
  });

  it('rejects unknown product', async () => {
    const app = createApp();
    await request(app)
      .post('/orders')
      .set(customerHeaders('order-cust-3'))
      .send({
        fulfillmentType: 'pickup',
        paymentMethod: 'cash',
        redeemPoints: 0,
        items: [{ productId: 'does-not-exist', quantity: 1, options: {} }],
      })
      .expect(400);
  });

  it('rejects empty items', async () => {
    const app = createApp();
    await request(app)
      .post('/orders')
      .set(customerHeaders('order-cust-4'))
      .send({ fulfillmentType: 'pickup', paymentMethod: 'cash', redeemPoints: 0, items: [] })
      .expect(400);
  });

  it('rejects when not enough points to redeem', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/orders')
      .set(customerHeaders('order-cust-5'))
      .send({
        fulfillmentType: 'pickup',
        paymentMethod: 'cash',
        redeemPoints: 500, // user has 0
        items: [cappuccinoMedium],
      });
    expect(res.status).toBe(400);
  });

  it('requires auth', async () => {
    await request(createApp())
      .post('/orders')
      .send({ fulfillmentType: 'pickup', paymentMethod: 'cash', items: [cappuccinoMedium] })
      .expect(401);
  });
});

describe('GET /orders/:id', () => {
  it('returns own order with tracking timeline', async () => {
    const app = createApp();
    const created = await request(app)
      .post('/orders')
      .set(customerHeaders('order-cust-6'))
      .send({
        fulfillmentType: 'pickup',
        paymentMethod: 'cash',
        redeemPoints: 0,
        items: [cappuccinoMedium],
      });
    const id = created.body.order.id;

    const res = await request(app)
      .get(`/orders/${id}`)
      .set(customerHeaders('order-cust-6'))
      .expect(200);
    expect(res.body.order.id).toBe(id);
    expect(res.body.timeline).toBeDefined();
  });

  it("404 when fetching another user's order", async () => {
    const app = createApp();
    const created = await request(app)
      .post('/orders')
      .set(customerHeaders('order-cust-7'))
      .send({
        fulfillmentType: 'pickup',
        paymentMethod: 'cash',
        redeemPoints: 0,
        items: [cappuccinoMedium],
      });
    const id = created.body.order.id;

    await request(app)
      .get(`/orders/${id}`)
      .set(customerHeaders('order-cust-other'))
      .expect(404);
  });

  it('admin can read any order', async () => {
    const app = createApp();
    const created = await request(app)
      .post('/orders')
      .set(customerHeaders('order-cust-8'))
      .send({
        fulfillmentType: 'pickup',
        paymentMethod: 'cash',
        redeemPoints: 0,
        items: [cappuccinoMedium],
      });
    const id = created.body.order.id;

    const res = await request(app)
      .get(`/orders/${id}`)
      .set(ownerHeaders)
      .expect(200);
    expect(res.body.order.id).toBe(id);
  });
});

describe('PATCH /admin/orders/:id/status', () => {
  it('happy-path pickup flow received → completed', async () => {
    const app = createApp();
    const created = await request(app)
      .post('/orders')
      .set(customerHeaders('order-cust-9'))
      .send({
        fulfillmentType: 'pickup',
        paymentMethod: 'cash',
        redeemPoints: 0,
        items: [cappuccinoMedium],
      });
    const id = created.body.order.id;

    for (const status of ['accepted', 'preparing', 'ready', 'completed']) {
      const res = await request(app)
        .patch(`/admin/orders/${id}/status`)
        .set(baristaHeaders)
        .send({ status })
        .expect(200);
      expect(res.body.order.status).toBe(status);
    }

    const final = await request(app).get(`/orders/${id}`).set(customerHeaders('order-cust-9'));
    expect(final.body.order.statusHistory).toHaveLength(5);
    expect(final.body.order.paymentStatus).toBe('paid'); // cash auto-marks paid on completed
    expect(final.body.order.pickedUpAt).toBeTruthy();
  });

  it('rejects illegal transition with 409', async () => {
    const app = createApp();
    const created = await request(app)
      .post('/orders')
      .set(customerHeaders('order-cust-10'))
      .send({
        fulfillmentType: 'pickup',
        paymentMethod: 'cash',
        redeemPoints: 0,
        items: [cappuccinoMedium],
      });
    const id = created.body.order.id;

    await request(app)
      .patch(`/admin/orders/${id}/status`)
      .set(baristaHeaders)
      .send({ status: 'completed' }) // illegal: skipping accepted/preparing/ready
      .expect(409);
  });

  it('admin GET /admin/orders/:id returns full detail', async () => {
    const app = createApp();
    const created = await request(app)
      .post('/orders')
      .set(customerHeaders('order-cust-11'))
      .send({
        fulfillmentType: 'pickup',
        paymentMethod: 'cash',
        redeemPoints: 0,
        items: [cappuccinoMedium],
      });
    const id = created.body.order.id;

    const res = await request(app).get(`/admin/orders/${id}`).set(baristaHeaders).expect(200);
    expect(res.body.order.items).toHaveLength(1);
    expect(res.body.timeline).toBeDefined();
  });
});

describe('PATCH /admin/kiosk/status', () => {
  it('barista can toggle is_open', async () => {
    const app = createApp();
    const res = await request(app)
      .patch('/admin/kiosk/status')
      .set(baristaHeaders)
      .send({ is_open: false })
      .expect(200);
    expect(res.body.is_open).toBe(false);
  });

  it('barista cannot change capacity', async () => {
    const app = createApp();
    await request(app)
      .patch('/admin/kiosk/status')
      .set(baristaHeaders)
      .send({ capacity_per_slot: 30 })
      .expect(403);
  });

  it('owner can change capacity', async () => {
    const app = createApp();
    const res = await request(app)
      .patch('/admin/kiosk/status')
      .set(ownerHeaders)
      .send({ capacity_per_slot: 30 })
      .expect(200);
    expect(res.body.capacity_per_slot).toBe(30);
  });

  it('rejects orders when kiosk is closed', async () => {
    const app = createApp();
    await request(app).patch('/admin/kiosk/status').set(ownerHeaders).send({ is_open: false });
    const res = await request(app)
      .post('/orders')
      .set(customerHeaders('order-cust-closed'))
      .send({
        fulfillmentType: 'pickup',
        paymentMethod: 'cash',
        redeemPoints: 0,
        items: [cappuccinoMedium],
      });
    expect(res.status).toBe(409);
  });
});

describe('PATCH /admin/menu/products/:id/availability', () => {
  it('barista can mark a product unavailable, blocking orders for it', async () => {
    const app = createApp();
    // Reset kiosk state — earlier tests may have left it closed.
    await request(app).patch('/admin/kiosk/status').set(ownerHeaders).send({ is_open: true });

    await request(app)
      .patch('/admin/menu/products/22222222-0000-0000-0000-000000000003/availability')
      .set(baristaHeaders)
      .send({ available: false })
      .expect(200);

    const res = await request(app)
      .post('/orders')
      .set(customerHeaders('order-cust-12'))
      .send({
        fulfillmentType: 'pickup',
        paymentMethod: 'cash',
        redeemPoints: 0,
        items: [
          { productId: '22222222-0000-0000-0000-000000000003', quantity: 1, options: { size: 'Medium', sugar: 'Normal' } },
        ],
      });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/unavailable/i);

    // Re-enable so later tests aren't affected.
    await request(app)
      .patch('/admin/menu/products/22222222-0000-0000-0000-000000000003/availability')
      .set(baristaHeaders)
      .send({ available: true });
  });
});

// ── Phase K1.11 / K1.12 — placement_source + kiosk auth ───────────────────

describe('Phase K1.11 — placement_source on POST /orders', () => {
  it('defaults to customer_app when no field is sent', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/orders')
      .set(customerHeaders('plc-default-1'))
      .send({
        fulfillmentType: 'pickup',
        paymentMethod: 'cash',
        redeemPoints: 0,
        items: [cappuccinoMedium],
      });
    expect(res.status).toBe(201);
    expect(res.body.order.placementSource).toBe('customer_app');
    expect(res.body.order.kioskId).toBeNull();
  });

  it('accepts an explicit placementSource from a body field', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/orders')
      .set(customerHeaders('plc-admin-1'))
      .send({
        fulfillmentType: 'pickup',
        paymentMethod: 'cash',
        redeemPoints: 0,
        items: [cappuccinoMedium],
        placementSource: 'admin_phone',
      });
    expect(res.status).toBe(201);
    expect(res.body.order.placementSource).toBe('admin_phone');
  });
});

describe('Phase K1.12 — kiosk bearer auth on POST /orders', () => {
  // Set the env var for these tests; clear it after so other tests don't
  // accidentally pick up the kiosk path.
  const KIOSK_TOKEN = 'kiosk-test-bearer-secret';
  const KIOSK_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  const prev = process.env.KIOSK_BEARER_TOKEN;
  beforeAll(() => {
    process.env.KIOSK_BEARER_TOKEN = KIOSK_TOKEN;
  });
  afterAll(() => {
    if (prev === undefined) delete process.env.KIOSK_BEARER_TOKEN;
    else process.env.KIOSK_BEARER_TOKEN = prev;
  });

  it('accepts kiosk bearer + x-kiosk-id and tags the order placement_source=kiosk', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/orders')
      .set('Authorization', `Bearer ${KIOSK_TOKEN}`)
      .set('x-kiosk-id', KIOSK_ID)
      .send({
        fulfillmentType: 'pickup',
        paymentMethod: 'cash',
        redeemPoints: 0,
        items: [cappuccinoMedium],
      });
    expect(res.status).toBe(201);
    expect(res.body.order.placementSource).toBe('kiosk');
    expect(res.body.order.kioskId).toBe(KIOSK_ID);
    expect(res.body.order.userId).toBe(`kiosk:${KIOSK_ID}`);
  });

  it('rejects kiosk bearer with no x-kiosk-id', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/orders')
      .set('Authorization', `Bearer ${KIOSK_TOKEN}`)
      .send({
        fulfillmentType: 'pickup',
        paymentMethod: 'cash',
        redeemPoints: 0,
        items: [cappuccinoMedium],
      });
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/x-kiosk-id/i);
  });

  it('ignores body placementSource when kiosk-authed (server is the source of truth)', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/orders')
      .set('Authorization', `Bearer ${KIOSK_TOKEN}`)
      .set('x-kiosk-id', KIOSK_ID)
      .send({
        fulfillmentType: 'pickup',
        paymentMethod: 'cash',
        redeemPoints: 0,
        items: [cappuccinoMedium],
        // Client tries to claim it's a customer-app order — must be ignored.
        placementSource: 'customer_app',
      });
    expect(res.status).toBe(201);
    expect(res.body.order.placementSource).toBe('kiosk');
  });

  it('falls back to JWT/header auth when no kiosk bearer matches', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/orders')
      .set('Authorization', 'Bearer wrong-token-not-kiosk')
      .set(customerHeaders('plc-fallback-1'))
      .send({
        fulfillmentType: 'pickup',
        paymentMethod: 'cash',
        redeemPoints: 0,
        items: [cappuccinoMedium],
      });
    // The wrong Bearer makes JWT verification throw, so we 401 — but the
    // important contract is: no silent kiosk-impersonation fallback.
    expect(res.status).toBe(401);
  });
});
