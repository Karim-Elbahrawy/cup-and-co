'use client';

import { useEffect, useRef, useState } from 'react';
import { Eye, EyeOff, MessageSquare } from 'lucide-react';
import { api, adminApi, ApiError } from '@/lib/api';
import { useSession } from '@/lib/useSession';
import { can } from '@/lib/permissions';
import { formatEgp } from '@/lib/format';
import type { Product, Category, CatalogResponse, ReviewMode } from '@cup-and-co/types';

/**
 * Menu admin. Owners can manage everything; baristas can flip availability
 * and update stock. Review-mode cycling is owner-only (canManage gate).
 */

const REVIEW_MODE_CYCLE: ReviewMode[] = ['full', 'write_only', 'hidden'];

const REVIEW_MODE_META: Record<
  ReviewMode,
  { label: string; tooltip: string; cls: string }
> = {
  full: {
    label: 'FULL',
    tooltip: 'Stars + review list + write form all visible to customers',
    cls: 'border-cup-teal-200 bg-cup-teal-100 text-cup-teal-700',
  },
  write_only: {
    label: 'WRITE',
    tooltip: 'Write form visible; stars and review list hidden',
    cls: 'border-indigo-200 bg-indigo-50 text-indigo-700',
  },
  hidden: {
    label: 'OFF',
    tooltip: 'Entire reviews section hidden from customers',
    cls: 'border-cup-stroke bg-cup-brown-100 text-cup-brown-500',
  },
};

function nextReviewMode(current: ReviewMode): ReviewMode {
  const idx = REVIEW_MODE_CYCLE.indexOf(current);
  return REVIEW_MODE_CYCLE[(idx + 1) % REVIEW_MODE_CYCLE.length];
}

export default function MenuPage() {
  const session = useSession();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [reviewPendingId, setReviewPendingId] = useState<string | null>(null);

  // Local overlays — optimistically updated on admin action; seeded from catalog
  const [reviewModeMap, setReviewModeMap] = useState<Record<string, ReviewMode>>({});
  const [stockMap, setStockMap] = useState<Record<string, number | null>>({});
  const stockTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api<CatalogResponse>('/catalog');
        if (cancelled) return;
        setProducts(data.products);
        setCategories(data.categories);
        const modes: Record<string, ReviewMode> = {};
        const stocks: Record<string, number | null> = {};
        for (const p of data.products) {
          modes[p.id] = p.review_mode;
          stocks[p.id] = p.stock_count;
        }
        setReviewModeMap(modes);
        setStockMap(stocks);
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
      await adminApi.setProductAvailability(product.id, !product.is_available);
      setError(null);
    } catch (err) {
      setProducts(previous);
      setError(err instanceof ApiError ? err.message : 'Could not update availability.');
    } finally {
      setPendingId(null);
    }
  }

  async function cycleReviewMode(product: Product) {
    if (!canManage) return;
    const current = reviewModeMap[product.id] ?? product.review_mode;
    const next = nextReviewMode(current);
    setReviewModeMap((m) => ({ ...m, [product.id]: next }));
    setReviewPendingId(product.id);
    try {
      await adminApi.setProductReviewMode(product.id, next);
    } catch (err) {
      setReviewModeMap((m) => ({ ...m, [product.id]: current }));
      setError(err instanceof ApiError ? err.message : 'Could not update review mode.');
    } finally {
      setReviewPendingId(null);
    }
  }

  function handleStockInput(productId: string, rawValue: string) {
    const parsed = rawValue === '' ? null : parseInt(rawValue, 10);
    if (parsed !== null && isNaN(parsed)) return;
    setStockMap((m) => ({ ...m, [productId]: parsed }));
    clearTimeout(stockTimers.current[productId]);
    stockTimers.current[productId] = setTimeout(async () => {
      try {
        await adminApi.setProductStock(productId, parsed);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Could not update stock.');
      }
    }, 600);
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
              ? 'Set availability, stock counts, and control what reviews customers see.'
              : 'Flip availability and update stock when items run low.'}
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
                  {grouped[category.id]?.map((product) => {
                    const reviewMode = reviewModeMap[product.id] ?? product.review_mode;
                    const stockVal = stockMap[product.id] ?? product.stock_count;
                    const isOutOfStock = stockVal !== null && stockVal <= 0;

                    return (
                      <li
                        key={product.id}
                        className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0"
                      >
                        {/* Name + description */}
                        <div className="min-w-0 flex-1">
                          <p className="font-heading text-sm font-semibold text-cup-brown-900">
                            {product.name_en}
                            {isOutOfStock && (
                              <span className="ms-2 inline-block rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-600">
                                Out of stock
                              </span>
                            )}
                          </p>
                          <p className="truncate text-xs text-cup-muted">
                            {product.description_en || '—'}
                          </p>
                        </div>

                        {/* Price */}
                        <span className="font-mono text-sm font-semibold text-cup-orange-700">
                          {formatEgp(product.base_price_egp)}
                        </span>

                        {/* Stock input */}
                        {canToggle && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-cup-muted">
                              Stock
                            </span>
                            <input
                              type="number"
                              min={0}
                              placeholder="∞"
                              aria-label={`Stock count for ${product.name_en}`}
                              value={stockVal === null ? '' : String(stockVal)}
                              onChange={(e) => handleStockInput(product.id, e.target.value)}
                              className="w-16 rounded-lg border border-cup-stroke bg-white px-2 py-1 text-center font-mono text-xs text-cup-brown-900 focus:border-cup-orange-500 focus:outline-none focus:ring-1 focus:ring-cup-orange-500"
                            />
                          </div>
                        )}

                        {/* Review mode cycle button */}
                        {canManage && (
                          <button
                            type="button"
                            title={REVIEW_MODE_META[reviewMode].tooltip}
                            disabled={reviewPendingId === product.id}
                            onClick={() => cycleReviewMode(product)}
                            className={`inline-flex items-center gap-1.5 rounded-pill border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cup-orange-600 disabled:cursor-not-allowed disabled:opacity-50 ${REVIEW_MODE_META[reviewMode].cls}`}
                          >
                            {reviewMode === 'full' && <Eye size={11} aria-hidden />}
                            {reviewMode === 'write_only' && (
                              <MessageSquare size={11} aria-hidden />
                            )}
                            {reviewMode === 'hidden' && <EyeOff size={11} aria-hidden />}
                            {REVIEW_MODE_META[reviewMode].label}
                          </button>
                        )}

                        {/* Availability toggle */}
                        <AvailabilityToggle
                          product={product}
                          disabled={!canToggle || pendingId === product.id}
                          onToggle={() => toggleAvailability(product)}
                        />
                      </li>
                    );
                  })}
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
      {available ? 'Available' : 'Unavailable'}
    </button>
  );
}
