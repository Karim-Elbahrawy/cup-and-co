import { describe, expect, it } from 'vitest';
import { createPushService, statusNotificationCopy } from './push.js';

describe('push.createPushService', () => {
  it('logs each notification and reports sent count', async () => {
    const svc = createPushService();
    const result = await svc.notify(
      [{ platform: 'ios', token: 't1' }, { platform: 'web', token: 't2' }],
      { title: 'Test', body: 'Hello' },
    );
    expect(result.sent).toBe(2);
    const sent = svc.sentLog();
    expect(sent).toHaveLength(1);
    expect(sent[0].deviceCount).toBe(2);
  });
});

describe('push.statusNotificationCopy', () => {
  it('returns English ready-for-pickup copy with code', () => {
    const c = statusNotificationCopy({
      status: 'ready',
      pickupCode: '4242',
      fulfillmentType: 'pickup',
      language: 'en',
    });
    expect(c.title).toMatch(/Ready/);
    expect(c.body).toContain('4242');
  });

  it('returns Arabic ready copy with code', () => {
    const c = statusNotificationCopy({
      status: 'ready',
      pickupCode: '4242',
      fulfillmentType: 'pickup',
      language: 'ar',
    });
    expect(c.title).toMatch(/جاهز/);
    expect(c.body).toContain('4242');
  });

  it('returns delivery-specific ready copy', () => {
    const c = statusNotificationCopy({
      status: 'ready',
      pickupCode: null,
      fulfillmentType: 'delivery',
      language: 'en',
    });
    expect(c.body).toMatch(/Heading|out/i);
  });
});
