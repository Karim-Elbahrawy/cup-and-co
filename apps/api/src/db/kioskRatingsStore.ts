/**
 * Phase K7.3 — kiosk post-order ratings.
 *
 * On the kiosk's confirmation screen the customer can give the order a
 * thumbs-up / thumbs-down. Each order accepts AT MOST one rating —
 * subsequent attempts are silently no-ops (the kiosk UI prevents this
 * client-side too, but we defend on the server in case of double-tap
 * races or a rogue request).
 *
 * Stored in-memory for now; persists alongside the orders Map so it's
 * naturally aligned with order lifecycle. Supabase migration will land
 * with the rest of the kiosks domain in a follow-up.
 *
 * Aggregated per-kiosk in the by-kiosk reports endpoint.
 */

export type KioskRating = 'up' | 'down';

interface RatingRow {
  orderId: string;
  kioskId: string;
  rating: KioskRating;
  ratedAt: number;
}

const ratings = new Map<string, RatingRow>();

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
  if (ratings.has(args.orderId)) return null;
  const row: RatingRow = {
    orderId: args.orderId,
    kioskId: args.kioskId,
    rating: args.rating,
    ratedAt: Date.now(),
  };
  ratings.set(args.orderId, row);
  return row;
}

export function getRating(orderId: string): RatingRow | undefined {
  return ratings.get(orderId);
}

/** Aggregate today's ratings per kiosk for the by-kiosk reports section. */
export function ratingsTodayByKiosk(): Map<
  string,
  { up: number; down: number }
> {
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
}
