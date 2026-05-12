/**
 * Coffee Pass — recurring drink subscriptions.
 *
 * v1 ships a single hardcoded plan ("Morning Pass" — EGP 299/month, 1 free
 * drink per day, only valid before 11am). The shape lets us add more plans
 * (afternoon, all-day, weekly, faculty-only) later without changing the
 * subscription contract.
 *
 * State is in-memory to match the rest of the API; subscriptions reset on
 * process restart in dev. When orders/users move to Supabase this store
 * becomes a `subscriptions` table — the API surface stays identical.
 */

const DAILY_USAGE_BUCKETS = 60; // keep last 60 days of usage so daily-cap math doesn't grow unboundedly

export interface SubscriptionPlan {
  id: string;
  name_en: string;
  name_ar: string;
  description_en: string;
  description_ar: string;
  /** Price charged per billing cycle. */
  price_egp: number;
  /** How many drinks the subscriber can claim per day under this plan. */
  daily_drink_credits: number;
  /** Plan is only usable BEFORE this hour (24h, server local). null = always. */
  valid_until_hour: number | null;
  /** Length of one billing cycle in days. */
  billing_cycle_days: number;
}

/** Source-of-truth catalogue of available plans. v1 has just the morning pass. */
export const PLANS: Record<string, SubscriptionPlan> = {
  'morning-pass': {
    id: 'morning-pass',
    name_en: 'Morning Pass',
    name_ar: 'باقة الصباح',
    description_en: 'One free drink every morning. Skip the line, save the math.',
    description_ar: 'مشروبك المجاني كل صباح. تخطّ الطابور، خلّيك مرتاح.',
    price_egp: 299,
    daily_drink_credits: 1,
    valid_until_hour: 11,
    billing_cycle_days: 30,
  },
};

export type SubscriptionStatus = 'active' | 'cancelled' | 'expired';

export interface UserSubscription {
  userId: string;
  planId: string;
  /** ISO timestamp when the user subscribed. */
  startedAt: string;
  /** ISO timestamp when the current cycle ends. After this, status flips
   *  to 'expired' (or auto-renews in v2). */
  endsAt: string;
  status: SubscriptionStatus;
  /** Set when status === 'cancelled'. The user keeps benefits until endsAt. */
  cancelledAt: string | null;
  /** Daily usage map keyed by `YYYY-MM-DD` (server-local). */
  dailyUsage: Record<string, number>;
}

const userSubscriptions = new Map<string, UserSubscription>();

// ─── Date helpers ─────────────────────────────────────────────────────────

/** YYYY-MM-DD in server's local timezone — matches the plan's valid-hour check. */
export function todayKey(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Trims dailyUsage to the most recent N days so the map can't grow unbounded. */
function pruneUsage(sub: UserSubscription): void {
  const keys = Object.keys(sub.dailyUsage).sort();
  if (keys.length <= DAILY_USAGE_BUCKETS) return;
  const drop = keys.slice(0, keys.length - DAILY_USAGE_BUCKETS);
  for (const k of drop) delete sub.dailyUsage[k];
}

// ─── Subscription state ───────────────────────────────────────────────────

/** Returns the user's subscription record (regardless of status), or null. */
export function getSubscription(userId: string): UserSubscription | null {
  const sub = userSubscriptions.get(userId);
  if (!sub) return null;
  // Lazily expire if past endsAt — we don't run a cron in v1.
  if (sub.status !== 'expired' && new Date(sub.endsAt).getTime() <= Date.now()) {
    sub.status = 'expired';
  }
  return sub;
}

/**
 * Subscribes (or resubscribes) a user to a plan. v1 doesn't run a payment
 * gateway — like the cash payment-method, it bypasses Paymob entirely. When
 * Paymob's recurring-billing API lands, this becomes the post-charge hook.
 *
 * Idempotent on a single active subscription per user: subscribing while
 * already-active extends the cycle from now.
 */
export function subscribe(userId: string, planId: string, now: Date = new Date()): UserSubscription {
  const plan = PLANS[planId];
  if (!plan) throw new Error(`Unknown plan: ${planId}`);
  const startedAt = now.toISOString();
  const endsAt = new Date(now.getTime() + plan.billing_cycle_days * 24 * 60 * 60 * 1000).toISOString();
  const existing = userSubscriptions.get(userId);
  const sub: UserSubscription = {
    userId,
    planId,
    startedAt,
    endsAt,
    status: 'active',
    cancelledAt: null,
    // Preserve usage for fairness if the user is mid-day resubscribing —
    // they shouldn't get a fresh credit just by re-pressing subscribe.
    dailyUsage: existing?.dailyUsage ?? {},
  };
  userSubscriptions.set(userId, sub);
  pruneUsage(sub);
  return sub;
}

/**
 * Marks the subscription cancelled but keeps benefits available until endsAt
 * (the customer paid for the cycle; we honour it). After endsAt elapses
 * `getSubscription` will flip status to 'expired' on the next read.
 */
export function cancelSubscription(userId: string, now: Date = new Date()): UserSubscription | null {
  const sub = userSubscriptions.get(userId);
  if (!sub || sub.status !== 'active') return sub ?? null;
  sub.status = 'cancelled';
  sub.cancelledAt = now.toISOString();
  return sub;
}

// ─── Eligibility + usage ──────────────────────────────────────────────────

/** True iff the subscription is in a state where credits can still be redeemed. */
function isStatusUsable(status: SubscriptionStatus): boolean {
  // 'cancelled' subscribers keep benefits until endsAt — see cancelSubscription
  return status === 'active' || status === 'cancelled';
}

/** True iff the current local time satisfies the plan's `valid_until_hour`. */
function isWithinValidHours(plan: SubscriptionPlan, now: Date = new Date()): boolean {
  if (plan.valid_until_hour == null) return true;
  return now.getHours() < plan.valid_until_hour;
}

/** Today's drink-credit usage count for this user. */
function getUsageToday(sub: UserSubscription, now: Date = new Date()): number {
  return sub.dailyUsage[todayKey(now)] ?? 0;
}

export interface EligibilityCheck {
  eligible: boolean;
  reason: 'no_subscription' | 'expired' | 'outside_hours' | 'daily_cap_reached' | 'eligible';
  creditsRemainingToday: number;
}

/** Used by the order endpoint to decide whether to auto-apply a free drink. */
export function checkEligibility(userId: string, now: Date = new Date()): EligibilityCheck {
  const sub = getSubscription(userId);
  if (!sub) return { eligible: false, reason: 'no_subscription', creditsRemainingToday: 0 };
  if (!isStatusUsable(sub.status) || sub.status === 'expired') {
    return { eligible: false, reason: 'expired', creditsRemainingToday: 0 };
  }
  const plan = PLANS[sub.planId];
  if (!plan) return { eligible: false, reason: 'expired', creditsRemainingToday: 0 };
  const usedToday = getUsageToday(sub, now);
  const remaining = Math.max(0, plan.daily_drink_credits - usedToday);
  if (!isWithinValidHours(plan, now)) {
    return { eligible: false, reason: 'outside_hours', creditsRemainingToday: remaining };
  }
  if (remaining <= 0) {
    return { eligible: false, reason: 'daily_cap_reached', creditsRemainingToday: 0 };
  }
  return { eligible: true, reason: 'eligible', creditsRemainingToday: remaining };
}

/**
 * Increments today's usage by 1. Caller must check eligibility first; this
 * is a raw accounting primitive. Returns the new daily count.
 */
export function recordUsage(userId: string, now: Date = new Date()): number {
  const sub = userSubscriptions.get(userId);
  if (!sub) throw new Error('Cannot record usage for non-subscriber');
  const key = todayKey(now);
  sub.dailyUsage[key] = (sub.dailyUsage[key] ?? 0) + 1;
  pruneUsage(sub);
  return sub.dailyUsage[key];
}

// ─── Aggregates (for the admin reports tile) ─────────────────────────────

export interface SubscriptionSummary {
  activeCount: number;
  cancelledCount: number;
  /** Sum of price_egp for every currently-active subscription — represents
   *  the locked-in MRR for the rest of this billing cycle. */
  monthlyRevenueEgp: number;
  totalPlans: number;
}

export function getSummary(now: Date = new Date()): SubscriptionSummary {
  let activeCount = 0;
  let cancelledCount = 0;
  let monthlyRevenueEgp = 0;
  for (const sub of userSubscriptions.values()) {
    // Trigger lazy expiry
    getSubscription(sub.userId);
    if (sub.status === 'active') {
      activeCount++;
      monthlyRevenueEgp += PLANS[sub.planId]?.price_egp ?? 0;
    } else if (sub.status === 'cancelled' && new Date(sub.endsAt).getTime() > now.getTime()) {
      cancelledCount++;
      // Cancelled-but-not-yet-expired subscriptions still represent revenue
      // already collected, so include them in MRR-this-cycle.
      monthlyRevenueEgp += PLANS[sub.planId]?.price_egp ?? 0;
    }
  }
  return {
    activeCount,
    cancelledCount,
    monthlyRevenueEgp,
    totalPlans: Object.keys(PLANS).length,
  };
}

/** Test-only — clears the store. */
export function _resetSubscriptions(): void {
  userSubscriptions.clear();
}
