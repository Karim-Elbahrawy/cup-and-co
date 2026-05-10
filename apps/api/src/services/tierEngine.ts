/**
 * Loyalty tier engine — Phase 6.3 of UPGRADE-PLAN.md.
 *
 * Three tiers based on trailing 12-month points earned:
 *
 *   Bronze    0–499 pts/yr     1.0× points multiplier  (default)
 *   Silver  500–1999 pts/yr    1.25× points multiplier
 *                              1× free upsize per month
 *                              birthday drink free
 *   Gold      2000+ pts/yr     1.5× points multiplier
 *                              4× free upsizes per month
 *                              birthday drink free
 *                              KDS priority badge (Phase 3.1)
 *
 * Production swap is one file change to point at the
 * `recalculate_user_tier(uuid)` plpgsql function added by migration
 * `0011_tiered_loyalty.sql`. The in-memory mirror computes the same
 * result so dev flows work without Supabase.
 *
 * The hot path: applyTierMultiplier() runs on every loyalty earn —
 * cheap O(1) read of the user's cached current_tier.
 */

export type LoyaltyTier = 'bronze' | 'silver' | 'gold';

export interface TierState {
  currentTier: LoyaltyTier;
  tierCalculatedAt: string | null;
  tierBelowThresholdStreak: number;
}

export interface TierHistoryEntry {
  id: string;
  userId: string;
  fromTier: LoyaltyTier | null;
  toTier: LoyaltyTier;
  trailing12mPoints: number;
  reason: string;
  changedAt: string;
}

const tierStates = new Map<string, TierState>();
const tierHistory = new Map<string, TierHistoryEntry[]>();

const TIER_THRESHOLDS: Record<LoyaltyTier, number> = {
  bronze: 0,
  silver: 500,
  gold: 2000,
};

const TIER_RANKS: Record<LoyaltyTier, number> = {
  bronze: 1,
  silver: 2,
  gold: 3,
};

const TIER_MULTIPLIERS: Record<LoyaltyTier, number> = {
  bronze: 1.0,
  silver: 1.25,
  gold: 1.5,
};

export function getTierForPoints(points: number): LoyaltyTier {
  if (points >= TIER_THRESHOLDS.gold) return 'gold';
  if (points >= TIER_THRESHOLDS.silver) return 'silver';
  return 'bronze';
}

export function getTierState(userId: string): TierState {
  return (
    tierStates.get(userId) ?? {
      currentTier: 'bronze',
      tierCalculatedAt: null,
      tierBelowThresholdStreak: 0,
    }
  );
}

/**
 * Apply the tier-specific multiplier to a base points-earn amount.
 * Called by the loyalty engine on every `online_paid` / `cash_in_app`
 * credit. Round half-up.
 */
export function applyTierMultiplier(userId: string, basePoints: number): number {
  const tier = getTierState(userId).currentTier;
  return Math.round(basePoints * TIER_MULTIPLIERS[tier]);
}

export function getTierMultiplier(tier: LoyaltyTier): number {
  return TIER_MULTIPLIERS[tier];
}

/**
 * Recalculate tier for one user based on their trailing-12m points.
 *
 * @param userId
 * @param trailing12mPoints  caller computes this from loyalty_points
 *                            history (positive entries from the last
 *                            365 days)
 * @returns new tier (may equal old)
 */
export function recalculateUserTier(
  userId: string,
  trailing12mPoints: number,
): { tier: LoyaltyTier; changed: boolean; promoted: boolean } {
  const state = getTierState(userId);
  const newTier = getTierForPoints(trailing12mPoints);
  const oldTier = state.currentTier;

  if (newTier === oldTier) {
    // Reset the below-threshold streak counter.
    tierStates.set(userId, {
      ...state,
      tierCalculatedAt: new Date().toISOString(),
      tierBelowThresholdStreak: 0,
    });
    return { tier: newTier, changed: false, promoted: false };
  }

  const oldRank = TIER_RANKS[oldTier];
  const newRank = TIER_RANKS[newTier];

  if (newRank > oldRank) {
    // Promotion — immediate.
    const next: TierState = {
      currentTier: newTier,
      tierCalculatedAt: new Date().toISOString(),
      tierBelowThresholdStreak: 0,
    };
    tierStates.set(userId, next);
    pushHistory(userId, oldTier, newTier, trailing12mPoints, 'promotion');
    return { tier: newTier, changed: true, promoted: true };
  }

  // Demotion candidate — require 2 consecutive sub-threshold runs.
  if (state.tierBelowThresholdStreak >= 1) {
    const next: TierState = {
      currentTier: newTier,
      tierCalculatedAt: new Date().toISOString(),
      tierBelowThresholdStreak: 0,
    };
    tierStates.set(userId, next);
    pushHistory(userId, oldTier, newTier, trailing12mPoints, 'demotion (2 cycles below)');
    return { tier: newTier, changed: true, promoted: false };
  }

  // First sub-threshold run — count it, don't demote.
  tierStates.set(userId, {
    ...state,
    tierCalculatedAt: new Date().toISOString(),
    tierBelowThresholdStreak: state.tierBelowThresholdStreak + 1,
  });
  return { tier: oldTier, changed: false, promoted: false };
}

function pushHistory(
  userId: string,
  fromTier: LoyaltyTier | null,
  toTier: LoyaltyTier,
  trailing12mPoints: number,
  reason: string,
): void {
  const entry: TierHistoryEntry = {
    id: `${userId}-${Date.now()}`,
    userId,
    fromTier,
    toTier,
    trailing12mPoints,
    reason,
    changedAt: new Date().toISOString(),
  };
  const list = tierHistory.get(userId) ?? [];
  list.push(entry);
  tierHistory.set(userId, list);
}

export function getTierHistory(userId: string): TierHistoryEntry[] {
  return [...(tierHistory.get(userId) ?? [])].sort((a, b) => b.changedAt.localeCompare(a.changedAt));
}

/**
 * Inline helper for the API to call after every points credit. Reads
 * the loyaltyHistory map directly to compute trailing 12m, then
 * recalculates. The caller passes a `getTrailing12mPoints` resolver
 * so we don't have to import app.ts state here.
 */
export function recalculateOnEarn(
  userId: string,
  getTrailing12mPoints: (uid: string) => number,
): { tier: LoyaltyTier; changed: boolean; promoted: boolean } {
  const points = getTrailing12mPoints(userId);
  return recalculateUserTier(userId, points);
}

/**
 * Per-tier benefits exposed to the client. Used by the customer-web
 * profile page to render the "what you get at this tier" copy.
 */
export interface TierBenefits {
  tier: LoyaltyTier;
  multiplier: number;
  freeUpsizesPerMonth: number;
  birthdayDrinkFree: boolean;
  kdsPriority: boolean;
}

export const TIER_BENEFITS: Record<LoyaltyTier, TierBenefits> = {
  bronze: { tier: 'bronze', multiplier: 1.0, freeUpsizesPerMonth: 0, birthdayDrinkFree: false, kdsPriority: false },
  silver: { tier: 'silver', multiplier: 1.25, freeUpsizesPerMonth: 1, birthdayDrinkFree: true, kdsPriority: false },
  gold: { tier: 'gold', multiplier: 1.5, freeUpsizesPerMonth: 4, birthdayDrinkFree: true, kdsPriority: true },
};

export const TIER_THRESHOLDS_OUT = TIER_THRESHOLDS;
