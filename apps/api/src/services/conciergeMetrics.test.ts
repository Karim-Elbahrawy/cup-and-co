import { describe, expect, it, beforeEach } from 'vitest';
import { recordSuggestion, getStats, _resetMetrics } from './conciergeMetrics.js';
import type { ConciergeResult, ExtractedSignals } from './concierge.js';
import type { Product } from '@cup-and-co/types';

function emptySignals(): ExtractedSignals {
  return { temperature: null, energy: null, sweetness: null, caffeine: null, tags: [], category: null };
}

function p(id: string, name = 'Test Drink'): Product {
  return {
    id, category_id: 'c', name_en: name, name_ar: name, description_en: '', description_ar: '',
    base_price_egp: 10, image_url: '', prep_minutes: 5, is_available: true,
    sort_order: 1, rating_avg: 0, rating_count: 0, stock_count: null,
  };
}

function result(opts: {
  confidence?: 'low' | 'medium' | 'high';
  matches?: Array<{ id: string; score?: number }>;
} = {}): ConciergeResult {
  return {
    matches: (opts.matches ?? []).map((m) => ({
      product: p(m.id),
      score: m.score ?? 1,
      reason: 'r',
      reasonEn: 'r',
    })),
    understood: emptySignals(),
    confidence: opts.confidence ?? 'medium',
  };
}

describe('conciergeMetrics', () => {
  beforeEach(() => _resetMetrics());

  it('records language and confidence breakdowns', () => {
    recordSuggestion({ query: 'cold coffee',  language: 'en', result: result({ confidence: 'high' }) });
    recordSuggestion({ query: 'حاجة باردة',     language: 'ar', result: result({ confidence: 'medium' }) });
    recordSuggestion({ query: 'something fun', language: 'en', result: result({ confidence: 'low' }) });

    const s = getStats();
    expect(s.totalQueries).toBe(3);
    expect(s.byLanguage).toEqual({ en: 2, ar: 1 });
    expect(s.byConfidence).toEqual({ low: 1, medium: 1, high: 1 });
  });

  it('counts zero-match calls as a separate signal', () => {
    recordSuggestion({ query: 'random text', language: 'en', result: result({ matches: [] }) });
    recordSuggestion({ query: 'cold coffee', language: 'en', result: result({ matches: [{ id: 'a' }] }) });

    const s = getStats();
    expect(s.zeroMatchCount).toBe(1);
  });

  it('ranks the most-frequent queries (case-insensitive)', () => {
    recordSuggestion({ query: 'Cold Coffee', language: 'en', result: result() });
    recordSuggestion({ query: 'cold coffee', language: 'en', result: result() });
    recordSuggestion({ query: 'COLD COFFEE', language: 'en', result: result() });
    recordSuggestion({ query: 'tea',          language: 'en', result: result() });

    const s = getStats();
    expect(s.topQueries[0]).toEqual({ query: 'cold coffee', count: 3 });
    expect(s.topQueries[1]).toEqual({ query: 'tea',         count: 1 });
  });

  it('isolates low-confidence queries — these are the matcher blind-spots', () => {
    recordSuggestion({ query: 'mystery thing', language: 'en', result: result({ confidence: 'low' }) });
    recordSuggestion({ query: 'mystery thing', language: 'en', result: result({ confidence: 'low' }) });
    recordSuggestion({ query: 'cold coffee',   language: 'en', result: result({ confidence: 'high' }) });

    const s = getStats();
    expect(s.topLowConfidenceQueries).toEqual([{ query: 'mystery thing', count: 2 }]);
  });

  it('ranks the most-suggested products by top-match frequency', () => {
    recordSuggestion({ query: 'q1', language: 'en', result: result({ matches: [{ id: 'A' }, { id: 'B' }] }) });
    recordSuggestion({ query: 'q2', language: 'en', result: result({ matches: [{ id: 'A' }] }) });
    recordSuggestion({ query: 'q3', language: 'en', result: result({ matches: [{ id: 'B' }] }) });

    const s = getStats();
    expect(s.topSuggestedProductIds).toEqual([
      { productId: 'A', count: 2 },
      { productId: 'B', count: 1 },
    ]);
  });

  it('respects the rolling window — old events drop out', () => {
    // Inject an event manually then verify it gets filtered. We do this via the
    // public recordSuggestion + a tiny delay-window trick: the windowMs is
    // whatever we pass, so passing 0 gives us no window.
    recordSuggestion({ query: 'q', language: 'en', result: result() });
    expect(getStats(7 * 24 * 60 * 60 * 1000).totalQueries).toBe(1);
    // Pass a 1ms window AFTER waiting >1ms to confirm filtering.
    const start = Date.now();
    while (Date.now() - start < 5) { /* spin */ }
    expect(getStats(1).totalQueries).toBe(0);
  });
});
