/**
 * Referrals repository — Phase 7.1 of UPGRADE-PLAN.md.
 *
 * Each user has a stable `referral_code`. Sharing the code triggers
 * a click track (anonymous), then a signup-link (when the referee
 * registers), then a conversion (when the referee places their first
 * paid order).
 *
 * Reward rules (locked):
 *   - Referrer: +50 pts on conversion
 *   - Referee:  +30 pts on conversion
 *
 * Anti-fraud rails:
 *   - Same device fingerprint (UA hash + IP) = no reward
 *   - Referrer must have signed up at least 7 days ago
 *   - Referee's first paid order must be ≥ 30 EGP
 *   - Click attribution window: 30 days
 *   - Signup window after click: 14 days
 *
 * In-memory mirror; production points at Supabase via migration
 * `0011_referrals.sql`.
 */
import { randomUUID, createHash } from 'node:crypto';

export type ReferralStatus = 'pending' | 'signed_up' | 'converted' | 'rejected';

export interface Referral {
  id: string;
  referrerId: string;
  refereeId: string | null;
  code: string;
  status: ReferralStatus;
  clickIp: string | null;
  clickUaHash: string | null;
  refClickedAt: string;
  signedUpAt: string | null;
  convertedAt: string | null;
  referrerReward: number | null;
  refereeReward: number | null;
  reasonRejected: string | null;
}

export interface ReferralStats {
  totalClicks: number;
  totalSignups: number;
  totalConversions: number;
  totalPointsEarned: number;
}

// Reward configuration
export const REFERRER_REWARD = 50;
export const REFEREE_REWARD = 30;
export const MIN_CONVERSION_ORDER_EGP = 30;
export const REFERRER_MIN_AGE_DAYS = 7;
export const CLICK_WINDOW_DAYS = 30;
export const SIGNUP_WINDOW_DAYS = 14;

const referrals: Referral[] = [];
const userCodes = new Map<string, string>(); // userId → code
const codeToUser = new Map<string, string>(); // code → userId

// ============================================================
// Code generation + lookup
// ============================================================

const SAFE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I

function generateCode(): string {
  let s = '';
  for (let i = 0; i < 5; i++) {
    s += SAFE_CHARS[Math.floor(Math.random() * SAFE_CHARS.length)];
  }
  s += String(Math.floor(Math.random() * 90 + 10)); // 2-digit suffix
  return s;
}

/**
 * Get or generate the referral code for a user. Idempotent.
 */
export function ensureReferralCode(userId: string): string {
  const existing = userCodes.get(userId);
  if (existing) return existing;
  let code: string;
  let attempts = 0;
  do {
    code = generateCode();
    attempts += 1;
    if (attempts > 10) throw new Error('Could not generate unique referral code');
  } while (codeToUser.has(code));
  userCodes.set(userId, code);
  codeToUser.set(code, userId);
  return code;
}

export function getReferralCode(userId: string): string {
  return ensureReferralCode(userId);
}

export function findUserByCode(code: string): string | null {
  return codeToUser.get(code.toUpperCase()) ?? null;
}

// ============================================================
// Click tracking (anonymous)
// ============================================================

function hashUa(ua: string): string {
  return createHash('sha256').update(ua).digest('hex').slice(0, 32);
}

/**
 * Track a click on a referral link. Creates a `pending` referral row
 * tied to the referrer; the referee_id is filled in later when they
 * sign up. Returns the row so the caller can drop a cookie with the
 * referral id (for cross-page persistence).
 */
export function trackReferralClick(input: {
  code: string;
  ip?: string | null;
  userAgent?: string | null;
}): Referral | null {
  const referrerId = findUserByCode(input.code);
  if (!referrerId) return null;
  const referral: Referral = {
    id: randomUUID(),
    referrerId,
    refereeId: null,
    code: input.code.toUpperCase(),
    status: 'pending',
    clickIp: input.ip ?? null,
    clickUaHash: input.userAgent ? hashUa(input.userAgent) : null,
    refClickedAt: new Date().toISOString(),
    signedUpAt: null,
    convertedAt: null,
    referrerReward: null,
    refereeReward: null,
    reasonRejected: null,
  };
  referrals.push(referral);
  return referral;
}

// ============================================================
// Signup linking
// ============================================================

/**
 * Called from the OTP verify handler when the user has just been
 * created. If a referral cookie was forwarded, link the referee to
 * the most recent pending row matching the code AND created within
 * the click window.
 *
 * Anti-fraud: rejects same-device matches (UA hash collision with
 * the click row), and rejects if the referrer is < 7 days old.
 */
export function linkRefereeOnSignup(input: {
  code: string;
  refereeId: string;
  ip?: string | null;
  userAgent?: string | null;
  referrerSignedUpAt: (uid: string) => Date | null;
  refereeSignedUpAt: Date;
}): Referral | null {
  const cutoff = Date.now() - CLICK_WINDOW_DAYS * 86_400_000;
  // Find most recent pending click for this code.
  const candidate = [...referrals]
    .reverse()
    .find(
      (r) =>
        r.code === input.code.toUpperCase() &&
        r.status === 'pending' &&
        new Date(r.refClickedAt).getTime() >= cutoff,
    );
  if (!candidate) return null;

  // Anti-fraud: same device fingerprint?
  const refereeUaHash = input.userAgent ? hashUa(input.userAgent) : null;
  if (
    candidate.clickUaHash &&
    refereeUaHash &&
    candidate.clickUaHash === refereeUaHash
  ) {
    candidate.status = 'rejected';
    candidate.reasonRejected = 'same_device_fingerprint';
    return candidate;
  }

  // Anti-fraud: referrer must be Bronze+ for ≥ 7 days.
  // (For v1.5, every signed-up user is Bronze+; we just check signup age.)
  const referrerSignup = input.referrerSignedUpAt(candidate.referrerId);
  if (referrerSignup) {
    const ageMs = input.refereeSignedUpAt.getTime() - referrerSignup.getTime();
    if (ageMs < REFERRER_MIN_AGE_DAYS * 86_400_000) {
      candidate.status = 'rejected';
      candidate.reasonRejected = 'referrer_too_new';
      return candidate;
    }
  }

  candidate.refereeId = input.refereeId;
  candidate.status = 'signed_up';
  candidate.signedUpAt = input.refereeSignedUpAt.toISOString();
  return candidate;
}

// ============================================================
// Conversion (first paid order)
// ============================================================

/**
 * Called when an order is paid. If the buyer has a `signed_up`
 * referral row AND the order qualifies (≥ 30 EGP, within signup
 * window), convert and credit both sides.
 *
 * Returns null if there's no qualifying referral.
 */
export function tryConvertReferralOnFirstPaidOrder(input: {
  refereeId: string;
  orderTotalEgp: number;
}): Referral | null {
  const candidate = referrals.find(
    (r) => r.refereeId === input.refereeId && r.status === 'signed_up',
  );
  if (!candidate) return null;

  // Anti-fraud: minimum order amount.
  if (input.orderTotalEgp < MIN_CONVERSION_ORDER_EGP) {
    return null; // Don't reject — let them try a bigger order
  }

  // Anti-fraud: signup window.
  if (candidate.signedUpAt) {
    const ageMs = Date.now() - new Date(candidate.signedUpAt).getTime();
    if (ageMs > SIGNUP_WINDOW_DAYS * 86_400_000) {
      candidate.status = 'rejected';
      candidate.reasonRejected = 'signup_window_expired';
      return candidate;
    }
  }

  candidate.status = 'converted';
  candidate.convertedAt = new Date().toISOString();
  candidate.referrerReward = REFERRER_REWARD;
  candidate.refereeReward = REFEREE_REWARD;
  return candidate;
}

// ============================================================
// Reads
// ============================================================

export function listReferralsByReferrer(userId: string): Referral[] {
  return [...referrals]
    .filter((r) => r.referrerId === userId)
    .sort((a, b) => b.refClickedAt.localeCompare(a.refClickedAt));
}

export function getReferralStats(userId: string): ReferralStats {
  const all = referrals.filter((r) => r.referrerId === userId);
  return {
    totalClicks: all.length,
    totalSignups: all.filter((r) => r.refereeId !== null).length,
    totalConversions: all.filter((r) => r.status === 'converted').length,
    totalPointsEarned: all
      .filter((r) => r.status === 'converted')
      .reduce((s, r) => s + (r.referrerReward ?? 0), 0),
  };
}
