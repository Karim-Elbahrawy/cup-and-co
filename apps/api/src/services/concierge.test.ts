import { describe, expect, it } from 'vitest';
import { extractSignals, match } from './concierge.js';
import type { Product } from '@cup-and-co/types';

// Minimal product factory — mirrors the FALLBACK shape but with concierge attributes.
function p(overrides: Partial<Product> & { id: string; name_en: string }): Product {
  return {
    category_id: 'cat-1',
    name_ar: overrides.name_en,
    description_en: '',
    description_ar: '',
    base_price_egp: 60,
    image_url: '',
    prep_minutes: 5,
    is_available: true,
    sort_order: 0,
    rating_avg: 4.7,
    rating_count: 0,
    stock_count: null,
    review_mode: 'full',
    ...overrides,
  } as Product;
}

const FIXTURES: Product[] = [
  p({ id: '1', name_en: 'Iced Americano',     temperature: 'cold', energy_level: 'high', sweetness: 0, caffeine_mg: 100, tags_en: ['refreshing', 'bitter'] }),
  p({ id: '2', name_en: 'Caramel Macchiato',  temperature: 'hot',  energy_level: 'high', sweetness: 4, caffeine_mg: 80,  tags_en: ['creamy', 'sweet'] }),
  p({ id: '3', name_en: 'Brownie Bar',        temperature: 'cold', energy_level: 'low',  sweetness: 5, caffeine_mg: 0,   tags_en: ['sweet', 'chocolate'] }),
  p({ id: '4', name_en: 'Avocado Toast',      temperature: 'cold', energy_level: 'medium', sweetness: 0, caffeine_mg: 0, tags_en: ['savoury'] }),
  p({ id: '5', name_en: 'Velvet Cappuccino',  temperature: 'hot',  energy_level: 'high', sweetness: 1, caffeine_mg: 80,  tags_en: ['creamy'] }),
];

describe('extractSignals', () => {
  it('parses English temperature words', () => {
    expect(extractSignals('something cold and refreshing').temperature).toBe('cold');
    expect(extractSignals('a hot drink please').temperature).toBe('hot');
  });

  it('parses Arabic temperature words', () => {
    expect(extractSignals('عايز حاجة باردة').temperature).toBe('cold');
    expect(extractSignals('قهوة ساخنة').temperature).toBe('hot');
  });

  it('parses sweetness intent in both languages', () => {
    expect(extractSignals('no sugar coffee').sweetness).toBe('none');
    expect(extractSignals('بدون سكر').sweetness).toBe('none');
    expect(extractSignals('not too sweet').sweetness).toBe('low');
    expect(extractSignals('something very sweet with caramel').sweetness).toBe('high');
  });

  it('parses energy / caffeine intent', () => {
    expect(extractSignals('something to wake me up').energy).toBe('high');
    expect(extractSignals('decaf please').caffeine).toBe('none');
    expect(extractSignals('بدون كافيين').caffeine).toBe('none');
  });

  it('extracts descriptor tags', () => {
    expect(extractSignals('creamy and nutty').tags).toEqual(expect.arrayContaining(['creamy', 'nutty']));
  });

  it('normalises Arabic diacritics and alef variants', () => {
    expect(extractSignals('بـارد').temperature).toBe('cold');
    expect(extractSignals('سـاخن').temperature).toBe('hot');
  });
});

describe('match', () => {
  it('returns at most the requested limit', () => {
    const r = match({ text: 'cold drink', language: 'en' }, { products: FIXTURES, limit: 2 });
    expect(r.matches).toHaveLength(2);
  });

  it('prefers cold drinks when query asks for cold', () => {
    const r = match({ text: 'something cold', language: 'en' }, { products: FIXTURES });
    expect(r.matches[0].product.temperature).toBe('cold');
  });

  it('penalises caffeinated drinks when user asks for no caffeine', () => {
    const r = match({ text: 'no caffeine please, something sweet', language: 'en' }, { products: FIXTURES });
    expect(r.matches[0].product.caffeine_mg).toBe(0);
    expect(r.matches[0].product.id).toBe('3'); // brownie
  });

  it('handles Arabic queries', () => {
    const r = match({ text: 'حاجة منشطة وباردة', language: 'ar' }, { products: FIXTURES });
    const top = r.matches[0].product;
    expect(top.temperature).toBe('cold');
    expect(top.energy_level).toBe('high');
  });

  it('returns reason in the requested language', () => {
    const ar = match({ text: 'باردة وحلوة', language: 'ar' }, { products: FIXTURES });
    const en = match({ text: 'cold and sweet', language: 'en' }, { products: FIXTURES });
    expect(ar.matches[0].reason).not.toBe(ar.matches[0].reasonEn);
    // English reasons are ASCII; Arabic reasons contain Arabic letters.
    expect(/[؀-ۿ]/.test(ar.matches[0].reason)).toBe(true);
    expect(/[؀-ۿ]/.test(en.matches[0].reason)).toBe(false);
  });

  it('reports low confidence when nothing strongly matches', () => {
    const r = match({ text: 'xyz', language: 'en' }, { products: FIXTURES });
    expect(r.confidence).toBe('low');
  });

  it('reports high confidence on a clear query', () => {
    const r = match({ text: 'cold sweet caffeine-free', language: 'en' }, { products: FIXTURES });
    expect(r.confidence).toBe('high');
  });

  it('skips out-of-stock products', () => {
    const withStockOut = [...FIXTURES, p({ id: '6', name_en: 'Sold Out Drink', temperature: 'cold', stock_count: 0 })];
    const r = match({ text: 'cold drink', language: 'en' }, { products: withStockOut });
    expect(r.matches.find((m) => m.product.id === '6')).toBeUndefined();
  });
});
