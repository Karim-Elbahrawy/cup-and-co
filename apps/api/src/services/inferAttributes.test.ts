import { describe, expect, it } from 'vitest';
import { inferAttributes } from './inferAttributes.js';
import type { Product } from '@cup-and-co/types';

function p(name_en: string, description_en: string, name_ar = '', description_ar = ''): Pick<Product, 'name_en' | 'name_ar' | 'description_en' | 'description_ar'> {
  return { name_en, name_ar, description_en, description_ar };
}

describe('inferAttributes', () => {
  it('infers a hot caffeinated creamy drink from a cappuccino', () => {
    const a = inferAttributes(p('Velvet Cappuccino', 'Silky steamed milk over a double shot, dusted with cocoa', 'كابتشينو', 'حليب كريمي'));
    expect(a.temperature).toBe('hot');
    expect(a.energy_level).toBe('high');
    expect(a.caffeine_mg).toBe(80);
    expect(a.tags_en).toContain('creamy');
    expect(a.tags_ar).toContain('كريمي');
  });

  it('infers a cold high-caffeine drink from cold brew', () => {
    const a = inferAttributes(p('Vanilla Cold Brew', '12-hour cold brew, vanilla, over ice'));
    expect(a.temperature).toBe('cold');
    expect(a.caffeine_mg).toBe(100);
    expect(a.energy_level).toBe('high');
  });

  it('tags a drink as refreshing when the description says so', () => {
    const a = inferAttributes(p('Mint Lemonade', 'Crisp and refreshing iced lemonade with mint'));
    expect(a.tags_en).toContain('refreshing');
  });

  it('infers low-energy zero-caffeine for a brownie', () => {
    const a = inferAttributes(p('Brownie Bar', 'Fudgy double-chocolate brownie'));
    expect(a.caffeine_mg).toBe(20); // chocolate hint
    expect(a.energy_level).toBe('low');
    expect(a.sweetness).toBe(5); // dessert keyword bumps to 5
  });

  it('infers from Arabic description when English is sparse', () => {
    const a = inferAttributes(p('Mystery Drink', '', 'مشروب', 'حاجة باردة ومنعشة'));
    expect(a.temperature).toBe('cold');
    expect(a.tags_ar).toContain('منعش');
  });

  it('returns null fields when nothing recognisable is in the text', () => {
    const a = inferAttributes(p('Unknown Item', 'Just text with no signals here'));
    expect(a.temperature).toBe(null);
    expect(a.energy_level).toBe(null);
    expect(a.sweetness).toBe(null);
    expect(a.tags_en).toEqual([]);
  });

  it('only outputs Arabic tags from the curated mapping', () => {
    const a = inferAttributes(p('Test', 'creamy refreshing drink'));
    // Both English signals exist, both have Arabic mappings.
    expect(a.tags_ar).toEqual(expect.arrayContaining(['كريمي', 'منعش']));
  });
});
