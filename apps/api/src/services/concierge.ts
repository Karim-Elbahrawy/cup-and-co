/**
 * Cup AI Concierge — rule-based matching engine.
 *
 * Takes a free-form query in English or Arabic ("something energising but not
 * too sweet" / "أبغى حاجة منعشة بدون سكر") and returns the best 3 menu matches
 * with a short reasoning string per match.
 *
 * Architecture:
 *   1. Normalise the query (lowercase, strip diacritics, collapse whitespace).
 *   2. Extract intent signals via a bilingual keyword dictionary.
 *   3. Score each available product against the extracted signals.
 *   4. Return the top N with reasons.
 *
 * Zero external calls. Runs in-process. Safe to invoke per-request.
 *
 * The LLM layer (Phase 3, optional) will sit in front of this engine —
 * either to expand the query before matching, or to write a friendlier
 * reply on top of the deterministic matches. The matcher itself never
 * needs to change.
 */

import type { Product } from '@cup-and-co/types';

// ─────────────────────────────────────────────────────────────────────────────
// Public types
// ─────────────────────────────────────────────────────────────────────────────

export type Language = 'en' | 'ar';

export interface ConciergeQuery {
  text: string;
  language: Language;
}

export interface ConciergeMatch {
  product: Product;
  score: number;
  /** Short reason string in the user's language, e.g. "Energising · cold · low sugar". */
  reason: string;
  /** Same reason translated for analytics — always English. */
  reasonEn: string;
}

export interface ConciergeResult {
  matches: ConciergeMatch[];
  /** Echoed back so the UI can show "I heard: cold · low-sugar · energising". */
  understood: ExtractedSignals;
  /**
   * Indicates whether the matcher had high confidence in any signal.
   * Low confidence = the UI may want to show a "tell me more" follow-up.
   */
  confidence: 'low' | 'medium' | 'high';
}

export interface ExtractedSignals {
  temperature: 'hot' | 'cold' | null;
  energy: 'low' | 'medium' | 'high' | null;
  sweetness: 'none' | 'low' | 'high' | null;
  caffeine: 'none' | 'low' | 'high' | null;
  tags: string[];
  /** Whether the user explicitly mentioned a category (e.g. "tea", "dessert"). */
  category: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Bilingual keyword dictionary
// Each entry maps a phrase (regex-safe lowercase) to one signal mutation.
// Order matters only inside the same array — first match wins per group.
// ─────────────────────────────────────────────────────────────────────────────

interface Rule {
  patterns: string[];
  apply: (signals: ExtractedSignals) => void;
}

const RULES: Rule[] = [
  // ── Temperature (English) ──────────────────────────────────────────────
  { patterns: ['cold', 'iced', 'chilled', 'frozen', 'on ice', 'cool '],
    apply: (s) => { s.temperature = 'cold'; } },
  { patterns: ['hot', 'warm', 'steaming', 'piping'],
    apply: (s) => { s.temperature = 'hot'; } },
  // ── Temperature (Arabic) ───────────────────────────────────────────────
  { patterns: ['بارد', 'مثلج', 'مثلّج', 'ساقع', 'بارده', 'بثلج', 'منعش'],
    apply: (s) => { s.temperature = 'cold'; if (!s.tags.includes('refreshing')) s.tags.push('refreshing'); } },
  { patterns: ['ساخن', 'سخن', 'دافي', 'حامي'],
    apply: (s) => { s.temperature = 'hot'; } },

  // ── Energy / caffeine (English) ────────────────────────────────────────
  { patterns: ['energis', 'energiz', 'wake me', 'wake up', 'pick me up', 'strong', 'punchy', 'kick'],
    apply: (s) => { s.energy = 'high'; s.caffeine = 'high'; } },
  { patterns: ['light caffeine', 'mild', 'gentle'],
    apply: (s) => { s.energy = 'medium'; } },
  { patterns: ['decaf', 'no caffeine', 'caffeine free', 'caffeine-free', 'without caffeine', 'calming', 'relaxing', 'before bed'],
    apply: (s) => { s.energy = 'low'; s.caffeine = 'none'; } },
  // ── Energy / caffeine (Arabic) ─────────────────────────────────────────
  { patterns: ['منشط', 'منبه', 'منبّه', 'تقيل', 'ثقيل', 'قوي', 'يصحيني', 'يصحى'],
    apply: (s) => { s.energy = 'high'; s.caffeine = 'high'; } },
  { patterns: ['خفيف', 'خفيفه', 'خفيفة'],
    apply: (s) => { s.energy = 'medium'; } },
  { patterns: ['بدون كافيين', 'من غير كافيين', 'مهدي', 'هادي', 'قبل النوم'],
    apply: (s) => { s.energy = 'low'; s.caffeine = 'none'; } },

  // ── Sweetness (English) ────────────────────────────────────────────────
  { patterns: ['no sugar', 'sugar free', 'sugar-free', 'unsweet', 'without sugar', 'bitter', 'savory', 'savoury'],
    apply: (s) => { s.sweetness = 'none'; } },
  { patterns: ['low sugar', 'less sweet', 'not too sweet', 'lightly sweet'],
    apply: (s) => { s.sweetness = 'low'; } },
  { patterns: ['sweet', 'sugary', 'dessert', 'caramel', 'chocolate', 'vanilla', 'honey', 'syrup'],
    apply: (s) => { if (s.sweetness == null) s.sweetness = 'high'; } },
  // ── Sweetness (Arabic) ─────────────────────────────────────────────────
  // Negations come FIRST so they latch in before the broad "sweet" rule below.
  // The broad rule then guards on `sweetness == null` so it can't overwrite.
  { patterns: ['بدون سكر', 'من غير سكر', 'مر', 'مرّ', 'مرة', 'سادة'],
    apply: (s) => { s.sweetness = 'none'; } },
  { patterns: ['سكر قليل', 'مش حلو قوي', 'مش حلوة قوي', 'سكر خفيف'],
    apply: (s) => { if (s.sweetness == null) s.sweetness = 'low'; } },
  { patterns: ['حلو', 'حلوة', 'سكر', 'كراميل', 'شوكولاتة', 'شوكولاته', 'فانيليا', 'عسل'],
    apply: (s) => { if (s.sweetness == null) s.sweetness = 'high'; } },

  // ── Refreshing / creamy / nutty descriptors ────────────────────────────
  { patterns: ['refresh', 'fresh', 'crisp'],
    apply: (s) => { if (!s.tags.includes('refreshing')) s.tags.push('refreshing'); } },
  { patterns: ['creamy', 'milky', 'silky', 'smooth'],
    apply: (s) => { if (!s.tags.includes('creamy')) s.tags.push('creamy'); } },
  { patterns: ['nutty', 'hazelnut', 'almond', 'pistachio'],
    apply: (s) => { if (!s.tags.includes('nutty')) s.tags.push('nutty'); } },
  { patterns: ['fruity', 'berry', 'citrus', 'lemon'],
    apply: (s) => { if (!s.tags.includes('fruity')) s.tags.push('fruity'); } },
  { patterns: ['كريمي', 'كريمية', 'بالحليب', 'لبن'],
    apply: (s) => { if (!s.tags.includes('creamy')) s.tags.push('creamy'); } },
  { patterns: ['بندق', 'لوز', 'فستق'],
    apply: (s) => { if (!s.tags.includes('nutty')) s.tags.push('nutty'); } },

  // ── Categories ──────────────────────────────────────────────────────────
  { patterns: ['tea', 'شاي'],            apply: (s) => { s.category = 'tea'; } },
  { patterns: ['dessert', 'cake', 'حلوي', 'حلويات', 'تحلية'], apply: (s) => { s.category = 'dessert'; } },
  { patterns: ['breakfast', 'فطور', 'إفطار'], apply: (s) => { s.category = 'breakfast'; } },
  { patterns: ['blended', 'frappe', 'smoothie', 'مخلوط'],     apply: (s) => { s.category = 'blended'; } },
  { patterns: ['coffee', 'قهوة', 'كافيه'], apply: (s) => { /* category stays null — coffee is too broad */ } },
];

// ─────────────────────────────────────────────────────────────────────────────
// Normalisation helpers
// ─────────────────────────────────────────────────────────────────────────────

const ARABIC_DIACRITICS = /[ً-ْٰـ]/g;

function normalise(input: string): string {
  return input
    .toLowerCase()
    .replace(ARABIC_DIACRITICS, '')
    // Unify Arabic alef variants
    .replace(/[آأإ]/g, 'ا')
    // Unify ya/alef-maksura
    .replace(/ى/g, 'ي')
    // Unify hamza forms
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    // Collapse whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// Extraction
// ─────────────────────────────────────────────────────────────────────────────

export function extractSignals(query: string): ExtractedSignals {
  const text = normalise(query);
  const signals: ExtractedSignals = {
    temperature: null,
    energy: null,
    sweetness: null,
    caffeine: null,
    tags: [],
    category: null,
  };

  for (const rule of RULES) {
    for (const pattern of rule.patterns) {
      if (text.includes(normalise(pattern))) {
        rule.apply(signals);
        break;
      }
    }
  }

  return signals;
}

// ─────────────────────────────────────────────────────────────────────────────
// Scoring
// Each match starts at 0 and accumulates points for each signal it satisfies.
// Negative penalties for hard mismatches (e.g. wants cold but only hot exists).
// ─────────────────────────────────────────────────────────────────────────────

function scoreProduct(p: Product, s: ExtractedSignals, normalisedTags: { en: string[]; ar: string[] }): number {
  let score = 0;

  // Temperature
  if (s.temperature && p.temperature) {
    if (p.temperature === s.temperature || p.temperature === 'both') score += 30;
    else score -= 20; // wrong temperature is a strong negative
  }

  // Energy & caffeine
  if (s.energy === 'high' && p.energy_level === 'high') score += 25;
  if (s.energy === 'medium' && p.energy_level === 'medium') score += 15;
  if (s.energy === 'low' && p.energy_level === 'low') score += 25;

  if (s.caffeine === 'none') {
    if (p.caffeine_mg === 0 || p.caffeine_mg == null) score += 20;
    else score -= Math.min(25, p.caffeine_mg / 4); // bigger penalty for stronger drinks
  }
  if (s.caffeine === 'high' && (p.caffeine_mg ?? 0) >= 80) score += 15;

  // Sweetness
  if (typeof p.sweetness === 'number') {
    if (s.sweetness === 'none' && p.sweetness === 0) score += 25;
    if (s.sweetness === 'none' && p.sweetness > 2) score -= 15;
    if (s.sweetness === 'low' && p.sweetness <= 2) score += 20;
    if (s.sweetness === 'high' && p.sweetness >= 3) score += 20;
  }

  // Tags overlap
  const productTagsEn = (p.tags_en ?? []).map((t) => normalise(t));
  const productTagsAr = (p.tags_ar ?? []).map((t) => normalise(t));
  for (const tag of s.tags) {
    if (productTagsEn.includes(tag) || productTagsAr.includes(tag)) score += 12;
  }

  // Category bias (if user explicitly asked for one)
  // We pass the slug via normalisedTags.en[0] (first tag is convention) — see callers.
  if (s.category && normalisedTags.en.includes(`category:${s.category}`)) {
    score += 35;
  } else if (s.category) {
    score -= 8; // mild penalty if wrong category
  }

  // Popularity tie-breaker — well-rated drinks bubble up when scores are close.
  score += (p.rating_avg ?? 4.5) * 1.2;

  return score;
}

// ─────────────────────────────────────────────────────────────────────────────
// Reason builder
// ─────────────────────────────────────────────────────────────────────────────

const REASON_PARTS_EN: Record<string, string> = {
  cold: 'cold',
  hot: 'hot',
  energising: 'energising',
  calming: 'caffeine-free',
  no_sugar: 'no sugar',
  low_sugar: 'lightly sweet',
  sweet: 'indulgent',
  refreshing: 'refreshing',
  creamy: 'creamy',
  nutty: 'nutty',
  fruity: 'fruity',
  popular: 'top-rated',
};

const REASON_PARTS_AR: Record<string, string> = {
  cold: 'بارد',
  hot: 'ساخن',
  energising: 'منشط',
  calming: 'بدون كافيين',
  no_sugar: 'بدون سكر',
  low_sugar: 'سكر خفيف',
  sweet: 'حلو',
  refreshing: 'منعش',
  creamy: 'كريمي',
  nutty: 'بالمكسرات',
  fruity: 'فواكه',
  popular: 'الأعلى تقييماً',
};

function buildReason(p: Product, s: ExtractedSignals, lang: Language): { reason: string; reasonEn: string } {
  const parts: string[] = [];

  if (s.temperature && (p.temperature === s.temperature || p.temperature === 'both')) {
    parts.push(s.temperature);
  }
  if (s.energy === 'high' && p.energy_level === 'high') parts.push('energising');
  if (s.caffeine === 'none' && (p.caffeine_mg === 0 || p.caffeine_mg == null)) parts.push('calming');
  if (s.sweetness === 'none' && p.sweetness === 0) parts.push('no_sugar');
  if (s.sweetness === 'low' && typeof p.sweetness === 'number' && p.sweetness <= 2) parts.push('low_sugar');
  if (s.sweetness === 'high' && typeof p.sweetness === 'number' && p.sweetness >= 3) parts.push('sweet');

  const productTags = [...(p.tags_en ?? []), ...(p.tags_ar ?? [])].map(normalise);
  for (const t of ['refreshing', 'creamy', 'nutty', 'fruity']) {
    if (s.tags.includes(t) && productTags.includes(t)) parts.push(t);
  }

  if (parts.length === 0) parts.push('popular');

  const en = parts.map((k) => REASON_PARTS_EN[k] ?? k).join(' · ');
  const ar = parts.map((k) => REASON_PARTS_AR[k] ?? k).join(' · ');
  return { reason: lang === 'ar' ? ar : en, reasonEn: en };
}

// ─────────────────────────────────────────────────────────────────────────────
// Top-level matcher
// ─────────────────────────────────────────────────────────────────────────────

export interface MatchOptions {
  /** All products to consider. Caller filters by availability/stock. */
  products: Product[];
  /**
   * Map from category_id -> category slug, used to honour explicit category
   * intent (e.g. user said "tea"). Optional; when absent the category bias
   * is skipped silently.
   */
  categorySlugById?: Record<string, string>;
  /** How many results to return. Defaults to 3. */
  limit?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Soft attribute fallback — when a product has null concierge fields (most
// real-world rows until the admin runs Auto-detect on them), infer them from
// the product's own name + description. Admin-set values always win.
//
// This is what makes the matcher actually differentiate products in
// production: without it, every product scores the same (0 signal hits +
// rating tie-breaker) and the matcher just returns the highest-rated 3.
// ─────────────────────────────────────────────────────────────────────────────

const CAFFEINE_HINTS: Array<{ patterns: RegExp; mg: number }> = [
  { patterns: /espresso|إسبريسو|اسبريسو|ristretto|ريستريتو/i, mg: 120 },
  { patterns: /cold\s*brew|كولد\s*برو/i,                       mg: 100 },
  { patterns: /americano|أمريكانو|امريكانو/i,                    mg: 100 },
  { patterns: /matcha|ماتشا/i,                                  mg: 70 },
  { patterns: /macchiato|ماكياتو|cappuccino|كابتشينو|latte|لاتيه|mocha|موكا|flat\s*white|فلات\s*وايت/i, mg: 80 },
  { patterns: /coffee|قهوة|كافيه/i,                              mg: 80 },
  { patterns: /chai|شاي\s*ماسالا/i,                              mg: 50 },
  { patterns: /tea|شاي/i,                                       mg: 40 },
  { patterns: /decaf|بدون\s*كافيين|من\s*غير\s*كافيين/i,           mg: 5 },
  { patterns: /chocolate|شوكولا/i,                              mg: 20 },
];

function inferCaffeine(text: string): number {
  for (const { patterns, mg } of CAFFEINE_HINTS) if (patterns.test(text)) return mg;
  return 0;
}

function inferEnergy(caffeine: number, sweetnessHint: 'none' | 'low' | 'high' | null): 'low' | 'medium' | 'high' {
  if (caffeine >= 80) return 'high';
  if (caffeine >= 40) return 'medium';
  if (sweetnessHint === 'high') return 'low';
  return 'medium';
}

function inferSweetness(text: string, signal: 'none' | 'low' | 'high' | null): number {
  if (signal === 'none') return 0;
  if (signal === 'high') {
    if (/dessert|cake|brownie|tiramisu|cheesecake|tart|cinnamon|حلوي|تيراميسو|تشيز\s*كيك|براوني|كيك|تارت|سينامون/i.test(text)) return 5;
    return 4;
  }
  if (signal === 'low') return 2;
  // Heuristic from drink class
  if (/dessert|cake|brownie|tiramisu|cheesecake|tart|cinnamon|chocolate|caramel|honey|vanilla|mocha|كيك|تارت|سينامون|شوكولاتة|كراميل|عسل|فانيليا|موكا|تيراميسو|براوني/i.test(text)) return 4;
  if (/espresso|americano|cold\s*brew|إسبريسو|أمريكانو|كولد\s*برو/i.test(text)) return 0;
  return 2; // sensible middle for everything else
}

/** Returns a copy of the product with any null concierge fields filled in by
 *  inference from name + description. Cheap (regex on a short string). */
function fillAttributesFromText(p: Product): Product {
  // Fast path: product already has the attributes set explicitly.
  if (
    p.temperature != null &&
    p.energy_level != null &&
    p.caffeine_mg != null &&
    p.sweetness != null &&
    (p.tags_en?.length ?? 0) > 0
  ) {
    return p;
  }

  const enText = `${p.name_en ?? ''} ${p.description_en ?? ''}`.trim();
  const arText = `${p.name_ar ?? ''} ${p.description_ar ?? ''}`.trim();
  const enSignals = extractSignals(enText);
  const arSignals = extractSignals(arText);
  const combined = `${enText} ${arText}`;

  const sweetnessSig = enSignals.sweetness ?? arSignals.sweetness ?? null;
  const caffeineFromText = inferCaffeine(combined);

  return {
    ...p,
    temperature:  p.temperature  ?? enSignals.temperature ?? arSignals.temperature ?? null,
    sweetness:    p.sweetness    ?? inferSweetness(combined, sweetnessSig),
    caffeine_mg:  p.caffeine_mg  ?? caffeineFromText,
    energy_level: p.energy_level ?? inferEnergy(caffeineFromText, sweetnessSig),
    tags_en: (p.tags_en && p.tags_en.length) ? p.tags_en : Array.from(new Set([...enSignals.tags, ...arSignals.tags])),
    tags_ar: (p.tags_ar && p.tags_ar.length) ? p.tags_ar : [],
  };
}

export function match(query: ConciergeQuery, opts: MatchOptions): ConciergeResult {
  const signals = extractSignals(query.text);
  const categoryMap = opts.categorySlugById ?? {};
  const limit = opts.limit ?? 3;

  const scored = opts.products
    .filter((p) => p.is_available && (p.stock_count == null || p.stock_count > 0))
    .map((p) => {
      const slug = categoryMap[p.category_id];
      const normalisedTags = {
        en: slug ? [`category:${slug}`] : [],
        ar: [],
      };
      // Fill in any null concierge attributes from the product's own
      // name/description so the matcher works on un-tagged products too.
      // Admin-set values always win; this is a soft fallback.
      const enriched = fillAttributesFromText(p);
      const score = scoreProduct(enriched, signals, normalisedTags);
      const { reason, reasonEn } = buildReason(enriched, signals, query.language);
      return { product: p, score, reason, reasonEn } satisfies ConciergeMatch;
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  // Confidence: how strong was the top score?
  const top = scored[0]?.score ?? 0;
  const confidence: ConciergeResult['confidence'] =
    top > 60 ? 'high' : top > 30 ? 'medium' : 'low';

  return { matches: scored, understood: signals, confidence };
}
