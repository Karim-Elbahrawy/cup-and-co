/**
 * User streaks repository — Phase 6.2 of UPGRADE-PLAN.md.
 *
 * Tracks consecutive-day order ritual. Updated on every paid order;
 * a daily 00:05 UTC cron runs `breakIdleStreaks()` to consume freezes
 * or reset broken streaks.
 *
 * Day-7 bonus: every time `current_streak` crosses a multiple of 7,
 * the API caller can credit +50 loyalty points. We track
 * `lastBonusStreak` so a user who reaches day 7, breaks, then reaches
 * day 7 again gets the bonus a second time (counted from the new day-1).
 *
 * In-memory mirror for the dev/demo path. Production swap is one
 * file change to point at Supabase via `user_streaks` table
 * (migration `0010_user_streaks.sql`).
 */

export interface StreakState {
  currentStreak: number;
  longestStreak: number;
  lastOrderDate: string | null;
  freezesUsedThisWeek: number;
  freezesResetAt: string;
  lastBonusStreak: number;
  createdAt: string;
  updatedAt: string;
}

const states = new Map<string, StreakState>();

const FREEZES_PER_WEEK = 1;

/** ISO date string (YYYY-MM-DD), in Africa/Cairo for the user-perceived day. */
function dateOnlyCairo(d: Date = new Date()): string {
  // toISOString gives UTC; we need Cairo (UTC+02 or +03 with DST). We
  // use Intl which handles DST automatically.
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return fmt.format(d);
}

/** Days between two YYYY-MM-DD strings (b - a). Negative if b < a. */
function dayDiff(a: string, b: string): number {
  const ms = new Date(b + 'T00:00:00Z').getTime() - new Date(a + 'T00:00:00Z').getTime();
  return Math.round(ms / 86_400_000);
}

/** Monday-anchored week start as ISO string. */
function weekStartIso(d: Date = new Date()): string {
  const day = d.getUTCDay() || 7; // 1..7, with Sunday=7
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - (day - 1)));
  return start.toISOString();
}

function ensure(userId: string): StreakState {
  let s = states.get(userId);
  if (!s) {
    const now = new Date().toISOString();
    s = {
      currentStreak: 0,
      longestStreak: 0,
      lastOrderDate: null,
      freezesUsedThisWeek: 0,
      freezesResetAt: weekStartIso(),
      lastBonusStreak: 0,
      createdAt: now,
      updatedAt: now,
    };
    states.set(userId, s);
  }
  // Roll weekly freeze counter inline.
  const expectedWeek = weekStartIso();
  if (s.freezesResetAt !== expectedWeek) {
    s.freezesUsedThisWeek = 0;
    s.freezesResetAt = expectedWeek;
    s.updatedAt = new Date().toISOString();
  }
  return s;
}

export function getStreakState(userId: string): StreakState {
  return { ...ensure(userId) };
}

/**
 * Record a paid order against the user's streak. Returns the new state
 * plus whether the order earned a day-7 bonus (so the caller can credit
 * +50 loyalty points).
 *
 * Idempotent for same-day repeat orders: ordering twice on day 5 still
 * leaves you on day 5.
 */
export function recordOrderForStreak(
  userId: string,
  at: Date = new Date(),
): { state: StreakState; bonusEarned: boolean } {
  const s = ensure(userId);
  const today = dateOnlyCairo(at);

  if (s.lastOrderDate === today) {
    // Same-day repeat — no change.
    return { state: { ...s }, bonusEarned: false };
  }

  if (s.lastOrderDate === null) {
    s.currentStreak = 1;
  } else {
    const gap = dayDiff(s.lastOrderDate, today);
    if (gap === 1) {
      // Consecutive day.
      s.currentStreak += 1;
    } else if (gap > 1) {
      // Missed at least one day. Cron may have applied a freeze
      // already (lastOrderDate would be yesterday), or the user came
      // back after a true break.
      s.currentStreak = 1;
    }
    // gap < 1 shouldn't happen (would mean today < lastOrderDate); ignore.
  }

  s.lastOrderDate = today;
  s.longestStreak = Math.max(s.longestStreak, s.currentStreak);
  s.updatedAt = new Date().toISOString();

  // Day-7 bonus: every time currentStreak hits a multiple of 7 that
  // hasn't been bonused yet.
  let bonusEarned = false;
  if (s.currentStreak > 0 && s.currentStreak % 7 === 0 && s.currentStreak > s.lastBonusStreak) {
    bonusEarned = true;
    s.lastBonusStreak = s.currentStreak;
  }

  return { state: { ...s }, bonusEarned };
}

/**
 * Daily cron — consume freezes for users who missed yesterday, or
 * break streaks if no freezes are left. Called at 00:05 Cairo.
 */
export function breakIdleStreaks(now: Date = new Date()): { broken: number; froze: number } {
  let broken = 0;
  let froze = 0;
  const today = dateOnlyCairo(now);
  for (const [userId, s] of states.entries()) {
    if (s.currentStreak === 0) continue;
    if (s.lastOrderDate === null) continue;
    const gap = dayDiff(s.lastOrderDate, today);
    if (gap < 2) continue; // 0 = today (no break), 1 = yesterday (still ok)
    if (s.freezesUsedThisWeek < FREEZES_PER_WEEK) {
      // Consume a freeze: pretend they ordered yesterday.
      s.freezesUsedThisWeek += 1;
      s.lastOrderDate = dateOnlyCairo(new Date(now.getTime() - 86_400_000));
      s.updatedAt = new Date().toISOString();
      froze += 1;
    } else {
      s.currentStreak = 0;
      s.updatedAt = new Date().toISOString();
      broken += 1;
    }
  }
  return { broken, froze };
}

export const STREAKS_FREEZES_PER_WEEK = FREEZES_PER_WEEK;
