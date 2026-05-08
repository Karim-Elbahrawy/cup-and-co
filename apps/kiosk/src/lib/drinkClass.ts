/**
 * Pure helper that maps a product to a "drink class" — the visual archetype
 * the K2.1 DrinkBuilder uses to pick which layered SVG to render.
 *
 * We classify by category slug first, then fall back to name keyword
 * matching so a missing or unknown category doesn't strand us on the
 * static hero. The classification is deliberately conservative: if we
 * can't be confident, we return 'unknown' and the DrinkBuilder degrades
 * to the existing static product image.
 *
 * Drink classes:
 *   - hot_milk    espresso + steamed milk + (optional foam/syrup/whip)
 *                 covers cappuccino, latte, mocha, flat white, etc.
 *   - cold_coffee tall glass + ice + coffee + (optional milk/whip)
 *                 covers cold brew, iced americano, iced latte, etc.
 *   - espresso    single small cup, espresso only
 *                 covers espresso romano, ristretto, etc.
 *   - tea         translucent cup of tea, optional milk
 *   - blended     thick blended drink, ice cream-style
 *   - unknown     fall back to static product image
 */

import type { Product, Category } from '@cup-and-co/types';

export type DrinkClass =
  | 'hot_milk'
  | 'cold_coffee'
  | 'espresso'
  | 'tea'
  | 'blended'
  | 'unknown';

/**
 * Category slugs from supabase/seed.sql + apps/api/src/db/catalogRepo.ts.
 * Keep this list in sync with the source-of-truth seed data.
 */
const CATEGORY_TO_CLASS: Record<string, DrinkClass> = {
  hot_coffee: 'espresso',
  cold_coffee: 'cold_coffee',
  milk_coffee: 'hot_milk',
  hot_teas: 'tea',
  hot_drinks: 'hot_milk',
  blended: 'blended',
  // Everything else falls through to keyword-matching below.
  desserts: 'unknown',
  breakfast: 'unknown',
};

/**
 * Name-based classifier — used when category slug is missing or maps to
 * 'unknown'. Order matters: we check the most specific terms first to
 * avoid mis-classing "iced cappuccino" as 'hot_milk'.
 */
function classifyByName(name: string): DrinkClass {
  const lower = name.toLowerCase();

  // Cold-first overrides — many cold drinks contain milk + coffee words.
  if (
    /\bcold[\s-]?brew\b|\biced\b|\bfrappe?\b|\bcold\b/.test(lower)
  ) {
    return 'cold_coffee';
  }

  // Blended (smoothies, frappuccinos)
  if (/\bblended\b|\bsmoothie\b|\bfrappuccino\b/.test(lower)) {
    return 'blended';
  }

  // Tea
  if (/\btea\b|\bmatcha\b|\bchai\b|\bearl[\s-]?grey\b/.test(lower)) {
    return 'tea';
  }

  // Espresso shots
  if (/\bespresso\b|\bristretto\b|\bromano\b|\bmacchiato\b/.test(lower)) {
    // Macchiato is small + topped with milk foam — render as hot_milk
    // since the foam dome is the visual focus, not a bare espresso shot.
    if (lower.includes('macchiato')) return 'hot_milk';
    return 'espresso';
  }

  // Hot milk drinks
  if (
    /\bcappuccino\b|\blatte\b|\bmocha\b|\bflat[\s-]?white\b|\bhot[\s-]?chocolate\b/.test(lower)
  ) {
    return 'hot_milk';
  }

  return 'unknown';
}

/** Resolve a product → its drink class. */
export function drinkClassFor(
  product: Pick<Product, 'name_en' | 'category_id'>,
  categories: Category[],
): DrinkClass {
  const category = categories.find((c) => c.id === product.category_id);
  if (category) {
    const fromCat = CATEGORY_TO_CLASS[category.slug];
    if (fromCat && fromCat !== 'unknown') return fromCat;
  }
  return classifyByName(product.name_en);
}

/**
 * Extract a hint about a single option group from the selected option
 * name. Used by the DrinkBuilder to drive layer visibility.
 *
 * Lenient matching: 'Less ice' / 'No ice' / 'Extra ice' / 'مفيش تلج' all
 * map to a normalized boolean/level so the SVG only needs to know
 * 'should I draw ice cubes? if so, how many?'.
 */
export function iceLevel(optionName: string | undefined): 'none' | 'less' | 'normal' | 'extra' {
  if (!optionName) return 'normal';
  const lower = optionName.toLowerCase();
  if (/\bno\b|none|without|من غير|بدون|مفيش/.test(lower)) return 'none';
  if (/\bless\b|light|قليل/.test(lower)) return 'less';
  if (/\bextra\b|more|زيادة/.test(lower)) return 'extra';
  return 'normal';
}

export function hasWhippedCream(extras: string | undefined): boolean {
  if (!extras) return false;
  const lower = extras.toLowerCase();
  return /whipped|whip|كريمة/.test(lower);
}

/** Cup width factor by size — Small 0.86, Medium 1.0, Large 1.12. */
export function sizeScale(size: string | undefined): number {
  if (!size) return 1;
  const lower = size.toLowerCase();
  if (/\bsmall\b|\bs\b|صغير/.test(lower)) return 0.86;
  if (/\blarge\b|\bxl\b|\bl\b|كبير/.test(lower)) return 1.12;
  return 1;
}

/** Approximate syrup tint for a milk drink. */
export function syrupTint(syrup: string | undefined): string | null {
  if (!syrup) return null;
  const lower = syrup.toLowerCase();
  if (/caramel|كراميل/.test(lower)) return '#A85A0E';
  if (/vanilla|فانيليا/.test(lower)) return '#E5C47C';
  if (/hazelnut|بندق/.test(lower)) return '#7A4523';
  if (/honey|عسل/.test(lower)) return '#C68910';
  if (/chocolate|mocha|شوكولاتة|موكا/.test(lower)) return '#3E2218';
  return null;
}

/** Approximate milk tint based on milk choice. */
export function milkTint(milk: string | undefined): string {
  if (!milk) return '#F5EFDD';
  const lower = milk.toLowerCase();
  if (/oat|شوفان/.test(lower)) return '#EBDFB7';
  if (/almond|لوز/.test(lower)) return '#EFE3C7';
  if (/soy|صويا/.test(lower)) return '#F1E7CF';
  if (/skim|low-fat|قليل الدسم/.test(lower)) return '#FBF6E7';
  return '#F5EFDD'; // whole milk default
}
