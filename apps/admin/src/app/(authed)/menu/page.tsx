'use client';

import { useEffect, useState } from 'react';
import { CupSoda, Eye, EyeOff, MessageSquare, MessageSquareOff, Pencil, Plus, Search, Star, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { adminApi, api, ApiError } from '@/lib/api';
import { useSession } from '@/lib/useSession';
import { can } from '@/lib/permissions';
import { formatEgp } from '@/lib/format';
import { AddProductSheet } from '@/components/AddProductSheet';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { EmptyState } from '@/components/EmptyState';
import { Skeleton } from '@/components/Skeleton';
import { useToast } from '@/components/Toast';
import type { Product, Category, CatalogResponse } from '@cup-and-co/types';

const SEED_PREFIX = '22222222';

/**
 * Menu admin. Owners can create / edit / delete custom products and toggle
 * availability on every product. Baristas can only toggle availability.
 *
 * Seed (FALLBACK) products have ids prefixed `22222222-…` and are read-only;
 * admin-created products are prefixed `99999999-…` and support full CRUD via
 * `POST/PATCH/DELETE /admin/menu/products`.
 */
export default function MenuPage() {
  const session = useSession();
  const toast = useToast();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | 'all'>('all');
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  type ReviewMode = 'full' | 'write_only' | 'hidden';
  const REVIEW_MODE_CYCLE: ReviewMode[] = ['full', 'write_only', 'hidden'];

  const canToggle = can(session?.role, 'menu:update_availability');
  const canManage = can(session?.role, 'menu:manage');
  const canManageReviews = can(session?.role, 'reviews:manage');
  // Per-product review mode. 'full' = stars + list + write; 'write_only' = write form only;
  // 'hidden' = nothing shown. Defaults to 'full' when not set.
  const [reviewModeMap, setReviewModeMap] = useState<Record<string, ReviewMode>>({});

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
          setLoadError(err instanceof ApiError ? err.message : 'Could not load menu.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function isCustom(product: Product): boolean {
    return !product.id.startsWith(SEED_PREFIX);
  }

  async function toggleAvailability(product: Product) {
    if (!canToggle || !products) return;
    const previous = products;
    setProducts(products.map((p) => (p.id === product.id ? { ...p, is_available: !p.is_available } : p)));
    setPendingId(product.id);
    try {
      await adminApi.setProductAvailability(product.id, !product.is_available);
      toast('success', `${product.name_en} marked ${product.is_available ? 'out of stock' : 'available'}.`);
    } catch (err) {
      setProducts(previous);
      toast('error', err instanceof ApiError ? err.message : 'Could not update availability.');
    } finally {
      setPendingId(null);
    }
  }

  async function handleReviewModeClick(productId: string) {
    const current: ReviewMode = reviewModeMap[productId] ?? 'full';
    const nextIdx = (REVIEW_MODE_CYCLE.indexOf(current) + 1) % REVIEW_MODE_CYCLE.length;
    const next = REVIEW_MODE_CYCLE[nextIdx]!;
    setReviewModeMap((prev) => ({ ...prev, [productId]: next }));
    try {
      await adminApi.setProductReviewMode(productId, next);
      const labels: Record<ReviewMode, string> = {
        full: 'Full reviews shown (stars, list, write form).',
        write_only: 'Write-review form shown — stars and list hidden.',
        hidden: 'All reviews hidden from customers.',
      };
      toast('success', labels[next]);
    } catch (err) {
      setReviewModeMap((prev) => ({ ...prev, [productId]: current }));
      toast('error', err instanceof ApiError ? err.message : 'Could not update review mode.');
    }
  }

  const [stockMap, setStockMap] = useState<Record<string, number | null>>({});

  async function handleStockChange(productId: string, count: number | null) {
    const previous = stockMap[productId] ?? null;
    setStockMap((prev) => ({ ...prev, [productId]: count }));
    try {
      await adminApi.setProductStock(productId, count);
      toast('success', count === null ? 'Stock set to unlimited.' : `Stock set to ${count}.`);
    } catch (err) {
      setStockMap((prev) => ({ ...prev, [productId]: previous }));
      toast('error', err instanceof ApiError ? err.message : 'Could not update stock.');
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await adminApi.deleteProduct(deleting.id);
      setProducts((prev) => prev?.filter((p) => p.id !== deleting.id) ?? null);
      toast('success', `${deleting.name_en} deleted.`);
      setDeleting(null);
    } catch (err) {
      toast('error', err instanceof ApiError ? err.message : 'Could not delete product.');
    } finally {
      setDeleteBusy(false);
    }
  }

  // Filtered + grouped view
  const visibleProducts = (products ?? []).filter((p) => {
    if (activeCategory !== 'all' && p.category_id !== activeCategory) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      if (!p.name_en.toLowerCase().includes(q) && !p.name_ar.includes(search.trim())) return false;
    }
    return true;
  });

  const grouped = visibleProducts.reduce<Record<string, Product[]>>((acc, p) => {
    (acc[p.category_id] ??= []).push(p);
    return acc;
  }, {});

  const totalCount = products?.length ?? 0;
  const availableCount = products?.filter((p) => p.is_available).length ?? 0;
  const outCount = totalCount - availableCount;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cup-muted">Catalog</p>
          <h1 className="font-heading text-3xl font-bold text-cup-brown-900">Menu</h1>
          <p className="mt-1 text-sm text-cup-muted">
            {canManage
              ? 'Add new items, edit details, toggle availability, or remove out-of-stock products.'
              : 'Flip availability when an item runs out. Read-only otherwise.'}
          </p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="inline-flex items-center gap-2 rounded-pill bg-cup-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-subtle transition hover:bg-cup-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cup-orange-600"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Add product
          </button>
        )}
      </header>

      {/* Stats strip */}
      <div className="grid gap-3 sm:grid-cols-3">
        <StatPill label="Total items" value={totalCount} tone="brown" />
        <StatPill label="Available now" value={availableCount} tone="teal" />
        <StatPill label="Out of stock" value={outCount} tone={outCount > 0 ? 'rose' : 'brown'} />
      </div>

      {/* Search + filter */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="relative flex flex-1 min-w-[200px] items-center">
          <Search className="absolute left-3 h-4 w-4 text-cup-muted" aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name…"
            className="h-10 w-full rounded-pill border border-cup-stroke bg-cup-surface pl-9 pr-3 text-sm placeholder:text-cup-muted focus:border-cup-orange-600 focus:outline-none"
          />
        </label>
        <div className="flex gap-2 overflow-x-auto">
          <CategoryChip
            label={`All · ${products?.length ?? '—'}`}
            active={activeCategory === 'all'}
            onClick={() => setActiveCategory('all')}
          />
          {categories.map((c) => {
            const count = products?.filter((p) => p.category_id === c.id).length ?? 0;
            if (count === 0) return null;
            return (
              <CategoryChip
                key={c.id}
                label={`${c.name_en} · ${count}`}
                active={activeCategory === c.id}
                onClick={() => setActiveCategory(c.id)}
              />
            );
          })}
        </div>
      </div>

      {canManage && (
        <AddProductSheet
          open={addOpen || Boolean(editing)}
          onClose={() => {
            setAddOpen(false);
            setEditing(null);
          }}
          categories={categories}
          editing={editing}
          onCreated={(product) => setProducts((prev) => (prev ? [...prev, product] : [product]))}
          onUpdated={(product) =>
            setProducts((prev) => (prev ? prev.map((p) => (p.id === product.id ? product : p)) : null))
          }
        />
      )}

      {canManage && (
        <ConfirmDialog
          open={Boolean(deleting)}
          title="Delete this product?"
          message={
            deleting
              ? `${deleting.name_en} will be removed from the menu. Customers won't see it on their next refresh.`
              : ''
          }
          confirmLabel="Delete"
          destructive
          busy={deleteBusy}
          onConfirm={handleDelete}
          onCancel={() => !deleteBusy && setDeleting(null)}
        />
      )}

      {loadError && (
        <p
          role="alert"
          className="rounded-chip border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-cup-error"
        >
          {loadError}
        </p>
      )}

      {products === null ? (
        <div className="space-y-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : visibleProducts.length === 0 ? (
        <EmptyState
          icon={CupSoda}
          title={search ? 'No products match that search.' : 'No products yet.'}
          description={
            canManage && !search
              ? 'Add your first product to start serving customers.'
              : 'Try clearing the search or pick a different category.'
          }
          action={canManage && !search ? { label: 'Add product', onClick: () => setAddOpen(true) } : undefined}
        />
      ) : (
        <div className="space-y-6">
          {categories
            .filter((c) => grouped[c.id]?.length)
            .map((category) => (
              <section
                key={category.id}
                className="rounded-card border border-cup-stroke bg-cup-surface p-5 shadow-card"
                aria-labelledby={`cat-${category.id}`}
              >
                <header className="mb-4 flex items-center justify-between">
                  <h2
                    id={`cat-${category.id}`}
                    className="font-heading text-base font-semibold text-cup-brown-900"
                  >
                    {category.name_en}
                  </h2>
                  <span className="text-xs text-cup-muted">{grouped[category.id]?.length} items</span>
                </header>
                <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" role="list">
                  {grouped[category.id]?.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      isCustom={isCustom(product)}
                      canToggle={canToggle}
                      canManage={canManage}
                      canManageReviews={canManageReviews}
                      pending={pendingId === product.id}
                      reviewMode={reviewModeMap[product.id] ?? 'full'}
                      stockCount={stockMap[product.id] ?? null}
                      onToggle={() => toggleAvailability(product)}
                      onEdit={() => setEditing(product)}
                      onDelete={() => setDeleting(product)}
                      onCycleReviewMode={() => handleReviewModeClick(product.id)}
                      onStockChange={(count) => handleStockChange(product.id, count)}
                    />
                  ))}
                </ul>
              </section>
            ))}
        </div>
      )}
    </div>
  );
}

// ─── ProductCard ───────────────────────────────────────────────────────────

type ReviewMode = 'full' | 'write_only' | 'hidden';

const REVIEW_MODE_META: Record<ReviewMode, {
  label: string;
  next: string;
  icon: React.ReactNode;
  style: string;
  badge: string;
}> = {
  full: {
    label: 'Stars · Reviews · Write form',
    next: 'Next: write form only (hide stars & list)',
    icon: <Star className="h-3.5 w-3.5" aria-hidden />,
    style: 'border-cup-teal-200 bg-cup-teal-50 text-cup-teal-700 hover:bg-cup-teal-100',
    badge: 'bg-cup-teal-200 text-cup-teal-800',
  },
  write_only: {
    label: 'Write reviews only',
    next: 'Next: hide all reviews',
    icon: <MessageSquare className="h-3.5 w-3.5" aria-hidden />,
    style: 'border-cup-orange-200 bg-cup-orange-50 text-cup-orange-700 hover:bg-cup-orange-100',
    badge: 'bg-cup-orange-200 text-cup-orange-800',
  },
  hidden: {
    label: 'Reviews hidden',
    next: 'Next: show all (stars, list, write form)',
    icon: <EyeOff className="h-3.5 w-3.5" aria-hidden />,
    style: 'border-cup-stroke bg-cup-paper text-cup-muted hover:bg-cup-cream-100',
    badge: 'bg-cup-stroke text-cup-muted',
  },
};

function ProductCard({
  product,
  isCustom,
  canToggle,
  canManage,
  canManageReviews,
  pending,
  reviewMode,
  stockCount,
  onToggle,
  onEdit,
  onDelete,
  onCycleReviewMode,
  onStockChange,
}: {
  product: Product;
  isCustom: boolean;
  canToggle: boolean;
  canManage: boolean;
  canManageReviews: boolean;
  pending: boolean;
  reviewMode: ReviewMode;
  stockCount: number | null;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onCycleReviewMode: () => void;
  onStockChange: (count: number | null) => void;
}) {
  const [stockInput, setStockInput] = useState(stockCount !== null ? String(stockCount) : '');
  // Sync input if parent updates stock (e.g. after API response)
  const syncedStock = stockCount !== null ? String(stockCount) : '';
  if (stockInput !== syncedStock && document.activeElement?.id !== `stock-${product.id}`) {
    setStockInput(syncedStock);
  }

  function commitStock() {
    const val = stockInput.trim();
    if (val === '') { onStockChange(null); return; }
    const n = parseInt(val, 10);
    if (!isNaN(n) && n >= 0) onStockChange(n);
    else setStockInput(stockCount !== null ? String(stockCount) : '');
  }

  return (
    <li
      className={`flex flex-col gap-3 rounded-chip border p-3 transition ${
        product.is_available
          ? 'border-cup-stroke bg-cup-surface'
          : 'border-cup-stroke/70 bg-cup-paper opacity-80'
      }`}
    >
      <div className="flex gap-3">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-chip bg-cup-paper">
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt=""
              fill
              sizes="56px"
              className="object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.opacity = '0';
              }}
            />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-heading text-sm font-semibold text-cup-brown-900">
            {product.name_en}
          </p>
          <p className="truncate text-xs text-cup-muted">{product.description_en || '—'}</p>
          <p className="mt-1 font-mono text-sm font-semibold text-cup-orange-700">
            {formatEgp(product.base_price_egp)}
          </p>
        </div>
      </div>

      {/* Availability toggle row */}
      <div className="flex items-center justify-between gap-2">
        <AvailabilityToggle
          product={product}
          disabled={!canToggle || pending}
          onToggle={onToggle}
        />
        {canManage && isCustom && (
          <div className="flex gap-1">
            <button
              type="button"
              onClick={onEdit}
              aria-label={`Edit ${product.name_en}`}
              className="grid h-8 w-8 place-items-center rounded-chip border border-cup-stroke bg-white text-cup-brown-700 transition hover:bg-cup-cream-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cup-orange-600"
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={onDelete}
              aria-label={`Delete ${product.name_en}`}
              className="grid h-8 w-8 place-items-center rounded-chip border border-rose-200 bg-white text-cup-error transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cup-error"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        )}
      </div>

      {/* Stock count input (owners + baristas) */}
      {canToggle && (
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cup-muted">
            Stock
          </span>
          <input
            id={`stock-${product.id}`}
            type="number"
            min="0"
            value={stockInput}
            placeholder="∞ unlimited"
            onChange={(e) => setStockInput(e.target.value)}
            onBlur={commitStock}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.currentTarget.blur(); } }}
            className="w-28 rounded-chip border border-cup-stroke bg-cup-paper px-2 py-1 text-xs placeholder:text-cup-muted focus:border-cup-orange-600 focus:outline-none focus:ring-1 focus:ring-cup-orange-600"
          />
          {stockCount !== null && (
            <button
              type="button"
              onClick={() => { setStockInput(''); onStockChange(null); }}
              title="Set to unlimited"
              className="text-[11px] text-cup-muted underline hover:text-cup-brown-900"
            >
              ∞
            </button>
          )}
        </div>
      )}

      {/* Review mode cycle button (owners only) */}
      {canManageReviews && (() => {
        const meta = REVIEW_MODE_META[reviewMode];
        return (
          <button
            type="button"
            onClick={onCycleReviewMode}
            title={meta.next}
            className={`flex w-full items-center justify-between rounded-chip border px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cup-orange-600 ${meta.style}`}
          >
            <span className="flex items-center gap-1.5">
              {meta.icon}
              {meta.label}
            </span>
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${meta.badge}`}>
              {reviewMode === 'full' ? 'FULL' : reviewMode === 'write_only' ? 'WRITE' : 'OFF'}
            </span>
          </button>
        );
      })()}
    </li>
  );
}

// ─── Small subcomponents ──────────────────────────────────────────────────

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

function StatPill({ label, value, tone }: { label: string; value: number; tone: 'brown' | 'teal' | 'rose' }) {
  const accent =
    tone === 'teal' ? 'text-cup-teal-700' : tone === 'rose' ? 'text-cup-error' : 'text-cup-brown-900';
  return (
    <div className="rounded-card border border-cup-stroke bg-cup-surface px-4 py-3 shadow-card">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cup-muted">{label}</p>
      <p className={`mt-1 font-heading text-2xl font-bold ${accent}`}>{value}</p>
    </div>
  );
}

function CategoryChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`shrink-0 rounded-pill border px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cup-orange-600 ${
        active
          ? 'border-cup-orange-600 bg-cup-orange-100 text-cup-orange-700'
          : 'border-cup-stroke bg-cup-surface text-cup-brown-700 hover:bg-cup-cream-100'
      }`}
    >
      {label}
    </button>
  );
}
