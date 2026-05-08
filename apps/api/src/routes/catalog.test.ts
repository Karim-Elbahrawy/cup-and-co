import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';

describe('GET /catalog', () => {
  const app = createApp();

  it('returns categories, products, offers, kiosk', async () => {
    const res = await request(app).get('/catalog').expect(200);
    expect(Array.isArray(res.body.categories)).toBe(true);
    expect(Array.isArray(res.body.products)).toBe(true);
    expect(Array.isArray(res.body.offers)).toBe(true);
    expect(res.body.kiosk).toBeDefined();
    expect(res.body.kiosk.is_open).toBe(true);
  });

  it('contains exactly 22 menu items in fallback', async () => {
    const res = await request(app).get('/catalog').expect(200);
    expect(res.body.products).toHaveLength(22);
  });

  it('uses real coffee names (no campus jargon)', async () => {
    const res = await request(app).get('/catalog').expect(200);
    const names = res.body.products.map((p: { name_en: string }) => p.name_en);
    expect(names).toContain('Velvet Cappuccino');
    expect(names).toContain('Caramel Macchiato');
    expect(names).toContain('Tiramisu Cup');
    expect(names).not.toContain('Campus Brew');
    expect(names).not.toContain('Scholar Latte');
  });

  it('every product has a valid image_url', async () => {
    const res = await request(app).get('/catalog').expect(200);
    for (const p of res.body.products) {
      expect(p.image_url).toMatch(/\.(png|jpg|svg)$/);
    }
  });

  it('returns the 70%-off offer targeting all roles', async () => {
    const res = await request(app).get('/catalog').expect(200);
    expect(res.body.offers.length).toBeGreaterThanOrEqual(1);
    const offer = res.body.offers[0];
    expect(offer.value).toBe(70);
    expect(offer.target_roles).toEqual(expect.arrayContaining(['student', 'faculty', 'office']));
  });
});

describe('GET /products/:id', () => {
  const app = createApp();

  it('returns Velvet Cappuccino with size/sugar options', async () => {
    const res = await request(app).get('/products/22222222-0000-0000-0000-000000000001').expect(200);
    expect(res.body.product.name_en).toBe('Velvet Cappuccino');
    const groups = new Set(res.body.options.map((o: { group_name: string }) => o.group_name));
    expect(groups).toContain('size');
    expect(groups).toContain('sugar');
  });

  it('cold drinks include ice options', async () => {
    const res = await request(app).get('/products/22222222-0000-0000-0000-000000000006').expect(200);
    const groups = new Set(res.body.options.map((o: { group_name: string }) => o.group_name));
    expect(groups).toContain('ice');
  });

  it('non-coffee items have no size/sugar options', async () => {
    const res = await request(app).get('/products/22222222-0000-0000-0000-00000000000B').expect(200);
    expect(res.body.options).toHaveLength(0);
  });

  it('returns 404 for unknown product', async () => {
    await request(app).get('/products/does-not-exist').expect(404);
  });
});

// ── Phase K4.7 — featured-today ─────────────────────────────────────────

describe('Phase K4.7 — featured today', () => {
  const baristaHeaders = {
    'x-user-id': 'barista-feat',
    'x-user-role': 'barista',
    'x-verification-status': 'approved',
    'x-user-phone': '+201000000007',
  };
  const VELVET = '22222222-0000-0000-0000-000000000001';

  it('GET /catalog reports is_featured_today=false by default for all products', async () => {
    const app = createApp();
    const res = await request(app).get('/catalog').expect(200);
    expect(res.body.products.every((p: { is_featured_today: boolean }) => p.is_featured_today === false)).toBe(true);
  });

  it('admin toggles featured-today, GET /catalog reflects the flag', async () => {
    const app = createApp();
    await request(app)
      .patch(`/admin/menu/products/${VELVET}/featured-today`)
      .set(baristaHeaders)
      .send({ featured: true })
      .expect(200);

    const res = await request(app).get('/catalog').expect(200);
    const velvet = res.body.products.find((p: { id: string }) => p.id === VELVET);
    expect(velvet?.is_featured_today).toBe(true);

    // Untoggle so subsequent tests see a clean slate.
    await request(app)
      .patch(`/admin/menu/products/${VELVET}/featured-today`)
      .set(baristaHeaders)
      .send({ featured: false })
      .expect(200);
  });

  it('rejects featured-today without admin role', async () => {
    const app = createApp();
    await request(app)
      .patch(`/admin/menu/products/${VELVET}/featured-today`)
      .set({
        'x-user-id': 'random-customer',
        'x-user-role': 'student',
        'x-verification-status': 'approved',
        'x-user-phone': '+201000000008',
      })
      .send({ featured: true })
      .expect(403);
  });
});
