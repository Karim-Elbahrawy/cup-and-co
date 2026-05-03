import { describe, expect, it } from 'vitest';
import { calculateDiscountEgp, calculateEarnedPoints, pointsRequiredForDiscount } from './loyalty.js';

describe('loyalty', () => {
  describe('calculateEarnedPoints', () => {
    it('online_paid earns 1 point per EGP (default)', () => {
      expect(calculateEarnedPoints({ amountEgp: 100, source: 'online_paid' })).toBe(100);
    });

    it('cash_in_app earns half of online (default 0.5)', () => {
      expect(calculateEarnedPoints({ amountEgp: 100, source: 'cash_in_app' })).toBe(50);
    });

    it('qr_receipt earns quarter of online (default 0.25)', () => {
      expect(calculateEarnedPoints({ amountEgp: 100, source: 'qr_receipt' })).toBe(25);
    });

    it('online > cash > qr ratio holds for arbitrary amounts', () => {
      const amount = 87;
      const online = calculateEarnedPoints({ amountEgp: amount, source: 'online_paid' });
      const cash = calculateEarnedPoints({ amountEgp: amount, source: 'cash_in_app' });
      const qr = calculateEarnedPoints({ amountEgp: amount, source: 'qr_receipt' });
      expect(online).toBeGreaterThan(cash);
      expect(cash).toBeGreaterThanOrEqual(qr);
    });

    it('returns 0 for non-positive amounts', () => {
      expect(calculateEarnedPoints({ amountEgp: 0, source: 'online_paid' })).toBe(0);
      expect(calculateEarnedPoints({ amountEgp: -10, source: 'online_paid' })).toBe(0);
    });

    it('returns 0 for non-finite amounts', () => {
      expect(calculateEarnedPoints({ amountEgp: NaN, source: 'online_paid' })).toBe(0);
      expect(calculateEarnedPoints({ amountEgp: Infinity, source: 'online_paid' })).toBe(0);
    });

    it('floors fractional results', () => {
      expect(calculateEarnedPoints({ amountEgp: 3, source: 'qr_receipt' })).toBe(0);
      expect(calculateEarnedPoints({ amountEgp: 5, source: 'qr_receipt' })).toBe(1);
    });
  });

  describe('calculateDiscountEgp', () => {
    it('100 points = 5 EGP', () => {
      expect(calculateDiscountEgp(100)).toBe(5);
    });

    it('200 points = 10 EGP', () => {
      expect(calculateDiscountEgp(200)).toBe(10);
    });

    it('99 points = 0 EGP (below minimum block)', () => {
      expect(calculateDiscountEgp(99)).toBe(0);
    });

    it('150 points = 5 EGP (only one full block)', () => {
      expect(calculateDiscountEgp(150)).toBe(5);
    });

    it('returns 0 for non-finite/negative', () => {
      expect(calculateDiscountEgp(NaN)).toBe(0);
      expect(calculateDiscountEgp(-50)).toBe(0);
    });
  });

  describe('pointsRequiredForDiscount', () => {
    it('5 EGP needs 100 points', () => {
      expect(pointsRequiredForDiscount(5)).toBe(100);
    });

    it('6 EGP needs 200 points (rounds up)', () => {
      expect(pointsRequiredForDiscount(6)).toBe(200);
    });

    it('0 EGP needs 0 points', () => {
      expect(pointsRequiredForDiscount(0)).toBe(0);
    });
  });
});
