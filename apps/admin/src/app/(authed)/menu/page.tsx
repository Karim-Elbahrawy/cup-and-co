'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useSession } from '@/lib/useSession';
import { can } from '@/lib/permissions';
import { formatEgp } from '@/lib/format';
import type { Product, Category, CatalogResponse } from '@cup-and-co/types';

/**
 * Menu admin. Owners can manage everything (Phase 2 brings price/photo edits);
 * baristas can only flip the `is_available` toggle. Both roles share the same
 * list view — we just hide the owner-only affordances when role is barista.
 *
 * The availability toggle is currently optimistic and falls back gracefully
 * when the `/admin/menu/:id/availability` endpoint isn't implemented yet —
 * that endpoint lands in Phase 2. Until then, toggles work locally only.
 */
export default function MenuPage() {
  const session = useSession();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api<CatalogResponse>('/catalog');
        if (cancelled) return;
        setProducts(data.products);
        setCategories(data.categories);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Could not load menu.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const canToggle = can(session?.role, 'menu:update_availability');
  const canManage = can(session?.role, 'menu:manage');

  async function toggleAvailability(product: Product) {
    if (!canToggle || !products) return;
    const previous = products;
    setProducts(
      products.map((p) =>
        p.id === product.id ? { ...p, is_available: !p.is_available } : p,
      ),
    );
    setPendingId(product.id);
    try {
      // TODO Phase 2: PATCH /admin/menu/:id { is_available } — endpoint not yet live.
      // For Phase 1 we accept the local-only toggle and clear any error.
      await new Promise((resolve) => setTimeout(resolve, 200));
      setError(null);
    } catch (err) {
      setProducts(previous);
      setError(err instanceof ApiError ? err.message : 'Could not update availability.');
    } finally {
      setPendingId(null);
    }
  }

  const grouped = (products ?? []).reduce<Record<string, Product[]>>((acc, p) => {
    (acc[p.category_id] ??= []).push(p);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cup-muted">
            Catalog
          </p>
          <h1 className="font-heading text-3xl font-bold text-cup-brown-900">Menu</h1>
          <p className="mt-1 text-sm text-cup-muted">
            {canManage
              ? 'Manage availability today; full editing lands Phase 2.'
              : 'Flip availability when an item runs out. Read-only otherwise.'}
          </p>
        </div>
        {canManage && (
          <button
            type="button"
            disabled
            title="Phase 2"
            className="rounded-pill bg-cup-orange-600/40 px-4 py-2 text-sm font-semibold text-white shadow-subtle disabled:cursor-not-allowed"
          >
            Add product · soon
          </button>
        )}
      </header>

      {error && (
        <p
          role="alert"
          className="rounded-chip border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-cup-error"
        >
          {error}
        </p>
      )}

      {products === null ? (
        <p className="text-sm text-cup-muted">Loading menu…</p>
      ) : products.length === 0 ? (
        <p className="rounded-chip bg-cup-cream-100 px-4 py-6 text-center text-sm text-cup-muted">
          No products yet. Seed the catalog from the API.
        </p>
      ) : (
        <div className="space-y-6">
          {categories
            .filter((c) => grouped[c.id]?.length)
            .map((category) => (
              <section
                key={category.id}
                className="rounded-card border border-cup-stroke bg-cup-surface p-5 shadow-card"
              >
                <h2 className="font-heading text-base font-semibold text-cup-brown-900">
                  {category.name_en}
                </h2>
                <ul className="mt-4 divide-y divide-cup-stroke" role="list">
                  {grouped[category.id]?.map((product) => (
                    <li
                      key={product.id}
                      className="flex flex-wrap items-center gap-4 py-3 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-heading text-sm font-semibold text-cup-brown-900">
                          {product.name_en}
                        </p>
                        <p className="truncate text-xs text-cup-muted">
                          {product.description_en || '—'}
                        </p>
                      </div>
                      <span className="font-mono text-sm font-semibold text-cup-orange-700">
                        {formatEgp(product.base_price_egp)}
                      </span>
                      <AvailabilityToggle
                        product={product}
                        disabled={!canToggle || pendingId === product.id}
                        onToggle={() => toggleAvailability(product)}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
        </div>
      )}
    </div>
  );
}

function AvailabilityToggle({
  product,
  disabled,
  onToggle,
}: {
  product: Product;
  disabled: boolean;
  onToggle: () => void;
}) {
  const available = product.is_available;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={available}
      aria-label={`${product.name_en} availability`}
      disabled={disabled}
      onClick={onToggle}
      className={`inline-flex items-center gap-2 rounded-pill border px-3 py-1 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cup-orange-600 disabled:cursor-not-allowed disabled:opacity-50 ${
        available
          ? 'border-cup-teal-200 bg-cup-teal-100 text-cup-teal-700'
          : 'border-cup-stroke bg-cup-brown-100 text-cup-brown-700'
      }`}
    >
      <span
        className={`relative inline-block h-3.5 w-6 rounded-pill transition ${
          available ? 'bg-cup-teal-700' : 'bg-cup-brown-400'
        }`}
        aria-hidden
      >
        <span
          className={`absolute top-[2px] inline-block h-2.5 w-2.5 rounded-full bg-white shadow transition-all ${
            available ? 'left-[12px]' : 'left-[2px]'
          }`}
        />
      </span>
      {available ? 'Available' : 'Out of stock'}
    </button>
  );
}
