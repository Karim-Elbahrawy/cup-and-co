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
