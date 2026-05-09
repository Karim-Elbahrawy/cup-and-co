/**
 * Top-level category landing structure (per Karim's spec, 2026-05-09).
 *
 * The kiosk's seed catalog has 8 categories (hot_coffee, cold_coffee,
 * milk_coffee, hot_teas, hot_drinks, blended, desserts, breakfast).
 * The customer doesn't think in those buckets — they think:
 *
 *   1. Coffee  (with sub-choice: Hot / Iced / Blended)
 *   2. Drinks  (with sub-choice: Hot / Cold)
 *   3. Breakfast
 *   4. Dessert
 *   5. Herbs
 *
 * So we layer a navigational structure on top of the API's flat
 * categories rather than reshaping the backend. Each group either:
 *   - has `subgroups`, in which case tapping the group reveals the
 *     subgroup picker, OR
 *   - has `categorySlugs` directly, in which case tapping the group
 *     jumps straight to the product list.
 *
 * Mapping is declarative, kiosk-only, easily tunable. A new product
 * category in the seed gets surfaced by adding its slug here — no API
 * change required.
 */

import type { Category, Product } from '@cup-and-co/types';

export type CategoryGroupId =
  | 'coffee'
  | 'drinks'
  | 'breakfast'
  | 'dessert'
  | 'herbs';

export type GroupIconKind =
  | 'coffee'
  | 'glass'
  | 'sandwich'
  | 'cake'
  | 'leaf';

export interface SubGroup {
  id: string;
  label: { en: string; ar: string };
  /** Category slugs from the API to include in this subgroup. */
  categorySlugs: string[];
}

export interface CategoryGroup {
  id: CategoryGroupId;
  label: { en: string; ar: string };
  /** Tone hint — drives card accent color. */
  accent: 'terracotta' | 'teal' | 'cocoa' | 'cream';
  icon: GroupIconKind;
  /** Optional one-line teaser shown under the title. */
  hint: { en: string; ar: string };
  /**
   * Either subgroups (Coffee, Drinks) OR direct slugs (Breakfast, Dessert,
   * Herbs). Never both.
   */
  subgroups?: SubGroup[];
  categorySlugs?: string[];
}

export const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    id: 'coffee',
    label: { en: 'Coffee', ar: 'قهوة' },
    accent: 'terracotta',
    icon: 'coffee',
    hint: { en: 'Hot, iced, blended', ar: 'ساخنة، باردة، مخلوطة' },
    subgroups: [
      {
        id: 'hot',
        label: { en: 'Hot', ar: 'ساخن' },
        categorySlugs: ['hot_coffee', 'milk_coffee'],
      },
      {
        id: 'iced',
        label: { en: 'Iced', ar: 'بارد' },
        categorySlugs: ['cold_coffee'],
      },
      {
        id: 'blended',
        label: { en: 'Blended', ar: 'مخلوط' },
        categorySlugs: ['blended'],
      },
    ],
  },
  {
    id: 'drinks',
    label: { en: 'Drinks', ar: 'مشروبات' },
    accent: 'teal',
    icon: 'glass',
    hint: { en: 'Hot and cold', ar: 'ساخنة وباردة' },
    subgroups: [
      {
        id: 'hot',
        label: { en: 'Hot', ar: 'ساخن' },
        categorySlugs: ['hot_drinks'],
      },
      {
        id: 'cold',
        label: { en: 'Cold', ar: 'بارد' },
        // The seed has no dedicated 'cold_drinks' category; juices and
        // iced tea come through the seasonal-update path. We accept any
        // category whose slug starts with 'cold_' or contains 'juice' /
        // 'iced_tea' here so admin can drop them in without code change.
        // Falls back to nothing when no such product exists today.
        categorySlugs: ['cold_drinks', 'juices', 'iced_teas'],
      },
    ],
  },
  {
    id: 'breakfast',
    label: { en: 'Breakfast', ar: 'فطور' },
    accent: 'cream',
    icon: 'sandwich',
    hint: { en: 'Toasts, bowls, wraps', ar: 'توست، أوعية، راب' },
    categorySlugs: ['breakfast'],
  },
  {
    id: 'dessert',
    label: { en: 'Dessert', ar: 'حلويات' },
    accent: 'cocoa',
    icon: 'cake',
    hint: { en: 'Pastries and sweets', ar: 'حلويات ومعجنات' },
    categorySlugs: ['desserts'],
  },
  {
    id: 'herbs',
    label: { en: 'Herbs', ar: 'أعشاب' },
    accent: 'teal',
    icon: 'leaf',
    hint: { en: 'Tea, matcha, herbal', ar: 'شاي، ماتشا، أعشاب' },
    categorySlugs: ['hot_teas'],
  },
];

/**
 * Resolve the category-id list for a (group, optional subgroup) pair
 * by translating slugs → category UUIDs against the live catalog.
 */
export function categoryIdsFor(
  group: CategoryGroup,
  subgroupId: string | null,
  categories: Category[],
): string[] {
  const slugs = subgroupId
    ? group.subgroups?.find((s) => s.id === subgroupId)?.categorySlugs ?? []
    : group.categorySlugs ?? [];
  if (slugs.length === 0) return [];
  return categories
    .filter((c) => slugs.includes(c.slug))
    .map((c) => c.id);
}

/** Filter a product list down to a (group, subgroup) selection. */
export function productsForSelection(
  products: Product[],
  group: CategoryGroup,
  subgroupId: string | null,
  categories: Category[],
): Product[] {
  const ids = new Set(categoryIdsFor(group, subgroupId, categories));
  if (ids.size === 0) return [];
  return products.filter((p) => ids.has(p.category_id));
}

export function findGroup(id: CategoryGroupId): CategoryGroup | undefined {
  return CATEGORY_GROUPS.find((g) => g.id === id);
}
