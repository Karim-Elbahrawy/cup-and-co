/**
 * Product stock repository — Phase 3.2 of UPGRADE-PLAN.md.
 *
 * Lightweight inventory state. Two flags per product:
 *   - is_out_of_stock        — staff toggle
 *   - out_of_stock_until     — optional auto-clear timestamp
 *
 * In-memory Map for the dev/demo path. Production swap is one file
 * change — replace the Map with Supabase reads/writes against the
 * `products.is_out_of_stock` + `products.out_of_stock_until` columns
 * added by migration `0007_product_inventory.sql`.
 *
 * The auto-clear is normally handled by the daily Postgres cron
 * (`select clear_expired_stock_holds()`), but the in-memory path
 * checks the timestamp at read time too so dev flows work without
 * a cron.
 */

export interface ProductStockState {
  is_out_of_stock: boolean;
  out_of_stock_until: string | null;
}

const stockState = new Map<string, ProductStockState>();

export function getProductStock(productId: string): ProductStockState {
  const entry = stockState.get(productId);
  if (!entry) return { is_out_of_stock: false, out_of_stock_until: null };
  // Honor auto-clear at read time (cheap, idempotent).
  if (entry.is_out_of_stock && entry.out_of_stock_until) {
    if (new Date(entry.out_of_stock_until) < new Date()) {
      stockState.delete(productId);
      return { is_out_of_stock: false, out_of_stock_until: null };
    }
  }
  return { ...entry };
}

export function setProductStock(
  productId: string,
  state: { is_out_of_stock: boolean; out_of_stock_until?: string | null },
): ProductStockState {
  if (!state.is_out_of_stock) {
    stockState.delete(productId);
    return { is_out_of_stock: false, out_of_stock_until: null };
  }
  const next: ProductStockState = {
    is_out_of_stock: true,
    out_of_stock_until: state.out_of_stock_until ?? null,
  };
  stockState.set(productId, next);
  return next;
}

export function isProductOutOfStock(productId: string): boolean {
  return getProductStock(productId).is_out_of_stock;
}

/** Clear all expired holds. Returns the number cleared. */
export function clearExpiredStockHolds(): number {
  let cleared = 0;
  const now = new Date();
  for (const [id, entry] of stockState.entries()) {
    if (entry.is_out_of_stock && entry.out_of_stock_until && new Date(entry.out_of_stock_until) < now) {
      stockState.delete(id);
      cleared += 1;
    }
  }
  return cleared;
}
