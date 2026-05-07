'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Eye, EyeOff, MessageSquare, X, Plus, Pencil, Trash2, ChevronDown, ChevronUp, AlertTriangle, Layers } from 'lucide-react';
import { api, adminApi, ApiError } from '@/lib/api';
import { useSession } from '@/lib/useSession';
import { can } from '@/lib/permissions';
import { formatEgp } from '@/lib/format';
import { useToast } from '@/components/Toast';
import type { Product, Category, CatalogResponse, ReviewMode, ProductOption } from '@cup-and-co/types';

/**
 * Menu admin. Owners can manage everything; baristas can flip availability
 * and update stock. Review-mode cycling and product creation are owner-only.
 */

const OPTION_GROUPS: ProductOption['group_name'][] = ['size', 'sugar', 'ice', 'milk', 'extras', 'shots'];

const REVIEW_MODE_CYCLE: ReviewMode[] = ['full', 'write_only', 'hidden'];

const REVIEW_MODE_META: Record<ReviewMode, { label: string; tooltip: string; cls: string }> = {
  full: { label: 'FULL', tooltip: 'Stars + review list + write form all visible to customers', cls: 'border-cup-teal-200 bg-cup-teal-100 text-cup-teal-700' },
  write_only: { label: 'WRITE', tooltip: 'Write form visible; stars and review list hidden', cls: 'border-indigo-200 bg-indigo-50 text-indigo-700' },
  hidden: { label: 'OFF', tooltip: 'Entire reviews section hidden from customers', cls: 'border-cup-stroke bg-cup-brown-100 text-cup-brown-500' },
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

function StockBadge({ stockVal }: { stockVal: number | null }) {
  if (stockVal === null) return null;
  if (stockVal === 0) {
    return (
      <span className="shrink-0 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-600">
        Out of stock
      </span>
    );
  }
  if (stockVal <= 5) {
    return (
      <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
        <AlertTriangle className="h-2.5 w-2.5" />
        Low: {stockVal}
      </span>
    );
  }
  return null;
}

// ── Product Options Editor ────────────────────────────────────────────────────

interface OptionsEditorProps {
  product: Product;
  canManage: boolean;
}

function OptionsEditor({ product, canManage }: OptionsEditorProps) {
  const toast = useToast();
  const [options, setOptions] = useState<ProductOption[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ name_en: '', name_ar: '', group_name: 'size' as ProductOption['group_name'], price_delta_egp: 0 });
  const [editForm, setEditForm] = useState({ name_en: '', name_ar: '', group_name: 'size' as ProductOption['group_name'], price_delta_egp: 0 });

  const loadOptions = useCallback(async () => {
    if (options !== null) return; // already loaded
    setLoading(true);
    try {
      const res = await adminApi.listProductOptions(product.id);
      setOptions(res.options);
    } catch (err) {
      toast('error', (err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [options, product.id, toast]);

  // Auto-load options when editor mounts
  useEffect(() => {
    loadOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!addForm.name_en.trim()) return;
    try {
      const res = await adminApi.addProductOption(product.id, {
        product_id: product.id,
        name_en: addForm.name_en.trim(),
        name_ar: addForm.name_ar.trim() || addForm.name_en.trim(),
        group_name: addForm.group_name,
        price_delta_egp: addForm.price_delta_egp,
      });
      setOptions(prev => [...(prev ?? []), res.option]);
      setAddForm({ name_en: '', name_ar: '', group_name: 'size', price_delta_egp: 0 });
      setShowAddForm(false);
      toast('success', 'Option added');
    } catch (err) {
      toast('error', (err as Error).message);
    }
  }

  function startEdit(opt: ProductOption) {
    setEditingId(opt.id);
    setEditForm({
      name_en: opt.name_en,
      name_ar: opt.name_ar,
      group_name: opt.group_name,
      price_delta_egp: opt.price_delta_egp,
    });
  }

  async function handleEditSave(optId: string) {
    try {
      const res = await adminApi.updateProductOption(product.id, optId, {
        name_en: editForm.name_en.trim(),
        name_ar: editForm.name_ar.trim() || editForm.name_en.trim(),
        group_name: editForm.group_name,
        price_delta_egp: editForm.price_delta_egp,
      });
      setOptions(prev => prev?.map(o => o.id === optId ? res.option : o) ?? null);
      setEditingId(null);
      toast('success', 'Option updated');
    } catch (err) {
      toast('error', (err as Error).message);
    }
  }

  async function handleDelete(optId: string) {
    if (!confirm('Delete this option group? This cannot be undone.')) return;
    try {
      await adminApi.deleteProductOption(product.id, optId);
      setOptions(prev => prev?.filter(o => o.id !== optId) ?? null);
      toast('success', 'Option deleted');
    } catch (err) {
      toast('error', (err as Error).message);
    }
  }

  if (!canManage) return null;

  return (
    <div className="mt-3 rounded-lg border border-cup-stroke bg-cup-cream-100 p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-cup-muted flex items-center gap-1">
          <Layers className="h-3 w-3" /> Options
        </span>
        <button
          type="button"
          onClick={() => setShowAddForm(v => !v)}
          className="flex items-center gap-1 rounded-full bg-cup-orange-600 px-2.5 py-1 text-[10px] font-semibold text-white transition hover:bg-cup-orange-700"
        >
          <Plus className="h-3 w-3" /> Add
        </button>
      </div>

      {loading && <p className="text-xs text-cup-muted animate-pulse">Loading…</p>}

      {options !== null && options.length === 0 && !showAddForm && (
        <p className="text-xs text-cup-muted">No option groups yet.</p>
      )}

      {options !== null && options.map(opt => (
        <div key={opt.id} className="mb-2 last:mb-0">
          {editingId === opt.id ? (
            <div className="space-y-2 rounded-lg border border-cup-stroke bg-white p-3">
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={editForm.name_en}
                  onChange={e => setEditForm(f => ({ ...f, name_en: e.target.value }))}
                  placeholder="Name (EN)"
                  className="rounded border border-cup-stroke px-2 py-1 text-xs focus:border-cup-orange-600 focus:outline-none"
                />
                <input
                  value={editForm.name_ar}
                  onChange={e => setEditForm(f => ({ ...f, name_ar: e.target.value }))}
                  placeholder="Name (AR)"
                  dir="rtl"
                  className="rounded border border-cup-stroke px-2 py-1 text-xs focus:border-cup-orange-600 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={editForm.group_name}
                  onChange={e => setEditForm(f => ({ ...f, group_name: e.target.value as ProductOption['group_name'] }))}
                  className="rounded border border-cup-stroke px-2 py-1 text-xs focus:border-cup-orange-600 focus:outline-none"
                >
                  {OPTION_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
                <input
                  type="number"
                  step="0.5"
                  value={editForm.price_delta_egp}
                  onChange={e => setEditForm(f => ({ ...f, price_delta_egp: Number(e.target.value) }))}
                  placeholder="Price delta (EGP)"
                  className="rounded border border-cup-stroke px-2 py-1 text-xs focus:border-cup-orange-600 focus:outline-none"
                />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => handleEditSave(opt.id)} className="rounded-pill bg-cup-orange-600 px-3 py-1 text-[11px] font-semibold text-white hover:bg-cup-orange-700">Save</button>
                <button type="button" onClick={() => setEditingId(null)} className="rounded-pill border border-cup-stroke bg-white px-3 py-1 text-[11px] font-semibold text-cup-brown-700 hover:bg-cup-cream-100">Cancel</button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between rounded-lg border border-cup-stroke bg-white px-3 py-2">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-cup-brown-900">{opt.name_en}</p>
                <p className="text-[10px] text-cup-muted">
                  {opt.group_name}{opt.price_delta_egp ? ` · +${opt.price_delta_egp} EGP` : ''}
                </p>
              </div>
              <div className="flex shrink-0 gap-1 ml-2">
                <button type="button" onClick={() => startEdit(opt)} className="rounded p-1 text-cup-muted hover:text-cup-orange-600 transition">
                  <Pencil className="h-3 w-3" />
                </button>
                <button type="button" onClick={() => handleDelete(opt.id)} className="rounded p-1 text-cup-muted hover:text-rose-600 transition">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {showAddForm && (
        <form onSubmit={handleAdd} className="mt-2 space-y-2 rounded-lg border border-cup-stroke bg-white p-3">
          <div className="grid grid-cols-2 gap-2">
            <input
              required
              value={addForm.name_en}
              onChange={e => setAddForm(f => ({ ...f, name_en: e.target.value }))}
              placeholder="Name (EN) *"
              className="rounded border border-cup-stroke px-2 py-1 text-xs focus:border-cup-orange-600 focus:outline-none"
            />
            <input
              value={addForm.name_ar}
              onChange={e => setAddForm(f => ({ ...f, name_ar: e.target.value }))}
              placeholder="Name (AR)"
              dir="rtl"
              className="rounded border border-cup-stroke px-2 py-1 text-xs focus:border-cup-orange-600 focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={addForm.group_name}
              onChange={e => setAddForm(f => ({ ...f, group_name: e.target.value as ProductOption['group_name'] }))}
              className="rounded border border-cup-stroke px-2 py-1 text-xs focus:border-cup-orange-600 focus:outline-none"
            >
              {OPTION_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
            <input
              type="number"
              step="0.5"
              value={addForm.price_delta_egp}
              onChange={e => setAddForm(f => ({ ...f, price_delta_egp: Number(e.target.value) }))}
              placeholder="Price delta (EGP)"
              className="rounded border border-cup-stroke px-2 py-1 text-xs focus:border-cup-orange-600 focus:outline-none"
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="rounded-pill bg-cup-orange-600 px-3 py-1 text-[11px] font-semibold text-white hover:bg-cup-orange-700">Add Option</button>
            <button type="button" onClick={() => setShowAddForm(false)} className="rounded-pill border border-cup-stroke bg-white px-3 py-1 text-[11px] font-semibold text-cup-brown-700 hover:bg-cup-cream-100">Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
}

// ── Category Management ───────────────────────────────────────────────────────

interface CategoryManagerProps {
  categories: Category[];
  canManage: boolean;
  onRefresh: () => void;
}

function CategoryManager({ categories, canManage, onRefresh }: CategoryManagerProps) {
  const toast = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addForm, setAddForm] = useState({ name_en: '', name_ar: '' });
  const [editForm, setEditForm] = useState({ name_en: '', name_ar: '', sort_order: 0 });

  if (!canManage) return null;

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!addForm.name_en.trim()) return;
    try {
      await adminApi.createCategory({
        name_en: addForm.name_en.trim(),
        name_ar: addForm.name_ar.trim() || addForm.name_en.trim(),
        sort_order: categories.length,
      });
      setAddForm({ name_en: '', name_ar: '' });
      setShowForm(false);
      toast('success', 'Category created');
      onRefresh();
    } catch (err) {
      toast('error', (err as Error).message);
    }
  }

  function startEdit(cat: Category) {
    setEditingId(cat.id);
    setEditForm({ name_en: cat.name_en, name_ar: cat.name_ar, sort_order: cat.sort_order });
  }

  async function handleEditSave(id: string) {
    try {
      await adminApi.updateCategory(id, {
        name_en: editForm.name_en.trim(),
        name_ar: editForm.name_ar.trim() || editForm.name_en.trim(),
        sort_order: editForm.sort_order,
      });
      setEditingId(null);
      toast('success', 'Category updated');
      onRefresh();
    } catch (err) {
      toast('error', (err as Error).message);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this category? Products in it will become uncategorised.')) return;
    try {
      await adminApi.deleteCategory(id);
      toast('success', 'Category deleted');
      onRefresh();
    } catch (err) {
      toast('error', (err as Error).message);
    }
  }

  return (
    <section className="rounded-card border border-cup-stroke bg-cup-surface p-5 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-heading text-base font-semibold text-cup-brown-900">Categories</h2>
        <button
          type="button"
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1.5 rounded-pill bg-cup-orange-600 px-3 py-1.5 text-xs font-semibold text-white shadow-subtle transition hover:bg-cup-orange-700"
        >
          <Plus className="h-3.5 w-3.5" /> New Category
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="mb-4 space-y-3 rounded-lg border border-cup-stroke bg-white p-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-cup-muted">Name (EN) *</label>
              <input
                required
                value={addForm.name_en}
                onChange={e => setAddForm(f => ({ ...f, name_en: e.target.value }))}
                placeholder="e.g. Hot Drinks"
                className="w-full rounded-lg border border-cup-stroke px-3 py-2 text-sm focus:border-cup-orange-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-cup-muted">Name (AR)</label>
              <input
                value={addForm.name_ar}
                onChange={e => setAddForm(f => ({ ...f, name_ar: e.target.value }))}
                placeholder="مشروبات ساخنة"
                dir="rtl"
                className="w-full rounded-lg border border-cup-stroke px-3 py-2 text-sm focus:border-cup-orange-600 focus:outline-none"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="rounded-pill bg-cup-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-subtle hover:bg-cup-orange-700">Create</button>
            <button type="button" onClick={() => setShowForm(false)} className="rounded-pill border border-cup-stroke bg-white px-4 py-2 text-sm font-semibold text-cup-brown-700 hover:bg-cup-cream-100">Cancel</button>
          </div>
        </form>
      )}

      <ul className="divide-y divide-cup-stroke">
        {categories.map(cat => (
          <li key={cat.id} className="py-3 first:pt-0 last:pb-0">
            {editingId === cat.id ? (
              <div className="space-y-3 rounded-lg border border-cup-stroke bg-white p-3">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={editForm.name_en}
                    onChange={e => setEditForm(f => ({ ...f, name_en: e.target.value }))}
                    placeholder="Name (EN)"
                    className="rounded border border-cup-stroke px-2 py-1.5 text-sm focus:border-cup-orange-600 focus:outline-none"
                  />
                  <input
                    value={editForm.name_ar}
                    onChange={e => setEditForm(f => ({ ...f, name_ar: e.target.value }))}
                    placeholder="Name (AR)"
                    dir="rtl"
                    className="rounded border border-cup-stroke px-2 py-1.5 text-sm focus:border-cup-orange-600 focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-cup-muted">Sort order:</label>
                  <input
                    type="number"
                    min={0}
                    value={editForm.sort_order}
                    onChange={e => setEditForm(f => ({ ...f, sort_order: Number(e.target.value) }))}
                    className="w-16 rounded border border-cup-stroke px-2 py-1 text-xs focus:border-cup-orange-600 focus:outline-none"
                  />
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => handleEditSave(cat.id)} className="rounded-pill bg-cup-orange-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-cup-orange-700">Save</button>
                  <button type="button" onClick={() => setEditingId(null)} className="rounded-pill border border-cup-stroke bg-white px-3 py-1.5 text-xs font-semibold text-cup-brown-700 hover:bg-cup-cream-100">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-heading text-sm font-semibold text-cup-brown-900">{cat.name_en}</p>
                  <p className="text-xs text-cup-muted" dir="rtl">{cat.name_ar}</p>
                </div>
                <div className="flex items-center gap-1">
                  <span className="mr-2 text-[11px] text-cup-muted">#{cat.sort_order}</span>
                  <button type="button" onClick={() => startEdit(cat)} className="rounded p-1.5 text-cup-muted transition hover:text-cup-orange-600">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" onClick={() => handleDelete(cat.id)} className="rounded p-1.5 text-cup-muted transition hover:text-rose-600">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
        {categories.length === 0 && (
          <li className="py-4 text-center text-sm text-cup-muted">No categories yet.</li>
        )}
      </ul>
    </section>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function MenuPage() {
  const session = useSession();
  const toast = useToast();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [reviewPendingId, setReviewPendingId] = useState<string | null>(null);
  const [expandedOptions, setExpandedOptions] = useState<string | null>(null);

  const [reviewModeMap, setReviewModeMap] = useState<Record<string, ReviewMode>>({});
  const [stockMap, setStockMap] = useState<Record<string, number | null>>({});
  const stockTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState(INITIAL_ADD_FORM);
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'products' | 'categories'>('products');

  const loadCatalog = useCallback(async (signal?: AbortSignal) => {
    try {
      const data = await api<CatalogResponse>('/catalog', { signal });
      if (signal?.aborted) return;
      setProducts(data.products);
      setCategories(data.categories);
      const modes: Record<string, ReviewMode> = {};
      const stocks: Record<string, number | null> = {};
      for (const p of data.products) {
        modes[p.id] = (p.review_mode != null && p.review_mode in REVIEW_MODE_META) ? p.review_mode : 'full';
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

  // Low stock count for header badge
  const lowStockProducts = (products ?? []).filter(p => {
    const s = stockMap[p.id] ?? p.stock_count;
    return s !== null && s <= 5;
  });

  async function toggleAvailability(product: Product) {
    if (!canToggle || !products) return;
    const previous = products;
    setProducts(products.map(p => p.id === product.id ? { ...p, is_available: !p.is_available } : p));
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
    setReviewModeMap(m => ({ ...m, [product.id]: next }));
    setReviewPendingId(product.id);
    try {
      await adminApi.setProductReviewMode(product.id, next);
    } catch (err) {
      setReviewModeMap(m => ({ ...m, [product.id]: current }));
      setError(err instanceof ApiError ? err.message : 'Could not update review mode.');
    } finally {
      setReviewPendingId(null);
    }
  }

  function handleStockInput(productId: string, rawValue: string) {
    const parsed = rawValue === '' ? null : parseInt(rawValue, 10);
    if (parsed !== null && isNaN(parsed)) return;
    setStockMap(m => ({ ...m, [productId]: parsed }));
    clearTimeout(stockTimers.current[productId]);
    stockTimers.current[productId] = setTimeout(async () => {
      try {
        await adminApi.setProductStock(productId, parsed);
      } catch (err) {
        toast('error', err instanceof ApiError ? err.message : 'Could not update stock.');
      }
    }, 600);
  }

  async function handleAddProduct(e: React.FormEvent) {
    e.preventDefault();
    const price = parseFloat(addForm.base_price_egp);
    const prep  = parseInt(addForm.prep_minutes, 10);
    if (!addForm.category_id)  { setAddError('Please select a category.'); return; }
    if (!addForm.name_en.trim()) { setAddError('English name is required.'); return; }
    if (isNaN(price) || price <= 0) { setAddError('Price must be greater than 0.'); return; }
    if (isNaN(prep)  || prep < 1)   { setAddError('Prep time must be at least 1 minute.'); return; }

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
      setAddError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Could not add product.');
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
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cup-muted">Catalog</p>
          <h1 className="font-heading text-3xl font-bold text-cup-brown-900 flex items-center gap-3">
            Menu
            {lowStockProducts.length > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700">
                <AlertTriangle className="h-3.5 w-3.5" />
                {lowStockProducts.length} low stock
              </span>
            )}
          </h1>
          <p className="mt-1 text-sm text-cup-muted">
            {canManage ? 'Set availability, stock, review mode, options, and manage categories.' : 'Flip availability and update stock when items run low.'}
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
        <p role="alert" className="rounded-chip border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-cup-error">
          {error}
        </p>
      )}

      {/* Tabs */}
      {canManage && (
        <div className="flex gap-1 rounded-lg border border-cup-stroke bg-cup-cream-100 p-1 w-fit">
          {(['products', 'categories'] as const).map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`rounded-md px-4 py-1.5 text-sm font-semibold capitalize transition ${
                activeTab === tab ? 'bg-white shadow-subtle text-cup-brown-900' : 'text-cup-muted hover:text-cup-brown-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      )}

      {/* Categories tab */}
      {activeTab === 'categories' && canManage && (
        <CategoryManager categories={categories} canManage={canManage} onRefresh={loadCatalog} />
      )}

      {/* Products tab */}
      {(activeTab === 'products' || !canManage) && (
        <>
          {products === null ? (
            <p className="text-sm text-cup-muted">Loading menu…</p>
          ) : products.length === 0 ? (
            <p className="rounded-chip bg-cup-cream-100 px-4 py-6 text-center text-sm text-cup-muted">
              No products yet. Add the first one!
            </p>
          ) : (
            <div className="space-y-6">
              {categories
                .filter(c => grouped[c.id]?.length)
                .map(category => (
                  <section key={category.id} className="rounded-card border border-cup-stroke bg-cup-surface p-5 shadow-card">
                    <h2 className="font-heading text-base font-semibold text-cup-brown-900">{category.name_en}</h2>
                    <ul className="mt-4 space-y-0 divide-y divide-cup-stroke" role="list">
                      {grouped[category.id]?.map(product => {
                        const rawMode  = reviewModeMap[product.id] ?? product.review_mode;
                        const reviewMode: ReviewMode = (rawMode != null && rawMode in REVIEW_MODE_META ? rawMode : 'full');
                        const stockVal = stockMap[product.id] ?? product.stock_count;
                        const isOptionsOpen = expandedOptions === product.id;

                        return (
                          <li key={product.id} className="py-3.5 first:pt-0 last:pb-0">
                            {/* Row 1: name + price */}
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="font-heading text-sm font-semibold text-cup-brown-900">{product.name_en}</p>
                                  <StockBadge stockVal={stockVal} />
                                </div>
                                <p className="mt-0.5 truncate text-xs text-cup-muted">{product.description_en || '—'}</p>
                              </div>
                              <span className="shrink-0 font-mono text-sm font-semibold text-cup-orange-700">
                                {formatEgp(product.base_price_egp)}
                              </span>
                            </div>

                            {/* Row 2: controls */}
                            {(canToggle || canManage) && (
                              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                                {canToggle && (
                                  <label className="flex items-center gap-1.5 rounded-lg border border-cup-stroke bg-cup-paper px-2.5 py-1.5">
                                    <span className="text-[10px] font-semibold uppercase tracking-wide text-cup-muted">Stock</span>
                                    <input
                                      type="number"
                                      min={0}
                                      placeholder="∞"
                                      aria-label={`Stock count for ${product.name_en}`}
                                      value={stockVal === null ? '' : String(stockVal)}
                                      onChange={e => handleStockInput(product.id, e.target.value)}
                                      className="w-12 bg-transparent text-center font-mono text-xs text-cup-brown-900 focus:outline-none"
                                    />
                                  </label>
                                )}

                                {canManage && (
                                  <button
                                    type="button"
                                    title={REVIEW_MODE_META[reviewMode]?.tooltip}
                                    disabled={reviewPendingId === product.id}
                                    onClick={() => cycleReviewMode(product)}
                                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cup-orange-600 disabled:cursor-not-allowed disabled:opacity-50 ${REVIEW_MODE_META[reviewMode]?.cls ?? ''}`}
                                  >
                                    {reviewMode === 'full' && <Eye size={11} aria-hidden />}
                                    {reviewMode === 'write_only' && <MessageSquare size={11} aria-hidden />}
                                    {reviewMode === 'hidden' && <EyeOff size={11} aria-hidden />}
                                    {REVIEW_MODE_META[reviewMode]?.label}
                                  </button>
                                )}

                                <AvailabilityToggle
                                  product={product}
                                  disabled={!canToggle || pendingId === product.id}
                                  onToggle={() => toggleAvailability(product)}
                                />

                                {canManage && (
                                  <button
                                    type="button"
                                    onClick={() => setExpandedOptions(v => v === product.id ? null : product.id)}
                                    className="inline-flex items-center gap-1 rounded-full border border-cup-stroke bg-cup-paper px-3 py-1.5 text-[10px] font-semibold text-cup-muted transition hover:bg-cup-cream-100"
                                  >
                                    <Layers size={11} />
                                    Options
                                    {isOptionsOpen ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                                  </button>
                                )}
                              </div>
                            )}

                            {/* Expandable options editor */}
                            {isOptionsOpen && (
                              <OptionsEditor product={product} canManage={canManage} />
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                ))}
            </div>
          )}
        </>
      )}

      {/* ── Add Product Modal ── */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center sm:p-6"
          onClick={e => { if (e.target === e.currentTarget) setShowAddModal(false); }}
        >
          <form
            onSubmit={handleAddProduct}
            className="relative w-full max-w-lg rounded-card bg-cup-paper shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-cup-stroke px-6 py-4">
              <h2 className="font-heading text-lg font-bold text-cup-brown-900">New Product</h2>
              <button type="button" onClick={() => setShowAddModal(false)} className="grid h-8 w-8 place-items-center rounded-full text-cup-muted transition hover:bg-cup-cream-100">
                <X size={16} />
              </button>
            </div>

            <div className="max-h-[65vh] space-y-4 overflow-y-auto px-6 py-5">
              {/* Category */}
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-cup-muted">Category</label>
                <select
                  required
                  value={addForm.category_id}
                  onChange={e => setAddForm(f => ({ ...f, category_id: e.target.value }))}
                  className="w-full rounded-lg border border-cup-stroke bg-white px-3 py-2.5 text-sm text-cup-brown-900 focus:border-cup-orange-600 focus:outline-none"
                >
                  <option value="">Select category…</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name_en}</option>)}
                </select>
              </div>

              {/* Names */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-cup-muted">Name (EN) *</label>
                  <input required value={addForm.name_en} onChange={e => setAddForm(f => ({ ...f, name_en: e.target.value }))} placeholder="e.g. Oat Latte"
                    className="w-full rounded-lg border border-cup-stroke bg-white px-3 py-2.5 text-sm placeholder:text-cup-muted focus:border-cup-orange-600 focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-cup-muted">Name (AR)</label>
                  <input value={addForm.name_ar} onChange={e => setAddForm(f => ({ ...f, name_ar: e.target.value }))} placeholder="لاتيه شوفان" dir="rtl"
                    className="w-full rounded-lg border border-cup-stroke bg-white px-3 py-2.5 text-sm placeholder:text-cup-muted focus:border-cup-orange-600 focus:outline-none" />
                </div>
              </div>

              {/* Descriptions */}
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-cup-muted">Description (EN)</label>
                <textarea value={addForm.description_en} onChange={e => setAddForm(f => ({ ...f, description_en: e.target.value }))} placeholder="Short product description…" rows={2} maxLength={500}
                  className="w-full resize-none rounded-lg border border-cup-stroke bg-white px-3 py-2 text-sm placeholder:text-cup-muted focus:border-cup-orange-600 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-cup-muted">Description (AR)</label>
                <textarea value={addForm.description_ar} onChange={e => setAddForm(f => ({ ...f, description_ar: e.target.value }))} placeholder="وصف قصير للمنتج…" dir="rtl" rows={2} maxLength={500}
                  className="w-full resize-none rounded-lg border border-cup-stroke bg-white px-3 py-2 text-sm placeholder:text-cup-muted focus:border-cup-orange-600 focus:outline-none" />
              </div>

              {/* Price + Prep time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-cup-muted">Price (EGP) *</label>
                  <input required type="number" min={0.5} step={0.5} value={addForm.base_price_egp} onChange={e => setAddForm(f => ({ ...f, base_price_egp: e.target.value }))} placeholder="65"
                    className="w-full rounded-lg border border-cup-stroke bg-white px-3 py-2.5 text-sm placeholder:text-cup-muted focus:border-cup-orange-600 focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-cup-muted">Prep Time (min) *</label>
                  <input required type="number" min={1} max={120} value={addForm.prep_minutes} onChange={e => setAddForm(f => ({ ...f, prep_minutes: e.target.value }))}
                    className="w-full rounded-lg border border-cup-stroke bg-white px-3 py-2.5 text-sm focus:border-cup-orange-600 focus:outline-none" />
                </div>
              </div>

              {/* Image picker */}
              <div>
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-cup-muted">Image</label>
                <div className="mb-2 grid grid-cols-4 gap-2">
                  {PRESET_IMAGES.map(preset => (
                    <button key={preset.url} type="button" onClick={() => setAddForm(f => ({ ...f, image_url: preset.url }))}
                      className={`relative aspect-square overflow-hidden rounded-lg border-2 transition ${addForm.image_url === preset.url ? 'border-cup-orange-600 ring-2 ring-cup-orange-600/25' : 'border-cup-stroke hover:border-cup-brown-400'}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={preset.url} alt={preset.label} className="h-full w-full object-cover" />
                      <span className="absolute inset-x-0 bottom-0 bg-black/50 py-0.5 text-center text-[9px] font-semibold text-white">{preset.label}</span>
                    </button>
                  ))}
                </div>
                <input value={addForm.image_url} onChange={e => setAddForm(f => ({ ...f, image_url: e.target.value }))} placeholder="Or paste a custom image URL…"
                  className="w-full rounded-lg border border-cup-stroke bg-white px-3 py-2 text-sm placeholder:text-cup-muted focus:border-cup-orange-600 focus:outline-none" />
              </div>

              {/* Available toggle */}
              <button type="button" onClick={() => setAddForm(f => ({ ...f, is_available: !f.is_available }))}
                className="flex w-full items-center justify-between rounded-lg border border-cup-stroke bg-white px-4 py-3 transition hover:bg-cup-paper">
                <span className="text-sm font-semibold text-cup-brown-900">Available immediately</span>
                <span className={`relative inline-block h-6 w-11 rounded-full transition ${addForm.is_available ? 'bg-cup-teal-700' : 'bg-cup-brown-400'}`}>
                  <span className={`absolute top-[3px] inline-block h-[18px] w-[18px] rounded-full bg-white shadow transition-all ${addForm.is_available ? 'left-[23px]' : 'left-[3px]'}`} />
                </span>
              </button>

              {addError && (
                <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-cup-error">{addError}</p>
              )}
            </div>

            <div className="flex gap-3 border-t border-cup-stroke px-6 py-4">
              <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 rounded-pill border border-cup-stroke bg-white py-2.5 text-sm font-semibold text-cup-brown-700 transition hover:bg-cup-cream-100">Cancel</button>
              <button type="submit" disabled={addSubmitting} className="flex-1 rounded-pill bg-cup-orange-600 py-2.5 text-sm font-semibold text-white shadow-subtle transition hover:bg-cup-orange-700 disabled:opacity-70">
                {addSubmitting ? 'Adding…' : 'Add Product'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function AvailabilityToggle({ product, disabled, onToggle }: { product: Product; disabled: boolean; onToggle: () => void }) {
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
        available ? 'border-cup-teal-200 bg-cup-teal-100 text-cup-teal-700' : 'border-cup-stroke bg-cup-brown-100 text-cup-brown-700'
      }`}
    >
      <span className={`relative inline-block h-3.5 w-6 rounded-pill transition ${available ? 'bg-cup-teal-700' : 'bg-cup-brown-400'}`} aria-hidden>
        <span className={`absolute top-[2px] inline-block h-2.5 w-2.5 rounded-full bg-white shadow transition-all ${available ? 'left-[12px]' : 'left-[2px]'}`} />
      </span>
      {available ? 'Available' : 'Unavailable'}
    </button>
  );
}
