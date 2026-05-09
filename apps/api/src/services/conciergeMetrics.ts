/**
 * Cup AI Concierge metrics — answers "is the rule engine actually working?"
 *
 * Records every successful /catalog/suggest call into a bounded ring buffer
 * (newest first). The admin reports page consumes the aggregate via
 * GET /admin/reports/cup-ai. Pure in-memory; resets on process restart —
 * matches the existing pattern of every other admin metric in this codebase.
 *
 * What we capture per call (intentionally minimal — no PII):
 *   - timestamp, language, confidence
 *   - the user's query text (trimmed) so admins can see what people ask
 *   - the top-matched product id (or null if zero matches)
 *   - the matcher's understood signals so we can spot blind-spots
 *
 * Bounded at 5,000 events. At ~150 bytes per event that's ~750KB max.
 * If you outgrow this you want a real metrics backend, not a bigger array.
 */

import type { ConciergeResult } from './concierge.js';

const MAX_EVENTS = 5_000;

export interface ConciergeEvent {
  ts: number;                                // ms since epoch
  query: string;                             // trimmed, capped at 200 chars
  language: 'en' | 'ar';
  confidence: 'low' | 'medium' | 'high';
  matchCount: number;                        // 0–N (request limit caps it)
  topProductId: string | null;
  understood: ConciergeResult['understood'];
}

const events: ConciergeEvent[] = [];

export function recordSuggestion(args: {
  query: string;
  language: 'en' | 'ar';
  result: ConciergeResult;
}): void {
  const top = args.result.matches[0];
  events.unshift({
    ts: Date.now(),
    query: args.query.slice(0, 200),
    language: args.language,
    confidence: args.result.confidence,
    matchCount: args.result.matches.length,
    topProductId: top ? top.product.id : null,
    understood: args.result.understood,
  });
  if (events.length > MAX_EVENTS) events.length = MAX_EVENTS;
}

export interface ConciergeStats {
  windowMs: number;
  totalQueries: number;
  byLanguage: { en: number; ar: number };
  byConfidence: { low: number; medium: number; high: number };
  zeroMatchCount: number;
  /** Top user queries by frequency, capped at 10. Lower-cased for grouping. */
  topQueries: Array<{ query: string; count: number }>;
  /** Top low-confidence queries — these are the rule engine's blind spots. */
  topLowConfidenceQueries: Array<{ query: string; count: number }>;
  /** Most-suggested products with the language-localised name from the catalog. */
  topSuggestedProductIds: Array<{ productId: string; count: number }>;
}

/**
 * Returns aggregates over events newer than `windowMs`. Default 7 days.
 * Pure read — does not mutate the buffer.
 */
export function getStats(windowMs = 7 * 24 * 60 * 60 * 1000): ConciergeStats {
  const cutoff = Date.now() - windowMs;
  const slice = events.filter((e) => e.ts >= cutoff);

  const byLanguage = { en: 0, ar: 0 };
  const byConfidence = { low: 0, medium: 0, high: 0 };
  let zeroMatchCount = 0;
  const queryCounts = new Map<string, number>();
  const lowQueryCounts = new Map<string, number>();
  const productCounts = new Map<string, number>();

  for (const e of slice) {
    byLanguage[e.language]++;
    byConfidence[e.confidence]++;
    if (e.matchCount === 0) zeroMatchCount++;
    const key = e.query.toLowerCase().trim();
    if (key) queryCounts.set(key, (queryCounts.get(key) ?? 0) + 1);
    if (e.confidence === 'low' && key) {
      lowQueryCounts.set(key, (lowQueryCounts.get(key) ?? 0) + 1);
    }
    if (e.topProductId) {
      productCounts.set(e.topProductId, (productCounts.get(e.topProductId) ?? 0) + 1);
    }
  }

  return {
    windowMs,
    totalQueries: slice.length,
    byLanguage,
    byConfidence,
    zeroMatchCount,
    topQueries: rankTop(queryCounts, 10),
    topLowConfidenceQueries: rankTop(lowQueryCounts, 10),
    topSuggestedProductIds: rankTopProductIds(productCounts, 10),
  };
}

/** Test-only — clears the buffer. */
export function _resetMetrics(): void {
  events.length = 0;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function rankTop(counts: Map<string, number>, n: number): Array<{ query: string; count: number }> {
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([query, count]) => ({ query, count }));
}

function rankTopProductIds(counts: Map<string, number>, n: number): Array<{ productId: string; count: number }> {
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([productId, count]) => ({ productId, count }));
}
