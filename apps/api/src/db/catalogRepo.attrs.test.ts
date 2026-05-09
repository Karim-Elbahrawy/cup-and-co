import { describe, expect, it, beforeEach } from 'vitest';
import type { Product } from '@cup-and-co/types';
import { setProductAttrs, getProductAttrs } from './catalogRepo.js';

/**
 * Behavioural tests for the Cup AI attribute overlay in fallback (no-Supabase)
 * mode. The Supabase write path is exercised by the API's integration tests,
 * not here, because mocking the Supabase client meaningfully requires a fixture
 * the existing test setup doesn't provide.
 *
 * `isSupabaseReady()` returns false when no service-role key is configured,
 * which is the default for vitest. So calls to `setProductAttrs` here always
 * land in the in-memory map.
 */

function p(id: string): Product {
  return {
    id,
    category_id: 'cat',
    name_en: 'Test',
    name_ar: '',
    description_en: '',
    description_ar: '',
    base_price_egp: 10,
    image_url: '',
    prep_minutes: 5,
    is_available: true,
    sort_order: 1,
    rating_avg: 0,
    rating_count: 0,
    stock_count: null,
  };
}

describe('catalogRepo concierge attribute overlay (fallback mode)', () => {
  // Use a fresh product id per test so state doesn't leak between cases.
  let id: string;
  beforeEach(() => {
    id = `test-${Math.random().toString(36).slice(2)}`;
  });

  it('persists individual attribute fields and reads them back', async () => {
    await setProductAttrs(id, { energy_level: 'high', sweetness: 2 });
    const merged = getProductAttrs(p(id));
    expect(merged.energy_level).toBe('high');
    expect(merged.sweetness).toBe(2);
  });

  it('merges subsequent partial updates into the overlay', async () => {
    await setProductAttrs(id, { energy_level: 'high', sweetness: 2 });
    await setProductAttrs(id, { temperature: 'cold' });
    const merged = getProductAttrs(p(id));
    expect(merged.energy_level).toBe('high'); // preserved
    expect(merged.sweetness).toBe(2);          // preserved
    expect(merged.temperature).toBe('cold');   // newly added
  });

  it('treats overlay values as authoritative over the product seed', async () => {
    const seeded = { ...p(id), energy_level: 'low' as const, sweetness: 5 };
    await setProductAttrs(id, { energy_level: 'high' });
    const merged = getProductAttrs(seeded);
    expect(merged.energy_level).toBe('high'); // overlay wins
    expect(merged.sweetness).toBe(5);         // seed used (no overlay)
  });

  it('returns nulls / empty arrays when neither overlay nor seed has a value', () => {
    const merged = getProductAttrs(p(id));
    expect(merged.energy_level).toBe(null);
    expect(merged.sweetness).toBe(null);
    expect(merged.temperature).toBe(null);
    expect(merged.caffeine_mg).toBe(null);
    expect(merged.tags_en).toEqual([]);
    expect(merged.tags_ar).toEqual([]);
  });

  it('writes tag arrays as a single replace, not an append', async () => {
    await setProductAttrs(id, { tags_en: ['creamy', 'sweet'] });
    await setProductAttrs(id, { tags_en: ['bitter'] });
    const merged = getProductAttrs(p(id));
    expect(merged.tags_en).toEqual(['bitter']);
  });
});
