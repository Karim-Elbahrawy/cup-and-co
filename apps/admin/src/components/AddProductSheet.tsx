'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { adminApi, ApiError } from '@/lib/api';
import type { Category, Product } from '@cup-and-co/types';

interface AddProductSheetProps {
  open: boolean;
  onClose: () => void;
  categories: Category[];
  /** Called after a successful create so the parent can splice the new product into its list. */
  onCreated: (product: Product) => void;
  /** Optional: pass a product to switch the sheet into edit mode. */
  editing?: Product | null;
  onUpdated?: (product: Product) => void;
}

interface FormState {
  category_id: string;
  name_en: string;
  name_ar: string;
  description_en: string;
  description_ar: string;
  base_price_egp: string;
  image_url: string;
  prep_minutes: string;
}

const EMPTY: FormState = {
  category_id: '',
  name_en: '',
  name_ar: '',
  description_en: '',
  description_ar: '',
  base_price_egp: '',
  image_url: '',
  prep_minutes: '5',
};

/**
 * Right-side slide-over for creating a new menu item. Owner-only.
 *
 * Validates client-side first so the API only sees clean payloads, then on
 * success calls `onCreated(product)` so the menu page can splice it in
 * without a refetch.
 */
export function AddProductSheet({
  open,
  onClose,
  categories,
  onCreated,
  editing,
  onUpdated,
}: AddProductSheetProps) {
  const isEdit = Boolean(editing);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  // Reset + focus first field when opened
  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        category_id: editing.category_id,
        name_en: editing.name_en,
        name_ar: editing.name_ar,
        description_en: editing.description_en ?? '',
        description_ar: editing.description_ar ?? '',
        base_price_egp: String(editing.base_price_egp),
        image_url: editing.image_url ?? '',
        prep_minutes: String(editing.prep_minutes ?? 5),
      });
    } else {
      setForm({ ...EMPTY, category_id: categories[0]?.id ?? '' });
    }
    setError(null);
    setTimeout(() => firstFieldRef.current?.focus(), 60);
  }, [open, categories, editing]);

  // Lock scroll + ESC to close
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose, submitting]);

  if (!open) return null;

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    const price = Number(form.base_price_egp);
    if (!form.category_id) return setError('Pick a category.');
    if (!form.name_en.trim()) return setError('English name is required.');
    if (!form.name_ar.trim()) return setError('Arabic name is required.');
    if (!Number.isFinite(price) || price <= 0) return setError('Price must be a positive number.');

    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        category_id: form.category_id,
        name_en: form.name_en.trim(),
        name_ar: form.name_ar.trim(),
        description_en: form.description_en.trim() || null,
        description_ar: form.description_ar.trim() || null,
        base_price_egp: price,
        image_url: form.image_url.trim() || null,
        prep_minutes: form.prep_minutes ? Number(form.prep_minutes) : null,
      };
      if (editing && onUpdated) {
        const { product } = await adminApi.updateProduct(editing.id, payload);
        onUpdated(product);
      } else {
        const { product } = await adminApi.createProduct(payload);
        onCreated(product);
      }
      onClose();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : isEdit
            ? 'Could not update product.'
            : 'Could not create product.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="add-product-title">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close"
        onClick={() => !submitting && onClose()}
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
      />

      {/* Slide-over panel */}
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-cup-surface shadow-2xl animate-[slideInRight_0.2s_ease-out]">
        <header className="flex items-center justify-between border-b border-cup-stroke px-5 py-4">
          <div>
            <h2 id="add-product-title" className="font-heading text-lg font-bold text-cup-brown-900">
              {isEdit ? 'Edit product' : 'Add product'}
            </h2>
            <p className="mt-0.5 text-xs text-cup-muted">
              {isEdit ? 'Update fields and save.' : 'New menu item — owners only.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close"
            className="grid h-9 w-9 place-items-center rounded-chip border border-cup-stroke bg-white text-cup-brown-700 transition active:scale-95 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cup-orange-600"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto">
          <div className="flex-1 space-y-4 px-5 py-5">
            <Field label="Category" required>
              <select
                value={form.category_id}
                onChange={(e) => update('category_id', e.target.value)}
                required
                className="w-full rounded-chip border border-cup-stroke bg-white px-3 py-2 text-sm text-cup-brown-900 focus:border-cup-orange-600 focus:outline-none"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name_en}
                  </option>
                ))}
              </select>
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Name (English)" required>
                <input
                  ref={firstFieldRef}
                  type="text"
                  value={form.name_en}
                  onChange={(e) => update('name_en', e.target.value)}
                  maxLength={80}
                  required
                  placeholder="e.g. Vanilla Cold Brew"
                  className="w-full rounded-chip border border-cup-stroke bg-white px-3 py-2 text-sm text-cup-brown-900 placeholder:text-cup-muted focus:border-cup-orange-600 focus:outline-none"
                />
              </Field>
              <Field label="Name (Arabic)" required>
                <input
                  type="text"
                  value={form.name_ar}
                  onChange={(e) => update('name_ar', e.target.value)}
                  maxLength={80}
                  required
                  placeholder="مثل: كولد برو فانيليا"
                  dir="rtl"
                  className="w-full rounded-chip border border-cup-stroke bg-white px-3 py-2 text-sm text-cup-brown-900 placeholder:text-cup-muted focus:border-cup-orange-600 focus:outline-none"
                />
              </Field>
            </div>

            <Field label="Description (English)">
              <textarea
                value={form.description_en}
                onChange={(e) => update('description_en', e.target.value)}
                rows={2}
                maxLength={500}
                placeholder="Short tasting note customers see on the product page."
                className="w-full resize-none rounded-chip border border-cup-stroke bg-white px-3 py-2 text-sm text-cup-brown-900 placeholder:text-cup-muted focus:border-cup-orange-600 focus:outline-none"
              />
            </Field>

            <Field label="Description (Arabic)">
              <textarea
                value={form.description_ar}
                onChange={(e) => update('description_ar', e.target.value)}
                rows={2}
                maxLength={500}
                dir="rtl"
                placeholder="ملاحظة تذوق قصيرة يراها العميل."
                className="w-full resize-none rounded-chip border border-cup-stroke bg-white px-3 py-2 text-sm text-cup-brown-900 placeholder:text-cup-muted focus:border-cup-orange-600 focus:outline-none"
              />
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Base price (EGP)" required>
                <input
                  type="number"
                  inputMode="decimal"
                  min={1}
                  max={10000}
                  step={1}
                  value={form.base_price_egp}
                  onChange={(e) => update('base_price_egp', e.target.value)}
                  required
                  placeholder="65"
                  className="w-full rounded-chip border border-cup-stroke bg-white px-3 py-2 text-sm text-cup-brown-900 placeholder:text-cup-muted focus:border-cup-orange-600 focus:outline-none"
                />
              </Field>
              <Field label="Prep minutes">
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={60}
                  step={1}
                  value={form.prep_minutes}
                  onChange={(e) => update('prep_minutes', e.target.value)}
                  className="w-full rounded-chip border border-cup-stroke bg-white px-3 py-2 text-sm text-cup-brown-900 focus:border-cup-orange-600 focus:outline-none"
                />
              </Field>
            </div>

            <Field label="Image URL" hint="Leave blank to use a default placeholder.">
              <input
                type="url"
                value={form.image_url}
                onChange={(e) => update('image_url', e.target.value)}
                placeholder="/images/products/your-slug.svg"
                className="w-full rounded-chip border border-cup-stroke bg-white px-3 py-2 text-sm text-cup-brown-900 placeholder:text-cup-muted focus:border-cup-orange-600 focus:outline-none"
              />
            </Field>

            {error && (
              <p
                role="alert"
                className="rounded-chip border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-cup-error"
              >
                {error}
              </p>
            )}
          </div>

          <footer className="border-t border-cup-stroke bg-cup-surface px-5 py-4">
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="rounded-pill border border-cup-stroke bg-white px-4 py-2 text-sm font-semibold text-cup-brown-700 transition hover:bg-cup-cream-100 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cup-orange-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-pill bg-cup-orange-600 px-5 py-2 text-sm font-semibold text-white shadow-subtle transition hover:bg-cup-orange-700 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cup-orange-600"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Add product'}
              </button>
            </div>
          </footer>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-cup-muted">
        {label}
        {required && <span className="text-cup-orange-600">*</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-cup-muted">{hint}</span>}
    </label>
  );
}
