import { describe, expect, it } from 'vitest';
import type { Order } from './orders.js';
import { computePrepEta, formatEta } from './prepEta.js';

function order(over: Partial<Order> = {}): Order {
  const now = '2026-05-07T08:00:00.000Z';
  return {
    id: over.id ?? 'order-1',
    userId: 'user-1',
    status: 'received',
    fulfillmentType: 'pickup',
    paymentMethod: 'cash',
    paymentStatus: 'pending',
    subtotalEgp: 100,
    discountEgp: 0,
    pointsRedeemed: 0,
    totalEgp: 100,
    pointsAwarded: 0,
    pickupCode: '1234',
    scheduledFor: null,
    notes: null,
    items: [
      {
        productId: 'p1',
        productNameEn: 'Latte',
        productNameAr: 'لاتيه',
        imageUrl: '/x.png',
        quantity: 1,
        options: {},
        unitPriceEgp: 50,
        lineTotalEgp: 50,
      },
    ],
    statusHistory: [{ status: 'received', at: now }],
    createdAt: now,
    pickedUpAt: null,
    placementSource: 'customer_app',
    kioskId: null,
    ...over,
  };
}

describe('computePrepEta — terminal statuses', () => {
  it('returns 0 with basis=ready for ready/out_for_delivery/completed', () => {
    for (const status of ['ready', 'out_for_delivery', 'completed'] as const) {
      const o = order({ status });
      const eta = computePrepEta(o, [o]);
      expect(eta.etaMinutes).toBe(0);
      expect(eta.basis).toBe('ready');
    }
  });

  it('returns 0 with basis=cancelled for cancelled/refunded', () => {
    for (const status of ['cancelled', 'refunded'] as const) {
      const o = order({ status });
      const eta = computePrepEta(o, [o]);
      expect(eta.etaMinutes).toBe(0);
      expect(eta.basis).toBe('cancelled');
    }
  });
});

describe('computePrepEta — preparing', () => {
  it('returns the full budget when just-started', () => {
    const startedAt = '2026-05-07T08:05:00.000Z';
    const o = order({
      status: 'preparing',
      statusHistory: [
        { status: 'received', at: '2026-05-07T08:00:00.000Z' },
        { status: 'accepted', at: '2026-05-07T08:01:00.000Z' },
        { status: 'preparing', at: startedAt },
      ],
    });
    const nowMs = new Date(startedAt).getTime();
    const eta = computePrepEta(o, [o], nowMs);
    expect(eta.basis).toBe('in_prep');
    expect(eta.etaMinutes).toBe(5); // budget = 5 + max(0, 1-1) = 5
  });

  it('decreases as time elapses inside preparing', () => {
    const startedAt = '2026-05-07T08:05:00.000Z';
    const o = order({
      status: 'preparing',
      statusHistory: [
        { status: 'received', at: '2026-05-07T08:00:00.000Z' },
        { status: 'preparing', at: startedAt },
      ],
    });
    // 3 minutes into a 5-minute prep budget — 2 min remaining.
    const nowMs = new Date(startedAt).getTime() + 3 * 60_000;
    const eta = computePrepEta(o, [o], nowMs);
    expect(eta.etaMinutes).toBe(2);
  });

  it('floors at 1 minute when over budget but still preparing', () => {
    const startedAt = '2026-05-07T08:05:00.000Z';
    const o = order({
      status: 'preparing',
      statusHistory: [{ status: 'preparing', at: startedAt }],
    });
    // 12 minutes into a 5-minute budget — should clamp to 1, not negative.
    const nowMs = new Date(startedAt).getTime() + 12 * 60_000;
    const eta = computePrepEta(o, [o], nowMs);
    expect(eta.etaMinutes).toBe(1);
  });
});

describe('computePrepEta — queue', () => {
  it('returns budget alone when nothing is ahead', () => {
    const o = order({ status: 'received' });
    const eta = computePrepEta(o, [o]);
    expect(eta.basis).toBe('queue');
    expect(eta.etaMinutes).toBe(5); // 0 ahead * 3 + budget 5
  });

  it('counts older active orders as ahead', () => {
    const earlier = order({
      id: 'older-1',
      status: 'preparing',
      createdAt: '2026-05-07T07:55:00.000Z',
    });
    const earlier2 = order({
      id: 'older-2',
      status: 'received',
      createdAt: '2026-05-07T07:58:00.000Z',
    });
    const me = order({ status: 'received', createdAt: '2026-05-07T08:00:00.000Z' });
    const eta = computePrepEta(me, [earlier, earlier2, me]);
    expect(eta.basis).toBe('queue');
    expect(eta.etaMinutes).toBe(2 * 3 + 5); // 11
  });

  it('ignores orders that are no longer active', () => {
    const completed = order({
      id: 'done',
      status: 'completed',
      createdAt: '2026-05-07T07:50:00.000Z',
    });
    const cancelled = order({
      id: 'cancelled',
      status: 'cancelled',
      createdAt: '2026-05-07T07:55:00.000Z',
    });
    const me = order({ status: 'received' });
    const eta = computePrepEta(me, [completed, cancelled, me]);
    expect(eta.etaMinutes).toBe(5);
  });

  it('ignores orders created at the same time or later', () => {
    const sameTime = order({
      id: 'same',
      status: 'received',
      createdAt: '2026-05-07T08:00:00.000Z',
    });
    const later = order({
      id: 'later',
      status: 'received',
      createdAt: '2026-05-07T08:01:00.000Z',
    });
    const me = order({ status: 'received', createdAt: '2026-05-07T08:00:00.000Z' });
    const eta = computePrepEta(me, [sameTime, later, me]);
    expect(eta.etaMinutes).toBe(5); // neither counts as ahead
  });

  it('larger orders take longer in the queue too', () => {
    const me = order({
      status: 'received',
      items: [
        {
          productId: 'p1',
          productNameEn: 'x',
          productNameAr: 'x',
          imageUrl: '/x.png',
          quantity: 4, // 4 drinks = budget 5 + 3 = 8
          options: {},
          unitPriceEgp: 10,
          lineTotalEgp: 40,
        },
      ],
    });
    const eta = computePrepEta(me, [me]);
    expect(eta.etaMinutes).toBe(8);
  });
});

describe('computePrepEta — scheduled', () => {
  it('uses scheduledFor when far enough in the future', () => {
    const nowMs = new Date('2026-05-07T08:00:00.000Z').getTime();
    const scheduledFor = '2026-05-07T09:00:00.000Z'; // 60 min away
    const o = order({ status: 'received', scheduledFor });
    const eta = computePrepEta(o, [o], nowMs);
    expect(eta.basis).toBe('scheduled');
    expect(eta.etaMinutes).toBe(60);
  });

  it('falls back to queue mode within the 5-min window of scheduledFor', () => {
    const nowMs = new Date('2026-05-07T08:00:00.000Z').getTime();
    const scheduledFor = '2026-05-07T08:02:00.000Z'; // 2 min away — close enough
    const o = order({ status: 'received', scheduledFor });
    const eta = computePrepEta(o, [o], nowMs);
    expect(eta.basis).toBe('queue');
  });

  it('clamps negative scheduled times to 0', () => {
    const nowMs = new Date('2026-05-07T09:00:00.000Z').getTime();
    const scheduledFor = '2026-05-07T08:00:00.000Z'; // an hour ago
    const o = order({ status: 'received', scheduledFor });
    const eta = computePrepEta(o, [o], nowMs);
    // Scheduled is in the past + within 5 min window check fails → falls
    // through to queue mode, which yields the normal budget.
    expect(eta.etaMinutes).toBe(5);
  });
});

describe('formatEta', () => {
  it('handles ready', () => {
    expect(formatEta({ etaMinutes: 0, basis: 'ready' })).toBe('Ready now');
  });
  it('handles cancelled', () => {
    expect(formatEta({ etaMinutes: 0, basis: 'cancelled' })).toBe('Cancelled');
  });
  it('rounds 1 minute up to a tilde phrase', () => {
    expect(formatEta({ etaMinutes: 1, basis: 'in_prep' })).toBe('Ready in ~1 min');
  });
  it('shows minutes for queue/in_prep/scheduled', () => {
    expect(formatEta({ etaMinutes: 7, basis: 'queue' })).toBe('Ready in ~7 min');
  });
});
