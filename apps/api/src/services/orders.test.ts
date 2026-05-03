import { describe, expect, it } from 'vitest';
import {
  applyStatusTransition,
  buildOrder,
  canTransitionTo,
  generatePickupCode,
  trackingTimelineFor,
} from './orders.js';

const sampleInput = {
  userId: 'u1',
  fulfillmentType: 'pickup' as const,
  paymentMethod: 'cash' as const,
  redeemPoints: 0,
  items: [
    {
      productId: 'velvet-cappuccino',
      productNameEn: 'Velvet Cappuccino',
      productNameAr: 'كابتشينو فيلفيت',
      imageUrl: '/images/products/velvet-cappuccino.svg',
      quantity: 2,
      options: { size: 'Medium', sugar: 'Normal' },
      unitPriceEgp: 65,
    },
  ],
};

describe('orders.buildOrder', () => {
  it('computes line totals + subtotal + total', () => {
    const o = buildOrder(sampleInput, { discountEgp: 0, pointsAwarded: 0 });
    expect(o.items[0].lineTotalEgp).toBe(130);
    expect(o.subtotalEgp).toBe(130);
    expect(o.totalEgp).toBe(130);
  });

  it('applies discount and floors total at 0', () => {
    const o = buildOrder(sampleInput, { discountEgp: 200, pointsAwarded: 0 });
    expect(o.totalEgp).toBe(0);
  });

  it('starts in received with one history entry', () => {
    const o = buildOrder(sampleInput, { discountEgp: 0, pointsAwarded: 0 });
    expect(o.status).toBe('received');
    expect(o.statusHistory).toHaveLength(1);
    expect(o.statusHistory[0].status).toBe('received');
  });

  it('cash orders start payment_status=pending; card orders unpaid', () => {
    const cash = buildOrder(sampleInput, { discountEgp: 0, pointsAwarded: 0 });
    expect(cash.paymentStatus).toBe('pending');
    const card = buildOrder({ ...sampleInput, paymentMethod: 'paymob_card' }, { discountEgp: 0, pointsAwarded: 0 });
    expect(card.paymentStatus).toBe('unpaid');
  });

  it('generates a 4-digit pickup code', () => {
    const o = buildOrder(sampleInput, { discountEgp: 0, pointsAwarded: 0 });
    expect(o.pickupCode).toMatch(/^[1-9]\d{3}$/);
  });
});

describe('orders.canTransitionTo', () => {
  it('allows received → accepted', () => {
    expect(canTransitionTo('received', 'accepted')).toBe(true);
  });
  it('rejects skipping (received → ready)', () => {
    expect(canTransitionTo('received', 'ready')).toBe(false);
  });
  it('allows ready → completed for pickup', () => {
    expect(canTransitionTo('ready', 'completed')).toBe(true);
  });
  it('allows ready → out_for_delivery for delivery', () => {
    expect(canTransitionTo('ready', 'out_for_delivery')).toBe(true);
  });
  it('cancelled is terminal', () => {
    expect(canTransitionTo('cancelled', 'received')).toBe(false);
    expect(canTransitionTo('cancelled', 'completed')).toBe(false);
  });
  it('completed can go to refunded only', () => {
    expect(canTransitionTo('completed', 'refunded')).toBe(true);
    expect(canTransitionTo('completed', 'received')).toBe(false);
  });
});

describe('orders.applyStatusTransition', () => {
  it('appends to history on legal transition', () => {
    const o = buildOrder(sampleInput, { discountEgp: 0, pointsAwarded: 0 });
    expect(applyStatusTransition(o, 'accepted')).toBe(true);
    expect(o.status).toBe('accepted');
    expect(o.statusHistory).toHaveLength(2);
  });

  it('rejects illegal transition without mutation', () => {
    const o = buildOrder(sampleInput, { discountEgp: 0, pointsAwarded: 0 });
    const ok = applyStatusTransition(o, 'completed');
    expect(ok).toBe(false);
    expect(o.status).toBe('received');
    expect(o.statusHistory).toHaveLength(1);
  });

  it('is idempotent on same-status', () => {
    const o = buildOrder(sampleInput, { discountEgp: 0, pointsAwarded: 0 });
    expect(applyStatusTransition(o, 'received')).toBe(true);
    expect(o.statusHistory).toHaveLength(1);
  });

  it('marks pickedUpAt when transitioning to completed', () => {
    const o = buildOrder(sampleInput, { discountEgp: 0, pointsAwarded: 0 });
    applyStatusTransition(o, 'accepted');
    applyStatusTransition(o, 'preparing');
    applyStatusTransition(o, 'ready');
    applyStatusTransition(o, 'completed');
    expect(o.pickedUpAt).toBeTruthy();
  });
});

describe('orders.trackingTimelineFor', () => {
  it('includes 5 steps for pickup', () => {
    const o = buildOrder(sampleInput, { discountEgp: 0, pointsAwarded: 0 });
    const t = trackingTimelineFor(o);
    expect(t.map((x) => x.status)).toEqual([
      'received', 'accepted', 'preparing', 'ready', 'completed',
    ]);
  });

  it('includes 6 steps for delivery (with out_for_delivery)', () => {
    const o = buildOrder(
      { ...sampleInput, fulfillmentType: 'delivery' },
      { discountEgp: 0, pointsAwarded: 0 },
    );
    const t = trackingTimelineFor(o);
    expect(t.map((x) => x.status)).toContain('out_for_delivery');
    expect(t.length).toBe(6);
  });

  it('marks the active step', () => {
    const o = buildOrder(sampleInput, { discountEgp: 0, pointsAwarded: 0 });
    applyStatusTransition(o, 'accepted');
    applyStatusTransition(o, 'preparing');
    const t = trackingTimelineFor(o);
    expect(t.find((x) => x.active)?.status).toBe('preparing');
    expect(t.find((x) => x.status === 'accepted')?.done).toBe(true);
  });
});

describe('orders.generatePickupCode', () => {
  it('produces a 4-digit code with no leading zero (50/50 risk: 1000-9999)', () => {
    for (let i = 0; i < 50; i++) {
      const code = generatePickupCode();
      expect(code).toMatch(/^[1-9]\d{3}$/);
    }
  });
});
