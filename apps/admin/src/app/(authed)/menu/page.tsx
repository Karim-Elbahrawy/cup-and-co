'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Eye, EyeOff, MessageSquare, X } from 'lucide-react';
import { api, adminApi, ApiError } from '@/lib/api';
import { useSession } from '@/lib/useSession';
import { can } from '@/lib/permissions';
import { formatEgp } from '@/lib/format';
import type { Product, Category, CatalogResponse, ReviewMode } from '@cup-and-co/types';

/**
 * Menu admin. Owners can manage everything; baristas can flip availability
 * and update stock. Review-mode cycling and product creation are owner-only.
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

const PRESET_IMAGES = [
  { url: '/images/products/hot_coffee.png', label: 'Hot' },
  { url: '/images/products/cold_coffee.png', label: 'Cold' },
  { url: '/images/products/dessert.png', label: 'Dessert' },
  { url: '/images/products/breakfast.png', label: 'Breakfast' },
];

const INITIAL_ADD_FORM = {
  category_id: '',
  name_en: '',
  name_ar: '',
  description_en: '',
  description_ar: '',
  base_price_egp: '',
  prep_minutes: '5',
  image_url: '/images/products/hot_coffee.png',
  is_available: true,
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

  // Add product modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState(INITIAL_ADD_FORM);
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const loadCatalog = useCallback(async (signal?: AbortSignal) => {
    try {
      const data = await api<CatalogResponse>('/catalog', { signal });
      if (signal?.aborted) return;
      setProducts(data.products);
      setCategories(data.categories);
      const modes: Record<string, ReviewMode> = {};
      const stocks: Record<string, number | null> = {};
      for (const p of data.products) {
        modes[p.id] = (p.review_mode != null && p.review_mode in REVIEW_MODE_META)
          ? p.review_mode
          : 'full';
        stocks[p.id] = p.stock_count;
      }
      setReviewModeMap(modes);
      setStockMap(stocks);
      setError(null);
    } catch (err) {
      if (signal?.aborted) return;
      setError(err instanceof ApiError ? err.message : 'Could not load menu.');
    }
  }, []);

  useEffect(() => {
    const ctl = new AbortController();
    loadCatalog(ctl.signal);
    return () => ctl.abort();
  }, [loadCatalog]);

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
    const rawCurrent = reviewModeMap[product.id] ?? product.review_mode;
    const current: ReviewMode = (rawCurrent != null && rawCurrent in REVIEW_MODE_META ? rawCurrent : 'full');
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

  async function handleAddProduct(e: React.FormEvent) {
    e.preventDefault();
    const price = parseFloat(addForm.base_price_egp);
    const prep = parseInt(addForm.prep_minutes, 10);
    if (!addForm.category_id) { setAddError('Please select a category.'); return; }
    if (!addForm.name_en.trim()) { setAddError('English name is required.'); return; }
    if (isNaN(price) || price <= 0) { setAddError('Price must be greater than 0.'); return; }
    if (isNaN(prep) || prep < 1) { setAddError('Prep time must be at least 1 minute.'); return; }

    setAddSubmitting(true);
    setAddError(null);
    try {
      await adminApi.createProduct({
        category_id: addForm.category_id,
        name_en: addForm.name_en.trim(),
        name_ar: addForm.name_ar.trim() || addForm.name_en.trim(),
        description_en: addForm.description_en.trim(),
        description_ar: addForm.description_ar.trim(),
        base_price_egp: price,
        prep_minutes: prep,
        image_url: addForm.image_url || '/images/products/hot_coffee.png',
        is_available: addForm.is_available,
        sort_order: 0,
      });
      setShowAddModal(false);
      setAddForm(INITIAL_ADD_FORM);
      await loadCatalog();
    } catch (err) {
      setAddError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Could not add product.',
      );
    } finally {
      setAddSubmitting(false);
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
              ? 'Set availability, stock counts, and control what reviews customers see.'
              : 'Flip availability and update stock when items run low.'}
          </p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={() => { setAddError(null); setAddForm(INITIAL_ADD_FORM); setShowAddModal(true); }}
            className="rounded-pill bg-cup-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-subtle transition hover:bg-cup-orange-700 active:scale-95"
          >
            + Add Product
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
          No products yet. Add the first one!
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
                <ul className="mt-4 space-y-0 divide-y divide-cup-stroke" role="list">
                  {grouped[category.id]?.map((product) => {
                    const rawMode = reviewModeMap[product.id] ?? product.review_mode;
                    const reviewMode: ReviewMode = (rawMode != null && rawMode in REVIEW_MODE_META ? rawMode : 'full');
                    const stockVal = stockMap[product.id] ?? product.stock_count;
                    const isOutOfStock = stockVal !== null && stockVal <= 0;

                    return (
                      <li
                        key={product.id}
                        className="py-3.5 first:pt-0 last:pb-0"
                      >
                        {/* Row 1: name + price */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-heading text-sm font-semibold text-cup-brown-900">
                                {product.name_en}
                              </p>
                              {isOutOfStock && (
                                <span className="shrink-0 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-600">
                                  Out of stock
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 truncate text-xs text-cup-muted">
                              {product.description_en || '—'}
                            </p>
                          </div>
                          <span className="shrink-0 font-mono text-sm font-semibold text-cup-orange-700">
                            {formatEgp(product.base_price_egp)}
                          </span>
                        </div>

                        {/* Row 2: controls */}
                        {(canToggle || canManage) && (
                          <div className="mt-2.5 flex flex-wrap items-center gap-2">
                            {/* Stock input */}
                            {canToggle && (
                              <label className="flex items-center gap-1.5 rounded-lg border border-cup-stroke bg-cup-paper px-2.5 py-1.5">
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
                                  className="w-12 bg-transparent text-center font-mono text-xs text-cup-brown-900 focus:outline-none"
                                />
                              </label>
                            )}

                            {/* Review mode cycle button */}
                            {canManage && (
                              <button
                                type="button"
                                title={REVIEW_MODE_META[reviewMode]?.tooltip}
                                disabled={reviewPendingId === product.id}
                                onClick={() => cycleReviewMode(product)}
                                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cup-orange-600 disabled:cursor-not-allowed disabled:opacity-50 ${REVIEW_MODE_META[reviewMode]?.cls ?? ''}`}
                              >
                                {reviewMode === 'full' && <Eye size={11} aria-hidden />}
                                {reviewMode === 'write_only' && (
                                  <MessageSquare size={11} aria-hidden />
                                )}
                                {reviewMode === 'hidden' && <EyeOff size={11} aria-hidden />}
                                {REVIEW_MODE_META[reviewMode]?.label}
                              </button>
                            )}

                            {/* Availability toggle */}
                            <AvailabilityToggle
                              product={product}
                              disabled={!canToggle || pendingId === product.id}
                              onToggle={() => toggleAvailability(product)}
                            />
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
        </div>
      )}

      {/* ── Add Product Modal ── */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center sm:p-6"
          onClick={(e) => { if (e.target === e.currentTarget) setShowAddModal(false); }}
        >
          <form
            onSubmit={handleAddProduct}
            className="relative w-full max-w-lg rounded-card bg-cup-paper shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-cup-stroke px-6 py-4">
              <h2 className="font-heading text-lg font-bold text-cup-brown-900">New Product</h2>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="grid h-8 w-8 place-items-center rounded-full text-cup-muted transition hover:bg-cup-cream-100"
              >
                <X size={16} />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="max-h-[65vh] space-y-4 overflow-y-auto px-6 py-5">
              {/* Category */}
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-cup-muted">
                  Category
                </label>
                <select
                  required
                  value={addForm.category_id}
                  onChange={(e) => setAddForm((f) => ({ ...f, category_id: e.target.value }))}
                  className="w-full rounded-lg border border-cup-stroke bg-white px-3 py-2.5 text-sm text-cup-brown-900 focus:border-cup-orange-600 focus:outline-none"
                >
                  <option value="">Select category…</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name_en}</option>
                  ))}
                </select>
              </div>

              {/* Names */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-cup-muted">
                    Name (EN) *
                  </label>
                  <input
                    required
                    value={addForm.name_en}
                    onChange={(e) => setAddForm((f) => ({ ...f, name_en: e.target.value }))}
                    placeholder="e.g. Oat Latte"
                    className="w-full rounded-lg border border-cup-stroke bg-white px-3 py-2.5 text-sm placeholder:text-cup-muted focus:border-cup-orange-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-cup-muted">
                    Name (AR)
                  </label>
                  <input
                    value={addForm.name_ar}
                    onChange={(e) => setAddForm((f) => ({ ...f, name_ar: e.target.value }))}
                    placeholder="لاتيه شوفان"
                    dir="rtl"
                    className="w-full rounded-lg border border-cup-stroke bg-white px-3 py-2.5 text-sm placeholder:text-cup-muted focus:border-cup-orange-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Descriptions */}
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-cup-muted">
                  Description (EN)
                </label>
                <textarea
                  value={addForm.description_en}
                  onChange={(e) => setAddForm((f) => ({ ...f, description_en: e.target.value }))}
                  placeholder="Short product description…"
                  rows={2}
                  maxLength={500}
                  className="w-full resize-none rounded-lg border border-cup-stroke bg-white px-3 py-2 text-sm placeholder:text-cup-muted focus:border-cup-orange-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-cup-muted">
                  Description (AR)
                </label>
                <textarea
                  value={addForm.description_ar}
                  onChange={(e) => setAddForm((f) => ({ ...f, description_ar: e.target.value }))}
                  placeholder="وصف قصير للمنتج…"
                  dir="rtl"
                  rows={2}
                  maxLength={500}
                  className="w-full resize-none rounded-lg border border-cup-stroke bg-white px-3 py-2 text-sm placeholder:text-cup-muted focus:border-cup-orange-600 focus:outline-none"
                />
              </div>

              {/* Price + Prep time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-cup-muted">
                    Price (EGP) *
                  </label>
                  <input
                    required
                    type="number"
                    min={0.5}
                    step={0.5}
                    value={addForm.base_price_egp}
                    onChange={(e) => setAddForm((f) => ({ ...f, base_price_egp: e.target.value }))}
                    placeholder="65"
                    className="w-full rounded-lg border border-cup-stroke bg-white px-3 py-2.5 text-sm placeholder:text-cup-muted focus:border-cup-orange-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-cup-muted">
                    Prep Time (min) *
                  </label>
                  <input
                    required
                    type="number"
                    min={1}
                    max={120}
                    value={addForm.prep_minutes}
                    onChange={(e) => setAddForm((f) => ({ ...f, prep_minutes: e.target.value }))}
                    className="w-full rounded-lg border border-cup-stroke bg-white px-3 py-2.5 text-sm focus:border-cup-orange-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Image preset picker + custom URL */}
              <div>
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-cup-muted">
                  Image
                </label>
                <div className="mb-2 grid grid-cols-4 gap-2">
                  {PRESET_IMAGES.map((preset) => (
                    <button
                      key={preset.url}
                      type="button"
                      onClick={() => setAddForm((f) => ({ ...f, image_url: preset.url }))}
                      className={`relative aspect-square overflow-hidden rounded-lg border-2 transition ${
                        addForm.image_url === preset.url
                          ? 'border-cup-orange-600 ring-2 ring-cup-orange-600/25'
                          : 'border-cup-stroke hover:border-cup-brown-400'
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={preset.url} alt={preset.label} className="h-full w-full object-cover" />
                      <span className="absolute inset-x-0 bottom-0 bg-black/50 py-0.5 text-center text-[9px] font-semibold text-white">
                        {preset.label}
                      </span>
                    </button>
                  ))}
                </div>
                <input
                  value={addForm.image_url}
                  onChange={(e) => setAddForm((f) => ({ ...f, image_url: e.target.value }))}
                  placeholder="Or paste a custom image URL…"
                  className="w-full rounded-lg border border-cup-stroke bg-white px-3 py-2 text-sm placeholder:text-cup-muted focus:border-cup-orange-600 focus:outline-none"
                />
              </div>

              {/* Available immediately toggle */}
              <button
                type="button"
                onClick={() => setAddForm((f) => ({ ...f, is_available: !f.is_available }))}
                className="flex w-full items-center justify-between rounded-lg border border-cup-stroke bg-white px-4 py-3 transition hover:bg-cup-paper"
              >
                <span className="text-sm font-semibold text-cup-brown-900">Available immediately</span>
                <span
                  className={`relative inline-block h-6 w-11 rounded-full transition ${
                    addForm.is_available ? 'bg-cup-teal-700' : 'bg-cup-brown-400'
                  }`}
                >
                  <span
                    className={`absolute top-[3px] inline-block h-[18px] w-[18px] rounded-full bg-white shadow transition-all ${
                      addForm.is_available ? 'left-[23px]' : 'left-[3px]'
                    }`}
                  />
                </span>
              </button>

              {addError && (
                <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-cup-error">
                  {addError}
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 border-t border-cup-stroke px-6 py-4">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="flex-1 rounded-pill border border-cup-stroke bg-white py-2.5 text-sm font-semibold text-cup-brown-700 transition hover:bg-cup-cream-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={addSubmitting}
                className="flex-1 rounded-pill bg-cup-orange-600 py-2.5 text-sm font-semibold text-white shadow-subtle transition hover:bg-cup-orange-700 disabled:opacity-70"
              >
                {addSubmitting ? 'Adding…' : 'Add Product'}
              </button>
            </div>
          </form>
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
