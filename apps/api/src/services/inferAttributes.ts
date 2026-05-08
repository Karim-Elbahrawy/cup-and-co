/**
 * Auto-infer concierge attributes from a product's name + description.
 *
 * Uses the SAME bilingual keyword dictionary as the concierge matcher, applied
 * in reverse: instead of matching a user query against products, we match a
 * product's text against the dictionary to extract its attributes.
 *
 * This guarantees consistency — if Cup AI knows "بارد" means cold for queries,
 * it knows "بارد" in a product description means the product is cold.
 *
 * The admin UI calls this via POST /admin/menu/products/:id/auto-detect-attrs
 * and shows the inferred values pre-filled, ready for one-click save.
 *
 * Pure function. Zero external calls. Free.
 */

import type { Product } from '@cup-and-co/types';
import { extractSignals } from './concierge.js';

export interface InferredAttributes {
  energy_level: 'low' | 'medium' | 'high' | null;
  sweetness: number | null;
  temperature: 'hot' | 'cold' | 'both' | null;
  caffeine_mg: number | null;
  tags_en: string[];
  tags_ar: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Caffeine heuristics — keyed off recognisable drink-class words.
// Returns the rough mg estimate the matcher will use to score "energising"
// vs "no caffeine" queries.
// ─────────────────────────────────────────────────────────────────────────────

const CAFFEINE_HINTS: Array<{ patterns: RegExp; mg: number }> = [
  { patterns: /espresso|إسبريسو|اسبريسو|ristretto|ريستريتو/i, mg: 120 },
  { patterns: /cold\s*brew|كولد\s*برو/i, mg: 100 },
  { patterns: /americano|أمريكانو|امريكانو/i, mg: 100 },
  { patterns: /macchiato|ماكياتو|cappuccino|كابتشينو|latte|لاتيه|mocha|موكا|flat\s*white|فلات\s*وايت/i, mg: 80 },
  { patterns: /matcha|ماتشا/i, mg: 70 },
  { patterns: /coffee|قهوة|كافيه/i, mg: 80 },
  { patterns: /tea|شاي/i, mg: 40 },
  { patterns: /chai|شاي\s*ماسالا/i, mg: 50 },
  { patterns: /decaf|بدون\s*كافيين|من\s*غير\s*كافيين/i, mg: 5 },
  { patterns: /chocolate|شوكولا/i, mg: 20 },
  // Everything else (juices, food, desserts) defaults to 0.
];

function inferCaffeine(text: string): number | null {
  for (const { patterns, mg } of CAFFEINE_HINTS) {
    if (patterns.test(text)) return mg;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sweetness numeric mapping — the matcher uses 0-5; signals are coarse buckets.
// We bias by descriptive words present.
// ─────────────────────────────────────────────────────────────────────────────

function inferSweetness(text: string, signal: 'none' | 'low' | 'high' | null): number | null {
  if (signal === 'none') return 0;
  if (signal === 'low') return 2;
  if (signal === 'high') {
    // Distinguish "indulgent dessert" (5) from "lightly sweet latte" (3-4).
    if (/dessert|cake|brownie|tiramisu|cheesecake|tart|cinnamon|حلوي|تيراميسو|تشيز\s*كيك|براوني/i.test(text)) return 5;
    return 4;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Energy fallback — if no explicit signal, derive from caffeine estimate.
// ─────────────────────────────────────────────────────────────────────────────

function inferEnergy(
  signal: 'low' | 'medium' | 'high' | null,
  caffeine: number | null,
): 'low' | 'medium' | 'high' | null {
  if (signal) return signal;
  if (caffeine == null) return null;
  if (caffeine >= 80) return 'high';
  if (caffeine >= 40) return 'medium';
  return 'low';
}

// ─────────────────────────────────────────────────────────────────────────────
// Public entry point
// Caller passes a Product (or partial — only name + description are read)
// and gets back the best-effort attribute set. Empty/null fields mean
// "I'm not confident — leave whatever the admin set previously."
// ─────────────────────────────────────────────────────────────────────────────

export function inferAttributes(input: Pick<Product, 'name_en' | 'name_ar' | 'description_en' | 'description_ar'>): InferredAttributes {
  const enText = `${input.name_en ?? ''} ${input.description_en ?? ''}`.trim();
  const arText = `${input.name_ar ?? ''} ${input.description_ar ?? ''}`.trim();
  const combined = `${enText} ${arText}`.trim();

  // Run the matcher's signal extractor on each language separately so we
  // don't lose intent that lives only in one description.
  const enSignals = extractSignals(enText);
  const arSignals = extractSignals(arText);

  // Merge: prefer explicit signals from either side; English wins on ties
  // because the underlying dictionary is broader.
  const temperature = enSignals.temperature ?? arSignals.temperature ?? null;
  const sweetnessSig = enSignals.sweetness ?? arSignals.sweetness ?? null;
  const energySig    = enSignals.energy ?? arSignals.energy ?? null;

  const caffeine_mg = inferCaffeine(combined);
  const sweetness   = inferSweetness(combined, sweetnessSig);
  const energy_level = inferEnergy(energySig, caffeine_mg);

  // Tag union, deduped. We pick a sensible Arabic equivalent for English
  // tags so admins editing only the English description still get bilingual
  // tags out the door.
  const tagSet = new Set<string>([...enSignals.tags, ...arSignals.tags]);
  const tags_en = Array.from(tagSet);
  const tags_ar = tags_en.map(toArabicTag).filter(Boolean) as string[];

  return {
    energy_level,
    sweetness,
    temperature,
    caffeine_mg,
    tags_en,
    tags_ar,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// English → Arabic tag mapping for the small, fixed descriptor vocabulary
// the matcher knows about. Anything not in the map is dropped from tags_ar
// so we never write garbage Arabic.
// ─────────────────────────────────────────────────────────────────────────────

const TAG_AR: Record<string, string> = {
  refreshing: 'منعش',
  creamy: 'كريمي',
  nutty: 'بالمكسرات',
  fruity: 'فواكه',
};

function toArabicTag(en: string): string | null {
  return TAG_AR[en] ?? null;
}
