import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';

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

const customerHeaders = (id: string) => ({
  'x-user-id': id,
  'x-user-role': 'student',
  'x-verification-status': 'approved',
  'x-user-phone': `+2010000000${id.slice(-1)}`,
});

describe('GET /admin/reviews', () => {
  it('owner can list all reviews', async () => {
    const app = createApp();
    // Seed a review
    await request(app)
      .post('/reviews')
      .set(customerHeaders('review-cust-1'))
      .send({ productId: '22222222-0000-0000-0000-000000000001', rating: 5, comment: 'Great coffee!' });

    const res = await request(app).get('/admin/reviews').set(ownerHeaders).expect(200);
    expect(Array.isArray(res.body.reviews)).toBe(true);
    expect(res.body.reviews.length).toBeGreaterThanOrEqual(1);
    expect(res.body.reviews[0]).toHaveProperty('hidden');
    expect(res.body.reviews[0]).toHaveProperty('userName');
  });

  it('barista cannot manage reviews', async () => {
    const app = createApp();
    await request(app).get('/admin/reviews').set(baristaHeaders).expect(403);
  });
});

describe('PATCH /admin/reviews/:id/visibility', () => {
  it('owner can hide and unhide a review', async () => {
    const app = createApp();
    const created = await request(app)
      .post('/reviews')
      .set(customerHeaders('review-cust-2'))
      .send({ productId: '22222222-0000-0000-0000-000000000001', rating: 4, comment: 'Good' });
    const reviewId = created.body.id;

    await request(app)
      .patch(`/admin/reviews/${reviewId}/visibility`)
      .set(ownerHeaders)
      .send({ hidden: true })
      .expect(200);

    const list = await request(app).get('/admin/reviews').set(ownerHeaders).expect(200);
    const review = list.body.reviews.find((r: { id: string }) => r.id === reviewId);
    expect(review.hidden).toBe(true);

    await request(app)
      .patch(`/admin/reviews/${reviewId}/visibility`)
      .set(ownerHeaders)
      .send({ hidden: false })
      .expect(200);
  });
});

describe('GET /admin/users', () => {
  it('owner can list registered users', async () => {
    const app = createApp();
    // Register a user via OTP
    await request(app).post('/auth/otp/verify').send({ phone: '+201111111111', code: '000000' });

    const res = await request(app).get('/admin/users').set(ownerHeaders).expect(200);
    expect(Array.isArray(res.body.users)).toBe(true);
    expect(res.body.users.length).toBeGreaterThanOrEqual(1);
    expect(res.body.users[0]).toHaveProperty('phone');
    expect(res.body.users[0]).toHaveProperty('verification_status');
  });

  it('supports status filter', async () => {
    const app = createApp();
    await request(app).post('/auth/otp/verify').send({ phone: '+201122222222', code: '000000' });

    const res = await request(app).get('/admin/users?status=approved').set(ownerHeaders).expect(200);
    expect(res.body.users.every((u: { verification_status: string }) => u.verification_status === 'approved')).toBe(true);
  });
});

describe('PATCH /admin/users/:id/verify', () => {
  it('owner can approve and reject user verification', async () => {
    const app = createApp();
    const auth = await request(app).post('/auth/otp/verify').send({ phone: '+201133333333', code: '000000' });
    const userId = auth.body.user.id;

    await request(app)
      .patch(`/admin/users/${userId}/verify`)
      .set(ownerHeaders)
      .send({ status: 'rejected' })
      .expect(200);

    const list = await request(app).get('/admin/users').set(ownerHeaders).expect(200);
    const user = list.body.users.find((u: { id: string }) => u.id === userId);
    expect(user.verification_status).toBe('rejected');

    await request(app)
      .patch(`/admin/users/${userId}/verify`)
      .set(ownerHeaders)
      .send({ status: 'approved' })
      .expect(200);
  });
});

describe('PATCH /admin/users/:id/block', () => {
  it('owner can block and unblock a user', async () => {
    const app = createApp();
    const auth = await request(app).post('/auth/otp/verify').send({ phone: '+201144444444', code: '000000' });
    const userId = auth.body.user.id;

    await request(app)
      .patch(`/admin/users/${userId}/block`)
      .set(ownerHeaders)
      .send({ blocked: true })
      .expect(200);

    const list = await request(app).get('/admin/users').set(ownerHeaders).expect(200);
    const user = list.body.users.find((u: { id: string }) => u.id === userId);
    expect(user.blocked).toBe(true);

    await request(app)
      .patch(`/admin/users/${userId}/block`)
      .set(ownerHeaders)
      .send({ blocked: false })
      .expect(200);
  });
});

describe('GET /admin/offers', () => {
  it('owner can list offers', async () => {
    const app = createApp();
    const res = await request(app).get('/admin/offers').set(ownerHeaders).expect(200);
    expect(Array.isArray(res.body.offers)).toBe(true);
  });

  it('supports scope filters', async () => {
    const app = createApp();
    await request(app)
      .post('/admin/offers')
      .set(ownerHeaders)
      .send({
        name_en: 'Future Offer',
        name_ar: 'عرض مستقبلي',
        type: 'percentage',
        value: 20,
        starts_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        ends_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        target_roles: ['student'],
      });

    const upcoming = await request(app).get('/admin/offers?scope=upcoming').set(ownerHeaders).expect(200);
    expect(upcoming.body.offers.length).toBeGreaterThanOrEqual(1);
  });
});

describe('POST /admin/offers', () => {
  it('owner can create an offer', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/admin/offers')
      .set(ownerHeaders)
      .send({
        name_en: 'Student Discount',
        name_ar: 'خصم الطلاب',
        type: 'percentage',
        value: 15,
        starts_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        ends_at: new Date(Date.now() + 23 * 60 * 60 * 1000).toISOString(),
        target_roles: ['student'],
        code: 'STUDENT15',
        usage_limit: 100,
      })
      .expect(201);

    expect(res.body.name_en).toBe('Student Discount');
    expect(res.body.code).toBe('STUDENT15');
    expect(res.body.usage_count).toBe(0);
  });
});

describe('PATCH /admin/offers/:id', () => {
  it('owner can update an offer', async () => {
    const app = createApp();
    const created = await request(app)
      .post('/admin/offers')
      .set(ownerHeaders)
      .send({
        name_en: 'Old Name',
        name_ar: 'اسم قديم',
        type: 'fixed',
        value: 10,
        starts_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        ends_at: new Date(Date.now() + 23 * 60 * 60 * 1000).toISOString(),
        target_roles: ['faculty'],
      });

    const updated = await request(app)
      .patch(`/admin/offers/${created.body.id}`)
      .set(ownerHeaders)
      .send({ name_en: 'New Name', value: 20 })
      .expect(200);

    expect(updated.body.name_en).toBe('New Name');
    expect(updated.body.value).toBe(20);
    expect(updated.body.type).toBe('fixed');
  });
});

describe('GET /admin/reports/revenue', () => {
  it('owner can view revenue report', async () => {
    const app = createApp();
    const res = await request(app).get('/admin/reports/revenue').set(ownerHeaders).expect(200);
    expect(typeof res.body.todayRevenueEgp).toBe('number');
    expect(typeof res.body.totalRevenueEgp).toBe('number');
    expect(typeof res.body.paidOrders).toBe('number');
  });

  it('barista cannot view full reports', async () => {
    const app = createApp();
    await request(app).get('/admin/reports/revenue').set(baristaHeaders).expect(403);
  });
});

describe('GET /admin/reports/top-items', () => {
  it('owner can view top items', async () => {
    const app = createApp();
    // Create an order to generate top-item data
    await request(app)
      .post('/orders')
      .set(customerHeaders('report-cust-1'))
      .send({
        fulfillmentType: 'pickup',
        paymentMethod: 'cash',
        redeemPoints: 0,
        items: [{ productId: '22222222-0000-0000-0000-000000000001', quantity: 2, options: { size: 'Medium', sugar: 'Normal' } }],
      });

    const res = await request(app).get('/admin/reports/top-items').set(ownerHeaders).expect(200);
    expect(Array.isArray(res.body.topItems)).toBe(true);
    if (res.body.topItems.length > 0) {
      expect(res.body.topItems[0]).toHaveProperty('name_en');
      expect(res.body.topItems[0]).toHaveProperty('count');
      expect(res.body.topItems[0]).toHaveProperty('revenue');
    }
  });
});

describe('GET /admin/reports/role-breakdown', () => {
  it('owner can view role breakdown', async () => {
    const app = createApp();
    const res = await request(app).get('/admin/reports/role-breakdown').set(ownerHeaders).expect(200);
    expect(typeof res.body.breakdown).toBe('object');
  });
});
