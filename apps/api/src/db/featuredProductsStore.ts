/**
 * Phase K4.7 — featured products store.
 *
 * Admin-mutable set of product IDs marked "feature today". Read by the
 * /catalog handler to merge `is_featured_today` onto each product, and
 * by the kiosk to render the first match as a hero card on the catalog
 * "All" tab.
 *
 * In-memory and process-local for now. Persisted to Supabase later when
 * the admin needs the flag to survive restarts.
 */

const featured = new Set<string>();

export function isFeatured(productId: string): boolean {
  return featured.has(productId);
}

export function setFeatured(productId: string, value: boolean): void {
  if (value) featured.add(productId);
  else featured.delete(productId);
}

export function listFeatured(): string[] {
  return Array.from(featured);
}

/** Test-only — used by the test suite to reset between describe blocks. */
export function clearFeatured(): void {
  featured.clear();
}
