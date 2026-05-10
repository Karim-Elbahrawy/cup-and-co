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
 * Persistence (SHIP-PLAN Phase 2.1):
 *   - In-memory `Map<productId, string[]>` is the hot cache (catalog
 *     hot-path reads `defaultsForProduct(...)` synchronously per product).
 *   - When SUPABASE is configured, the Map hydrates lazily on first read
 *     from the `product_pairs` table, and every setPairs / clearPairs
 *     mirrors back fire-and-forget. Survives a Render redeploy.
 *   - When SUPABASE is unset (dev / vitest), the Map IS the truth.
 */
import { config } from '../config.js';
import { getServiceClient } from './supabase.js';

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

let hydrated = false;
let hydratePromise: Promise<void> | null = null;

function isSupabaseReady(): boolean {
  return !!(
    config.supabase.serviceRoleKey &&
    config.supabase.url &&
    !config.supabase.url.includes('127.0.0.1:54321')
  );
}

interface ProductPairsRow {
  product_id: string;
  pair_ids: string[];
}

function hydrateOnce(): Promise<void> {
  if (hydrated) return Promise.resolve();
  if (!isSupabaseReady()) {
    hydrated = true;
    return Promise.resolve();
  }
  if (hydratePromise) return hydratePromise;

  hydratePromise = (async () => {
    try {
      const sb = getServiceClient();
      const { data, error } = await sb.from('product_pairs').select('product_id, pair_ids');
      if (error) throw error;
      for (const row of (data ?? []) as ProductPairsRow[]) {
        // Don't clobber a hot-write that landed during hydration.
        if (!overrides.has(row.product_id)) {
          overrides.set(row.product_id, [...(row.pair_ids ?? [])]);
        }
      }
      hydrated = true;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[productPairsStore] hydrate failed:', err);
      hydrated = true;
    } finally {
      hydratePromise = null;
    }
  })();
  return hydratePromise;
}

function persistSet(productId: string, pairs: string[]): void {
  if (!isSupabaseReady()) return;
  const sb = getServiceClient();
  void sb
    .from('product_pairs')
    .upsert(
      { product_id: productId, pair_ids: pairs, updated_at: new Date().toISOString() },
      { onConflict: 'product_id' },
    )
    .then(({ error }) => {
      if (error) {
        // eslint-disable-next-line no-console
        console.error('[productPairsStore] persist set failed:', error.message);
      }
    });
}

function persistDelete(productId: string): void {
  if (!isSupabaseReady()) return;
  const sb = getServiceClient();
  void sb
    .from('product_pairs')
    .delete()
    .eq('product_id', productId)
    .then(({ error }) => {
      if (error) {
        // eslint-disable-next-line no-console
        console.error('[productPairsStore] persist delete failed:', error.message);
      }
    });
}

export function setPairs(productId: string, pairs: string[]): void {
  void hydrateOnce();
  // Defensive copy so callers can't mutate the stored list later.
  overrides.set(productId, [...pairs]);
  persistSet(productId, pairs);
}

export function clearPairs(productId: string): void {
  void hydrateOnce();
  overrides.delete(productId);
  persistDelete(productId);
}

export function getOverride(productId: string): string[] | undefined {
  void hydrateOnce();
  const list = overrides.get(productId);
  // Copy-on-read so caller mutations don't leak into the cache.
  return list ? [...list] : undefined;
}

/** Test helper — wipes all overrides between describe blocks. */
export function resetPairsForTests(): void {
  overrides.clear();
  hydrated = false;
  hydratePromise = null;
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
  void hydrateOnce();

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
