import type { LoyaltySource } from '@cup-and-co/types';
import { config } from '../config.js';

export interface EarnedPointsInput {
  amountEgp: number;
  source: LoyaltySource;
}

const sourceMultipliers: Record<LoyaltySource, () => number> = {
  online_paid: () => config.loyalty.onlineMultiplier,
  cash_in_app: () => config.loyalty.cashMultiplier,
  qr_receipt: () => config.loyalty.qrMultiplier,
  game_reward: () => 1.0,
};

/**
 * Calculate points earned for a given amount and source.
 * online_paid > cash_in_app > qr_receipt
 */
export function calculateEarnedPoints(input: EarnedPointsInput): number {
  if (!Number.isFinite(input.amountEgp) || input.amountEgp <= 0) return 0;
  return Math.floor(input.amountEgp * sourceMultipliers[input.source]());
}

/**
 * Convert points to EGP discount in 100-point blocks.
 * 100 points = 5 EGP by default.
 */
export function calculateDiscountEgp(points: number): number {
  if (!Number.isFinite(points) || points < config.loyalty.pointsPerBlock) return 0;
  const blocks = Math.floor(points / config.loyalty.pointsPerBlock);
  return blocks * config.loyalty.discountEgpPerBlock;
}

/**
 * How many points are needed to redeem a given EGP discount.
 */
export function pointsRequiredForDiscount(discountEgp: number): number {
  if (discountEgp <= 0) return 0;
  const blocks = Math.ceil(discountEgp / config.loyalty.discountEgpPerBlock);
  return blocks * config.loyalty.pointsPerBlock;
}
