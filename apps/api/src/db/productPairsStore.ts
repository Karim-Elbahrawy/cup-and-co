/**
 * Phase K4.9 — "Complete the combo" pairing store.
 *
 * Two layers:
 *   1. Curated defaults by category — every product gets a sensible
 *      starter set of pairings without admin lift. A latte gets brownie
 *      + croissant; a cold brew gets açaí bowl + granola bowl; espresso
 *      gets tiramisu + chocolate tart. The cafe operator can tune
 *      this per product later, but defaults are good enough day one.
 *   2. Admin per-product overrides — a Map<productId, string[]> that
 *      replaces the default for that specific product when set. We
 *      replace rather than union so the operator can NARROW the list
 *      ("don't suggest cinnamon rolls with my Hazelnut Latte"). Empty
 *      array is a valid override that means "no pairings for this".
 *
 * In-memory and process-local for now. Persisted to Supabase later.
 */

/**
 * Curated default pairs by category SLUG. Values are PRODUCT slug-like
 * partial-id markers — see `defaultsForProduct` for the lookup.
 *
 * Keep names readable; the actual catalog product IDs are uuids and we
 * match against name_en suffixes so this map survives id reshuffles.
 */
const DEFAULT_PAIR_NAMES_BY_CATEGORY: Record<string, string[]> = {
  hot_coffee: ['Tiramisu Cup', 'Chocolate Tart'],
  cold_coffee: ['Acai Bowl', 'Granola Bowl'],
  milk_coffee: ['Brownie Bar', 'Almond Croissant'],
  hot_teas: ['Cinnamon Roll', 'Almond Croissant'],
  hot_drinks: ['Brownie Bar', 'Cinnamon Roll'],
  blended: ['Acai Bowl', 'Brownie Bar'],
  // Pairing for desserts and breakfast doesn't make sense — a customer
  // who already added a brownie isn't looking for another dessert; we
  // want the pair only to upsell from a drink to a snack/meal.
  desserts: [],
  breakfast: [],
};

/** Admin per-product overrides — replaces the default when set. */
const overrides = new Map<string, string[]>();

export function setPairs(productId: string, pairs: string[]): void {
  overrides.set(productId, pairs);
}

export function clearPairs(productId: string): void {
  overrides.delete(productId);
}

export function getOverride(productId: string): string[] | undefined {
  return overrides.get(productId);
}

/** Test helper — wipes all overrides between describe blocks. */
export function resetPairsForTests(): void {
  overrides.clear();
}

/**
 * Resolve the default pairings for a product against the live catalog.
 * Returns IDs of products that:
 *   - belong to the curated default-name list for the source's category
 *   - exist in the live catalog
 *   - are still available
 *
 * If `overrides` has an entry for this product we honor it instead.
 */
export function defaultsForProduct(
  productId: string,
  productCategorySlug: string | null,
  allProducts: Array<{ id: string; name_en: string; is_available: boolean }>,
): string[] {
  // 1. Override path — admin set explicit IDs for this product.
  const explicit = overrides.get(productId);
  if (explicit !== undefined) {
    return explicit.filter((id) => {
      const target = allProducts.find((p) => p.id === id);
      return target?.is_available;
    });
  }

  // 2. Default path — match curated name list against the catalog.
  if (!productCategorySlug) return [];
  const names = DEFAULT_PAIR_NAMES_BY_CATEGORY[productCategorySlug] ?? [];
  return names
    .map((name) =>
      allProducts.find(
        (p) =>
          p.is_available &&
          p.name_en.toLowerCase() === name.toLowerCase(),
      ),
    )
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .map((p) => p.id);
}
