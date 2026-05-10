/**
 * Phase K4.7 — featured products store.
 *
 * Admin-mutable set of product IDs marked "feature today". Read by the
 * /catalog handler to merge `is_featured_today` onto each product, and
 * by the kiosk to render the first match as a hero card on the catalog
 * "All" tab.
 *
 * Persistence (SHIP-PLAN Phase 2.1):
 *   - In-memory `Set<productId>` is the hot cache (catalog hot-path
 *     reads `isFeatured(id)` synchronously per product).
 *   - When SUPABASE is configured, the Set hydrates lazily on first
 *     read from the `featured_products` table, and every setFeatured
 *     mirrors back fire-and-forget. Survives a Render redeploy.
 *   - When SUPABASE is unset (dev / vitest), the Set IS the truth.
 */
import { config } from '../config.js';
import { getServiceClient } from './supabase.js';

const featured = new Set<string>();

let hydrated = false;
let hydratePromise: Promise<void> | null = null;

function isSupabaseReady(): boolean {
  return !!(
    config.supabase.serviceRoleKey &&
    config.supabase.url &&
    !config.supabase.url.includes('127.0.0.1:54321')
  );
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
      const { data, error } = await sb.from('featured_products').select('product_id');
      if (error) throw error;
      for (const row of (data ?? []) as { product_id: string }[]) {
        featured.add(row.product_id);
      }
      hydrated = true;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[featuredProductsStore] hydrate failed:', err);
      hydrated = true;
    } finally {
      hydratePromise = null;
    }
  })();
  return hydratePromise;
}

function persistAdd(productId: string): void {
  if (!isSupabaseReady()) return;
  const sb = getServiceClient();
  void sb
    .from('featured_products')
    .upsert({ product_id: productId, set_at: new Date().toISOString() }, { onConflict: 'product_id' })
    .then(({ error }) => {
      if (error) {
        // eslint-disable-next-line no-console
        console.error('[featuredProductsStore] persist add failed:', error.message);
      }
    });
}

function persistRemove(productId: string): void {
  if (!isSupabaseReady()) return;
  const sb = getServiceClient();
  void sb
    .from('featured_products')
    .delete()
    .eq('product_id', productId)
    .then(({ error }) => {
      if (error) {
        // eslint-disable-next-line no-console
        console.error('[featuredProductsStore] persist remove failed:', error.message);
      }
    });
}

export function isFeatured(productId: string): boolean {
  void hydrateOnce();
  return featured.has(productId);
}

export function setFeatured(productId: string, value: boolean): void {
  void hydrateOnce();
  if (value) {
    featured.add(productId);
    persistAdd(productId);
  } else {
    featured.delete(productId);
    persistRemove(productId);
  }
}

export function listFeatured(): string[] {
  void hydrateOnce();
  return Array.from(featured);
}

/** Test-only — used by the test suite to reset between describe blocks. */
export function clearFeatured(): void {
  featured.clear();
  hydrated = false;
  hydratePromise = null;
}
