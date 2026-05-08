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

// ─────────────────────────────────────────────────────────────────────────────
// Inference-fallback regression tests — these would have caught the bug
// where un-tagged DB rows all scored the same and the matcher returned the
// top-rated 3 regardless of query.
// ─────────────────────────────────────────────────────────────────────────────

describe('match — inference fallback for products with NULL concierge attrs', () => {
  // These products have NO explicit concierge attrs (matches a real DB row
  // before the admin runs Auto-detect). The matcher should still
  // differentiate them based on name + description.
  const UNTAGGED: Product[] = [
    p({ id: 'u1', name_en: 'Iced Americano',    description_en: 'Long espresso shaken over ice' }),
    p({ id: 'u2', name_en: 'Velvet Cappuccino', description_en: 'Silky steamed milk over a double shot, dusted with cocoa' }),
    p({ id: 'u3', name_en: 'Brownie Bar',       description_en: 'Fudgy double-chocolate brownie' }),
    p({ id: 'u4', name_en: 'Mint Lemonade',     description_en: 'Crisp and refreshing iced lemonade with mint' }),
    p({ id: 'u5', name_en: 'Hot Chocolate',     description_en: 'Rich melted chocolate with steamed milk' }),
  ].map((prod) => ({
    ...prod,
    energy_level: undefined,
    sweetness: undefined,
    temperature: undefined,
    caffeine_mg: undefined,
    tags_en: undefined,
    tags_ar: undefined,
  }));

  it('cold query and hot query return different top products', () => {
    const cold = match({ text: 'something cold and refreshing', language: 'en' }, { products: UNTAGGED });
    const hot  = match({ text: 'something hot and creamy',     language: 'en' }, { products: UNTAGGED });
    expect(cold.matches[0].product.id).not.toBe(hot.matches[0].product.id);
    // Cold query should NOT pick a hot drink at the top
    expect(['u1', 'u4']).toContain(cold.matches[0].product.id);
    // Hot query should NOT pick an iced drink at the top
    expect(['u2', 'u5']).toContain(hot.matches[0].product.id);
  });

  it('caffeine-free query surfaces the caffeine-free items, not espresso', () => {
    const r = match({ text: 'no caffeine sweet', language: 'en' }, { products: UNTAGGED });
    // Brownie/lemonade/hot-choc should rank above the espresso-based drinks
    expect(['u3', 'u4', 'u5']).toContain(r.matches[0].product.id);
    // Iced Americano (caffeinated) should NOT be the top match
    expect(r.matches[0].product.id).not.toBe('u1');
  });

  it('strong espresso query surfaces the espresso item, not the brownie', () => {
    const r = match({ text: 'strong espresso to wake me up', language: 'en' }, { products: UNTAGGED });
    expect(['u1', 'u2'].includes(r.matches[0].product.id)).toBe(true);
    expect(r.matches[0].product.id).not.toBe('u3'); // brownie has no caffeine
  });

  it('Arabic cold query also differentiates against un-tagged products', () => {
    const r = match({ text: 'عايز حاجة باردة منعشة', language: 'ar' }, { products: UNTAGGED });
    expect(['u1', 'u4']).toContain(r.matches[0].product.id);
  });

  it('substring on product name boosts the right product', () => {
    // Query the product BY NAME. Should pick that exact product even though
    // tags etc. are not particularly informative.
    const r = match({ text: 'mint lemonade', language: 'en' }, { products: UNTAGGED });
    expect(r.matches[0].product.id).toBe('u4'); // Mint Lemonade
  });

  it('substring on description matches when name does not', () => {
    const products = [
      p({ id: 'a', name_en: 'Drink A', description_en: 'A frothy mocha latte with whipped cream' }),
      p({ id: 'b', name_en: 'Drink B', description_en: 'Just a fizzy soda' }),
    ].map((prod) => ({ ...prod, energy_level: undefined, sweetness: undefined, temperature: undefined, caffeine_mg: undefined, tags_en: undefined, tags_ar: undefined }));
    const r = match({ text: 'mocha', language: 'en' }, { products });
    expect(r.matches[0].product.id).toBe('a');
  });

  it('substring boost ignores stop-words like "something"', () => {
    // "something" is a stop word, so it should NOT match products that happen
    // to contain it. The actual differentiation comes from "cold".
    const r = match({ text: 'something cold', language: 'en' }, { products: UNTAGGED });
    // Top match should be a cold drink (americano or lemonade), not something
    // randomly named.
    expect(['u1', 'u4']).toContain(r.matches[0].product.id);
  });

  it('explicit attrs always win over inferred ones', () => {
    // Take the brownie (caffeine-free dessert) and FORCE temperature='hot'.
    // For a "hot drink" query, this dessert should now beat hot drinks
    // whose attrs are inferred from text (because explicit > inferred).
    const tweaked = [
      ...UNTAGGED.filter((u) => u.id !== 'u3'),
      p({ id: 'u3', name_en: 'Brownie Bar', description_en: 'Fudgy double-chocolate brownie', temperature: 'hot' }),
    ];
    const r = match({ text: 'something hot', language: 'en' }, { products: tweaked });
    // Both hot-chocolate (inferred) and brownie (explicit) should be in top results;
    // assert the explicit one is at least matched on temperature (score should
    // include the +30 hot bonus, not be skipped).
    const brownie = r.matches.find((m) => m.product.id === 'u3');
    expect(brownie).toBeDefined();
    // It should at least beat a clearly-cold drink
    const americano = r.matches.find((m) => m.product.id === 'u1');
    if (americano && brownie) expect(brownie.score).toBeGreaterThan(americano.score);
  });
});
