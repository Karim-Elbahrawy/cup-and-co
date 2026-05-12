import { describe, expect, it, beforeEach } from 'vitest';
import {
  PLANS,
  subscribe,
  cancelSubscription,
  getSubscription,
  checkEligibility,
  recordUsage,
  getSummary,
  todayKey,
  _resetSubscriptions,
} from './subscriptionsStore.js';

const USER = 'user-123';

describe('subscriptionsStore', () => {
  beforeEach(() => _resetSubscriptions());

  describe('subscribe', () => {
    it('creates an active subscription with the right end-date', () => {
      const now = new Date('2026-05-10T10:00:00');
      const sub = subscribe(USER, 'morning-pass', now);
      expect(sub.status).toBe('active');
      expect(sub.userId).toBe(USER);
      expect(sub.planId).toBe('morning-pass');
      // 30-day cycle
      const expectedEnd = new Date('2026-06-09T10:00:00').toISOString();
      expect(sub.endsAt).toBe(expectedEnd);
    });

    it('throws on unknown plan id', () => {
      expect(() => subscribe(USER, 'no-such-plan')).toThrow();
    });

    it('preserves dailyUsage when resubscribing same day (no free credit reset)', () => {
      const day = new Date('2026-05-10T08:00:00');
      subscribe(USER, 'morning-pass', day);
      recordUsage(USER, day);
      // Resubscribe same day → existing usage shouldn't be wiped
      const sub2 = subscribe(USER, 'morning-pass', day);
      expect(sub2.dailyUsage[todayKey(day)]).toBe(1);
    });
  });

  describe('cancelSubscription', () => {
    it('marks status cancelled and records timestamp', () => {
      subscribe(USER, 'morning-pass');
      const cancelled = cancelSubscription(USER);
      expect(cancelled?.status).toBe('cancelled');
      expect(cancelled?.cancelledAt).toBeTruthy();
    });

    it('returns null when there is no active subscription', () => {
      expect(cancelSubscription(USER)).toBeNull();
    });

    it('cancelling does NOT immediately revoke benefits — they last until endsAt', () => {
      const now = new Date('2026-05-10T08:00:00');
      subscribe(USER, 'morning-pass', now);
      cancelSubscription(USER, now);
      // Same day, before 11am → still eligible until cycle ends
      const elig = checkEligibility(USER, new Date('2026-05-10T09:00:00'));
      expect(elig.eligible).toBe(true);
    });
  });

  describe('checkEligibility', () => {
    it('returns no_subscription for non-subscribers', () => {
      const elig = checkEligibility(USER);
      expect(elig).toEqual({ eligible: false, reason: 'no_subscription', creditsRemainingToday: 0 });
    });

    it('returns eligible inside the morning window with credits', () => {
      subscribe(USER, 'morning-pass', new Date('2026-05-10T08:00:00'));
      const elig = checkEligibility(USER, new Date('2026-05-10T09:30:00'));
      expect(elig.eligible).toBe(true);
      expect(elig.creditsRemainingToday).toBe(1);
    });

    it('returns outside_hours after 11am', () => {
      subscribe(USER, 'morning-pass', new Date('2026-05-10T08:00:00'));
      const elig = checkEligibility(USER, new Date('2026-05-10T11:30:00'));
      expect(elig.eligible).toBe(false);
      expect(elig.reason).toBe('outside_hours');
    });

    it('returns daily_cap_reached after using the free drink', () => {
      const morning = new Date('2026-05-10T08:00:00');
      subscribe(USER, 'morning-pass', morning);
      recordUsage(USER, morning);
      const elig = checkEligibility(USER, new Date('2026-05-10T09:00:00'));
      expect(elig.eligible).toBe(false);
      expect(elig.reason).toBe('daily_cap_reached');
      expect(elig.creditsRemainingToday).toBe(0);
    });

    it('expires the subscription lazily once the cycle is over', () => {
      const past = new Date('2026-04-01T08:00:00');
      subscribe(USER, 'morning-pass', past);
      // Now read 60 days later — past endsAt
      const elig = checkEligibility(USER, new Date('2026-06-15T08:00:00'));
      expect(elig.eligible).toBe(false);
      expect(elig.reason).toBe('expired');
      expect(getSubscription(USER)?.status).toBe('expired');
    });
  });

  describe('recordUsage', () => {
    it('increments today\'s counter and resets per-day', () => {
      const day1 = new Date('2026-05-10T08:00:00');
      const day2 = new Date('2026-05-11T08:00:00');
      subscribe(USER, 'morning-pass', day1);
      recordUsage(USER, day1);
      recordUsage(USER, day2);
      const sub = getSubscription(USER)!;
      expect(sub.dailyUsage[todayKey(day1)]).toBe(1);
      expect(sub.dailyUsage[todayKey(day2)]).toBe(1);
    });

    it('throws when called for a non-subscriber', () => {
      expect(() => recordUsage(USER)).toThrow();
    });
  });

  describe('getSummary', () => {
    it('counts active + cancelled-but-still-valid into MRR-this-cycle', () => {
      subscribe('a', 'morning-pass');
      subscribe('b', 'morning-pass');
      cancelSubscription('b');
      const s = getSummary();
      expect(s.activeCount).toBe(1);
      expect(s.cancelledCount).toBe(1);
      // Both subscriptions count toward this cycle's revenue
      expect(s.monthlyRevenueEgp).toBe(PLANS['morning-pass']!.price_egp * 2);
    });

    it('excludes expired subscriptions from MRR', () => {
      const past = new Date('2026-04-01T08:00:00');
      subscribe('a', 'morning-pass', past);
      // Force lazy-expire by reading at a future date
      checkEligibility('a', new Date('2026-06-15T08:00:00'));
      const s = getSummary(new Date('2026-06-15T08:00:00'));
      expect(s.activeCount).toBe(0);
      expect(s.monthlyRevenueEgp).toBe(0);
    });
  });
});
