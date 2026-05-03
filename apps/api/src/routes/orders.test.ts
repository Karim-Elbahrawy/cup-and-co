import { describe, expect, it } from 'vitest';
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
  productId: 'velvet-cappuccino',
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
      .patch('/admin/menu/products/honey-latte/availability')
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
          { productId: 'honey-latte', quantity: 1, options: { size: 'Medium', sugar: 'Normal' } },
        ],
      });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/unavailable/i);

    // Re-enable so later tests aren't affected.
    await request(app)
      .patch('/admin/menu/products/honey-latte/availability')
      .set(baristaHeaders)
      .send({ available: true });
  });
});
