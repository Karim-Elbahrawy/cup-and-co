/**
 * Smart suggestion engine — Phase 6.4 of UPGRADE-PLAN.md.
 *
 * Recommends a product to the customer based on:
 *   1. Time-of-day bucket    (morning / midday / evening, Cairo TZ)
 *   2. Season                 (summer / winter — Cairo: summer Apr-Oct,
 *                               winter Nov-Mar; biases iced vs hot)
 *   3. Their order history    (most-ordered product in this slot over
 *                               the last 30 days)
 *
 * Falls back to a campus bestseller if the user has no history yet.
 *
 * Pure functions — caller injects the order history + product list, so
 * this module is trivially testable and works whether the data lives
 * in Supabase or the in-memory dev store.
 */

export type TimeBucket = 'morning' | 'midday' | 'evening';
export type Season = 'summer' | 'winter';

export interface SuggestionInput {
  /** Order history for the user — last 30 days suffices. */
  history: ReadonlyArray<{
    productId: string;
    createdAt: string;
  }>;
  /** Catalog products available right now (already filtered by campus). */
  products: ReadonlyArray<{
    id: string;
    name_en: string;
    name_ar: string;
    image_url: string;
    base_price_egp: number;
    is_available: boolean;
    is_out_of_stock?: boolean;
    category_id: string;
  }>;
  /** Optional override (for tests). Defaults to now. */
  now?: Date;
}

export interface Suggestion {
  productId: string;
  productNameEn: string;
  productNameAr: string;
  imageUrl: string;
  basePriceEgp: number;
  bucket: TimeBucket;
  season: Season;
  reason: 'history' | 'season' | 'bestseller';
}

const ICED_KEYWORDS = ['iced', 'cold', 'مثلج', 'بارد'];
const HOT_KEYWORDS = ['latte', 'cappuccino', 'macchiato', 'espresso', 'mocha', 'americano'];

/** Cairo-aware bucket from the wall clock hour. */
export function bucketForHour(hour: number): TimeBucket {
  if (hour >= 6 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 16) return 'midday';
  return 'evening';
}

export function currentBucket(now: Date = new Date()): TimeBucket {
  const hourCairo = Number(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'Africa/Cairo',
      hour: '2-digit',
      hour12: false,
    }).format(now),
  );
  return bucketForHour(hourCairo);
}

/** Cairo summer vs winter. Apr-Oct = summer (>25°C avg). */
export function currentSeason(now: Date = new Date()): Season {
  const monthCairo = Number(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'Africa/Cairo',
      month: 'numeric',
    }).format(now),
  );
  return monthCairo >= 4 && monthCairo <= 10 ? 'summer' : 'winter';
}

function isIced(name: string): boolean {
  const lower = name.toLowerCase();
  return ICED_KEYWORDS.some((k) => lower.includes(k.toLowerCase()) || name.includes(k));
}

function isHotCoffee(name: string): boolean {
  const lower = name.toLowerCase();
  return HOT_KEYWORDS.some((k) => lower.includes(k));
}

/**
 * Returns the most-ordered product in the given bucket over the
 * trailing 30 days. Returns null if the user has no qualifying
 * history.
 */
function mostOrderedInBucket(
  input: SuggestionInput,
  bucket: TimeBucket,
): string | null {
  const cutoffMs = (input.now?.getTime() ?? Date.now()) - 30 * 86_400_000;
  const counts = new Map<string, number>();
  for (const entry of input.history) {
    const ts = new Date(entry.createdAt).getTime();
    if (ts < cutoffMs) continue;
    const hour = Number(
      new Intl.DateTimeFormat('en-US', {
        timeZone: 'Africa/Cairo',
        hour: '2-digit',
        hour12: false,
      }).format(new Date(entry.createdAt)),
    );
    if (bucketForHour(hour) !== bucket) continue;
    counts.set(entry.productId, (counts.get(entry.productId) ?? 0) + 1);
  }
  if (counts.size === 0) return null;
  let topId: string | null = null;
  let topCount = 0;
  for (const [id, c] of counts.entries()) {
    if (c > topCount) {
      topId = id;
      topCount = c;
    }
  }
  return topId;
}

/**
 * Bias a candidate product set toward iced (summer) or hot (winter).
 * Returns the first product that matches the seasonal preference, or
 * the first available product if none match.
 */
function pickSeasonal(
  products: SuggestionInput['products'],
  season: Season,
): SuggestionInput['products'][number] | null {
  const available = products.filter((p) => p.is_available && !p.is_out_of_stock);
  if (available.length === 0) return null;
  const preferred = available.filter((p) => {
    const name = `${p.name_en} ${p.name_ar}`;
    return season === 'summer' ? isIced(name) : isHotCoffee(name) && !isIced(name);
  });
  return preferred[0] ?? available[0];
}

/**
 * Run the suggestion algorithm. Returns null if no products are
 * available (e.g., empty catalog).
 */
export function suggestForUser(input: SuggestionInput): Suggestion | null {
  const now = input.now ?? new Date();
  const bucket = currentBucket(now);
  const season = currentSeason(now);

  // 1. History-based: most-ordered product in this bucket over 30d.
  const historyId = mostOrderedInBucket(input, bucket);
  if (historyId) {
    const product = input.products.find(
      (p) => p.id === historyId && p.is_available && !p.is_out_of_stock,
    );
    if (product) {
      // If history product is hot in summer (or vice versa) AND a clear
      // seasonal alternative exists in the same category, prefer it.
      const isWrongSeason =
        (season === 'summer' && !isIced(`${product.name_en} ${product.name_ar}`)) ||
        (season === 'winter' && isIced(`${product.name_en} ${product.name_ar}`));
      if (isWrongSeason) {
        const seasonalAlt = input.products.find(
          (p) =>
            p.id !== product.id &&
            p.category_id === product.category_id &&
            p.is_available &&
            !p.is_out_of_stock &&
            (season === 'summer'
              ? isIced(`${p.name_en} ${p.name_ar}`)
              : !isIced(`${p.name_en} ${p.name_ar}`)),
        );
        if (seasonalAlt) {
          return {
            productId: seasonalAlt.id,
            productNameEn: seasonalAlt.name_en,
            productNameAr: seasonalAlt.name_ar,
            imageUrl: seasonalAlt.image_url,
            basePriceEgp: seasonalAlt.base_price_egp,
            bucket,
            season,
            reason: 'season',
          };
        }
      }
      return {
        productId: product.id,
        productNameEn: product.name_en,
        productNameAr: product.name_ar,
        imageUrl: product.image_url,
        basePriceEgp: product.base_price_egp,
        bucket,
        season,
        reason: 'history',
      };
    }
  }

  // 2. No history (or out-of-stock favorite) — pick a seasonal bestseller.
  const fallback = pickSeasonal(input.products, season);
  if (!fallback) return null;
  return {
    productId: fallback.id,
    productNameEn: fallback.name_en,
    productNameAr: fallback.name_ar,
    imageUrl: fallback.image_url,
    basePriceEgp: fallback.base_price_egp,
    bucket,
    season,
    reason: 'bestseller',
  };
}
