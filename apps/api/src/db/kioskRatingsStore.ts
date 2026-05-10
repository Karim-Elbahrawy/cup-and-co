/**
 * Phase K7.3 — kiosk post-order ratings.
 *
 * On the kiosk's confirmation screen the customer can give the order a
 * thumbs-up / thumbs-down. Each order accepts AT MOST one rating —
 * subsequent attempts are silently no-ops (the kiosk UI prevents this
 * client-side too, but we defend on the server in case of double-tap
 * races or a rogue request).
 *
 * Aggregated per-kiosk in the by-kiosk reports endpoint.
 *
 * Persistence (SHIP-PLAN Phase 2.1):
 *   - In-memory `Map<orderId, RatingRow>` is the hot cache.
 *   - When SUPABASE is configured, the Map hydrates lazily on first read
 *     from the `kiosk_ratings` table, and every recordRating call mirrors
 *     to Supabase fire-and-forget. Survives a Render redeploy.
 *   - When SUPABASE is unset (dev / vitest), the Map IS the truth.
 */
import { config } from '../config.js';
import { getServiceClient } from './supabase.js';

export type KioskRating = 'up' | 'down';

interface RatingRow {
  orderId: string;
  kioskId: string;
  rating: KioskRating;
  ratedAt: number;
}

const ratings = new Map<string, RatingRow>();

let hydrated = false;
let hydratePromise: Promise<void> | null = null;

function isSupabaseReady(): boolean {
  return !!(
    config.supabase.serviceRoleKey &&
    config.supabase.url &&
    !config.supabase.url.includes('127.0.0.1:54321')
  );
}

interface KioskRatingDbRow {
  order_id: string;
  kiosk_id: string;
  rating: KioskRating;
  rated_at: string;
}

function rowToRating(row: KioskRatingDbRow): RatingRow {
  return {
    orderId: row.order_id,
    kioskId: row.kiosk_id,
    rating: row.rating,
    ratedAt: new Date(row.rated_at).getTime(),
  };
}

function hydrateOnce(): Promise<void> {
  if (hydrated) return Promise.resolve();
  if (!isSupabaseReady()) {
    hydrated = true;
    return Promise.resolve();
  }
  if (hydratePromise) return hydratePromise;

  hydratePromise = (async () => {
    try {
      const sb = getServiceClient();
      // Cap to a reasonable window — older ratings still feed the long-term
      // reporting picture but the in-memory hot path only needs today + a
      // little history. 30 days is enough margin for any aggregation.
      const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
      const { data, error } = await sb
        .from('kiosk_ratings')
        .select('*')
        .gte('rated_at', since);
      if (error) throw error;
      for (const row of (data ?? []) as KioskRatingDbRow[]) {
        if (!ratings.has(row.order_id)) ratings.set(row.order_id, rowToRating(row));
      }
      hydrated = true;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[kioskRatingsStore] hydrate failed:', err);
      hydrated = true;
    } finally {
      hydratePromise = null;
    }
  })();
  return hydratePromise;
}

function persist(row: RatingRow): void {
  if (!isSupabaseReady()) return;
  const sb = getServiceClient();
  void sb
    .from('kiosk_ratings')
    .upsert(
      {
        order_id: row.orderId,
        kiosk_id: row.kioskId,
        rating: row.rating,
        rated_at: new Date(row.ratedAt).toISOString(),
      },
      { onConflict: 'order_id' },
    )
    .then(({ error }) => {
      if (error) {
        // eslint-disable-next-line no-console
        console.error('[kioskRatingsStore] persist failed:', error.message);
      }
    });
}

/**
 * Record a rating for an order. Returns:
 *   - the new (or existing) row when accepted
 *   - null when the order was already rated (idempotent — caller can
 *     surface a friendly 'already rated' message but doesn't have to)
 */
export function recordRating(args: {
  orderId: string;
  kioskId: string;
  rating: KioskRating;
}): RatingRow | null {
  void hydrateOnce();
  if (ratings.has(args.orderId)) return null;
  const row: RatingRow = {
    orderId: args.orderId,
    kioskId: args.kioskId,
    rating: args.rating,
    ratedAt: Date.now(),
  };
  ratings.set(args.orderId, row);
  persist(row);
  return row;
}

export function getRating(orderId: string): RatingRow | undefined {
  void hydrateOnce();
  return ratings.get(orderId);
}

/** Aggregate today's ratings per kiosk for the by-kiosk reports section. */
export function ratingsTodayByKiosk(): Map<
  string,
  { up: number; down: number }
> {
  void hydrateOnce();
  const today = new Date().toISOString().slice(0, 10);
  const out = new Map<string, { up: number; down: number }>();
  for (const r of ratings.values()) {
    const day = new Date(r.ratedAt).toISOString().slice(0, 10);
    if (day !== today) continue;
    const tally = out.get(r.kioskId) ?? { up: 0, down: 0 };
    tally[r.rating] += 1;
    out.set(r.kioskId, tally);
  }
  return out;
}

export function resetRatingsForTests(): void {
  ratings.clear();
  hydrated = false;
  hydratePromise = null;
}
