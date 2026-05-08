import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';

const headers = (role = 'student') => ({
  'x-user-id': 'demo-user-1',
  'x-user-role': role,
  'x-verification-status': 'approved',
  'x-user-phone': '+201000000001',
});

describe('GET /me', () => {
  it('requires auth', async () => {
    await request(createApp()).get('/me').expect(401);
  });

  it('returns the auth user with default 0 points', async () => {
    const res = await request(createApp()).get('/me').set(headers()).expect(200);
    expect(res.body.user.id).toBe('demo-user-1');
    expect(res.body.user.role).toBe('student');
    expect(res.body.points).toBe(0);
  });
});

describe('GET /me/feature-flags', () => {
  it('requires auth', async () => {
    await request(createApp()).get('/me/feature-flags').expect(401);
  });

  it('returns variant names for every known flag', async () => {
    const res = await request(createApp())
      .get('/me/feature-flags')
      .set(headers())
      .expect(200);
    expect(res.body.flags).toBeDefined();
    expect(typeof res.body.flags.welcome_banner).toBe('string');
    expect(['control', 'variant_a']).toContain(res.body.flags.welcome_banner);
    expect(res.body.flags.home_offers_visible).toBe('enabled');
  });

  it('is deterministic for the same user across calls', async () => {
    const app = createApp();
    const a = await request(app).get('/me/feature-flags').set(headers()).expect(200);
    const b = await request(app).get('/me/feature-flags').set(headers()).expect(200);
    expect(a.body.flags).toEqual(b.body.flags);
  });
});

describe('PATCH /me', () => {
  it('updates language preference', async () => {
    const app = createApp();
    const res = await request(app)
      .patch('/me')
      .set(headers())
      .send({ language_pref: 'ar' })
      .expect(200);
    expect(res.body.user.language_pref).toBe('ar');
  });

  it('rejects invalid role', async () => {
    await request(createApp())
      .patch('/me')
      .set(headers())
      .send({ role: 'campus_scholar' })
      .expect(400);
  });

  it('updates role + university details', async () => {
    const res = await request(createApp())
      .patch('/me')
      .set(headers())
      .send({ role: 'student', university_id: 'CSE-2021-0042', major: 'Computer Science' })
      .expect(200);
    expect(res.body.user.role).toBe('student');
    expect(res.body.user.university_id).toBe('CSE-2021-0042');
  });

  it('persists updates across calls within a single app instance', async () => {
    const app = createApp();
    await request(app).patch('/me').set(headers()).send({ full_name: 'Karim Elbahrawy' });
    const res = await request(app).get('/me').set(headers()).expect(200);
    expect(res.body.user.full_name).toBe('Karim Elbahrawy');
  });

  it('updates gender and avatar_id', async () => {
    const app = createApp();
    const res = await request(app)
      .patch('/me')
      .set(headers())
      .send({ gender: 'male', avatar_id: 3 })
      .expect(200);
    expect(res.body.user.gender).toBe('male');
    expect(res.body.user.avatar_id).toBe(3);
  });

  it('rejects out-of-range avatar_id', async () => {
    await request(createApp())
      .patch('/me')
      .set(headers())
      .send({ avatar_id: 8 })
      .expect(400);
  });

  it('rejects invalid gender value', async () => {
    await request(createApp())
      .patch('/me')
      .set(headers())
      .send({ gender: 'other' })
      .expect(400);
  });
});

describe('POST /me/verification', () => {
  it('accepts an image_url', async () => {
    const res = await request(createApp())
      .post('/me/verification')
      .set(headers())
      .send({ image_url: 'https://example.com/student-id.jpg' })
      .expect(201);
    expect(res.body.status).toBe('pending');
  });

  it('rejects when no image is provided', async () => {
    await request(createApp())
      .post('/me/verification')
      .set(headers())
      .send({ notes: 'no image' })
      .expect(400);
  });
});

describe('POST /push/register', () => {
  it('registers an iOS device', async () => {
    const res = await request(createApp())
      .post('/push/register')
      .set(headers())
      .send({ platform: 'ios', token: 'apns-token-abcdefgh' })
      .expect(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.registered).toBe(1);
  });

  it('rejects unknown platform', async () => {
    await request(createApp())
      .post('/push/register')
      .set(headers())
      .send({ platform: 'android', token: 'fcm-token-abcd' })
      .expect(400);
  });

  it('deduplicates same token on re-register', async () => {
    const app = createApp();
    // Use a unique userId scoped to this test to avoid module-level state bleed.
    const dedupHeaders = {
      ...headers(),
      'x-user-id': 'dedup-test-user',
    };
    await request(app).post('/push/register').set(dedupHeaders).send({ platform: 'web', token: 'same-token-1234' });
    const res = await request(app).post('/push/register').set(dedupHeaders).send({ platform: 'web', token: 'same-token-1234' });
    expect(res.body.registered).toBe(1);
  });
});

// ── Phase K4.10 — /me/usual ──────────────────────────────────────────────

describe('GET /me/usual (one-tap reorder source)', () => {
  const userHeaders = {
    'x-user-id': 'usual-test-user',
    'x-user-role': 'student',
    'x-verification-status': 'approved',
    'x-user-phone': '+201000000099',
  };
  const VELVET = '22222222-0000-0000-0000-000000000001';

  async function placeOrder(app: ReturnType<typeof createApp>, opts: Record<string, string>) {
    return request(app)
      .post('/orders')
      .set(userHeaders)
      .send({
        fulfillmentType: 'pickup',
        paymentMethod: 'cash',
        redeemPoints: 0,
        items: [{ productId: VELVET, quantity: 1, options: opts }],
      });
  }

  it('returns null when no orders exist', async () => {
    const app = createApp();
    const res = await request(app)
      .get('/me/usual')
      .set({ ...userHeaders, 'x-user-id': 'usual-empty-user' })
      .expect(200);
    expect(res.body.usual).toBeNull();
  });

  it('returns null when there is only 1 order (need 2+ to be a usual)', async () => {
    const app = createApp();
    await placeOrder(app, { size: 'Medium', sugar: 'Normal' });
    const res = await request(app).get('/me/usual').set(userHeaders).expect(200);
    expect(res.body.usual).toBeNull();
  });

  it('returns the most-ordered product + most-common options after 2+ orders', async () => {
    const app = createApp();
    // Fresh user-id so this test doesn't inherit orders from sibling tests
    // (the orders Map is module-level and persists across `it` blocks).
    const freshHeaders = { ...userHeaders, 'x-user-id': 'usual-fresh-user' };
    async function placeFresh(opts: Record<string, string>) {
      return request(app).post('/orders').set(freshHeaders).send({
        fulfillmentType: 'pickup',
        paymentMethod: 'cash',
        redeemPoints: 0,
        items: [{ productId: VELVET, quantity: 1, options: opts }],
      });
    }
    await placeFresh({ size: 'Large', sugar: 'Normal' });
    await placeFresh({ size: 'Large', sugar: 'Less' });
    await placeFresh({ size: 'Medium', sugar: 'Less' });
    const res = await request(app).get('/me/usual').set(freshHeaders).expect(200);
    expect(res.body.usual).toBeTruthy();
    expect(res.body.usual.productId).toBe(VELVET);
    expect(res.body.usual.orderCount).toBeGreaterThanOrEqual(3);
    // Large appears 2x, Medium 1x → preferred is Large.
    expect(res.body.usual.preferredOptions.size).toBe('Large');
    // Less appears 2x, Normal 1x → preferred is Less.
    expect(res.body.usual.preferredOptions.sugar).toBe('Less');
  });
});
