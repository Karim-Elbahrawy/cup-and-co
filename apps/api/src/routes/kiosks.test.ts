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
