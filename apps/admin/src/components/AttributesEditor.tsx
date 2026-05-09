'use client';

/**
 * Per-product Cup AI attributes editor.
 *
 * Lives inline under each menu product's row. Lets the admin set the
 * concierge attributes the matcher uses (temperature, energy, sweetness,
 * caffeine, descriptor tags), or — the magic move — click "Auto-detect"
 * to have the same matcher dictionary infer values from the product's
 * existing name + description.
 *
 * Saves are explicit (admin clicks "Save"); unsaved edits show a dirty badge.
 */

import { useCallback, useEffect, useState } from 'react';
import { Sparkles, Wand2, Loader2, Check, Plus, X } from 'lucide-react';
import { adminApi, type ConciergeAttrs } from '@/lib/api';
import { useToast } from '@/components/Toast';
import type { Product } from '@cup-and-co/types';

interface AttributesEditorProps {
  product: Product;
}

const EMPTY: ConciergeAttrs = {
  energy_level: null,
  sweetness: null,
  temperature: null,
  caffeine_mg: null,
  tags_en: [],
  tags_ar: [],
};

// Curated suggested tags — keeps the vocabulary aligned with the matcher
// dictionary so admins don't fragment the tag space.
const SUGGESTED_TAGS_EN = ['refreshing', 'creamy', 'nutty', 'fruity', 'bitter', 'sweet', 'savoury', 'classic'];
const SUGGESTED_TAGS_AR = ['منعش', 'كريمي', 'بالمكسرات', 'فواكه', 'مر', 'حلو', 'سادة', 'كلاسيكي'];

export function AttributesEditor({ product }: AttributesEditorProps) {
  const toast = useToast();
  const [attrs, setAttrs] = useState<ConciergeAttrs | null>(null);
  const [original, setOriginal] = useState<ConciergeAttrs | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [tagInputEn, setTagInputEn] = useState('');
  const [tagInputAr, setTagInputAr] = useState('');

  const load = useCallback(async () => {
    if (attrs !== null) return;
    setLoading(true);
    try {
      const res = await adminApi.getProductAttrs(product.id);
      setAttrs(res.attrs);
      setOriginal(res.attrs);
    } catch (err) {
      toast('error', (err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [attrs, product.id, toast]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dirty = attrs !== null && original !== null && JSON.stringify(attrs) !== JSON.stringify(original);

  function patch<K extends keyof ConciergeAttrs>(key: K, value: ConciergeAttrs[K]) {
    setAttrs((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function addTag(lang: 'en' | 'ar', value: string) {
    const trimmed = value.trim();
    if (!trimmed || !attrs) return;
    const key = lang === 'en' ? 'tags_en' : 'tags_ar';
    if (attrs[key].includes(trimmed)) return;
    patch(key, [...attrs[key], trimmed]);
    if (lang === 'en') setTagInputEn(''); else setTagInputAr('');
  }

  function removeTag(lang: 'en' | 'ar', value: string) {
    if (!attrs) return;
    const key = lang === 'en' ? 'tags_en' : 'tags_ar';
    patch(key, attrs[key].filter((t) => t !== value));
  }

  async function autoDetect() {
    setDetecting(true);
    try {
      const res = await adminApi.autoDetectAttrs(product.id);
      setAttrs(res.inferred);
      toast('success', 'Attributes auto-detected — review and save');
    } catch (err) {
      toast('error', (err as Error).message);
    } finally {
      setDetecting(false);
    }
  }

  async function save() {
    if (!attrs || !dirty) return;
    setSaving(true);
    try {
      await adminApi.setProductAttrs(product.id, attrs);
      setOriginal(attrs);
      toast('success', 'Attributes saved');
    } catch (err) {
      toast('error', (err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    setAttrs(original);
  }

  if (loading || !attrs) {
    return (
      <div className="mt-3 rounded-lg border border-cup-stroke bg-cup-cream-100 p-3 animate-pulse">
        <div className="flex items-center gap-2 text-xs text-cup-muted">
          <Loader2 className="h-3 w-3 animate-spin" />
          Loading Cup AI attributes…
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-lg border border-cup-stroke bg-gradient-to-br from-amber-50 to-cup-cream-100 p-3">
      <div className="mb-3 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-cup-brown-700">
          <Sparkles className="h-3 w-3 text-cup-orange-600" /> Cup AI attributes
          {dirty && (
            <span className="rounded-full bg-amber-200 px-1.5 py-0.5 text-[9px] font-bold text-amber-800">
              UNSAVED
            </span>
          )}
        </span>
        <button
          type="button"
          onClick={autoDetect}
          disabled={detecting}
          className="flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-cup-orange-700 shadow-sm transition hover:bg-cup-orange-50 disabled:opacity-50"
        >
          {detecting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
          Auto-detect
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {/* Temperature */}
        <Field label="Temperature">
          <select
            value={attrs.temperature ?? ''}
            onChange={(e) => patch('temperature', (e.target.value || null) as ConciergeAttrs['temperature'])}
            className="w-full rounded border border-cup-stroke bg-white px-2 py-1 text-xs focus:border-cup-orange-600 focus:outline-none"
          >
            <option value="">—</option>
            <option value="hot">Hot</option>
            <option value="cold">Cold</option>
            <option value="both">Both</option>
          </select>
        </Field>

        {/* Energy */}
        <Field label="Energy">
          <select
            value={attrs.energy_level ?? ''}
            onChange={(e) => patch('energy_level', (e.target.value || null) as ConciergeAttrs['energy_level'])}
            className="w-full rounded border border-cup-stroke bg-white px-2 py-1 text-xs focus:border-cup-orange-600 focus:outline-none"
          >
            <option value="">—</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </Field>

        {/* Sweetness 0–5 */}
        <Field label={`Sweetness ${attrs.sweetness ?? '—'}/5`}>
          <input
            type="range"
            min={0}
            max={5}
            step={1}
            value={attrs.sweetness ?? 0}
            onChange={(e) => patch('sweetness', Number(e.target.value))}
            onDoubleClick={() => patch('sweetness', null)}
            className="w-full accent-cup-orange-600"
            title="Double-click to clear"
          />
        </Field>

        {/* Caffeine mg */}
        <Field label="Caffeine (mg)">
          <input
            type="number"
            min={0}
            max={500}
            value={attrs.caffeine_mg ?? ''}
            onChange={(e) => patch('caffeine_mg', e.target.value === '' ? null : Number(e.target.value))}
            placeholder="—"
            className="w-full rounded border border-cup-stroke bg-white px-2 py-1 text-xs focus:border-cup-orange-600 focus:outline-none"
          />
        </Field>
      </div>

      {/* Tags */}
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <TagField
          label="Tags (EN)"
          tags={attrs.tags_en}
          input={tagInputEn}
          onInputChange={setTagInputEn}
          onAdd={(v) => addTag('en', v)}
          onRemove={(v) => removeTag('en', v)}
          suggestions={SUGGESTED_TAGS_EN.filter((t) => !attrs.tags_en.includes(t))}
          dir="ltr"
        />
        <TagField
          label="Tags (AR)"
          tags={attrs.tags_ar}
          input={tagInputAr}
          onInputChange={setTagInputAr}
          onAdd={(v) => addTag('ar', v)}
          onRemove={(v) => removeTag('ar', v)}
          suggestions={SUGGESTED_TAGS_AR.filter((t) => !attrs.tags_ar.includes(t))}
          dir="rtl"
        />
      </div>

      {/* Action bar */}
      {dirty && (
        <div className="mt-3 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={reset}
            disabled={saving}
            className="rounded-pill border border-cup-stroke bg-white px-3 py-1 text-[11px] font-semibold text-cup-brown-700 hover:bg-cup-cream-100 disabled:opacity-50"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="flex items-center gap-1 rounded-pill bg-cup-orange-600 px-3 py-1 text-[11px] font-semibold text-white shadow-warm-glow transition hover:bg-cup-orange-700 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
            Save
          </button>
        </div>
      )}
    </div>
  );
}

// ── Subcomponents ──────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-cup-muted">
        {label}
      </span>
      {children}
    </label>
  );
}

interface TagFieldProps {
  label: string;
  tags: string[];
  input: string;
  onInputChange: (v: string) => void;
  onAdd: (v: string) => void;
  onRemove: (v: string) => void;
  suggestions: string[];
  dir: 'ltr' | 'rtl';
}

function TagField({ label, tags, input, onInputChange, onAdd, onRemove, suggestions, dir }: TagFieldProps) {
  return (
    <div>
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-cup-muted">
        {label}
      </span>
      <div dir={dir} className="flex flex-wrap items-center gap-1.5 rounded border border-cup-stroke bg-white p-1.5">
        {tags.map((t) => (
          <span key={t} className="flex items-center gap-1 rounded-full bg-cup-orange-100 px-2 py-0.5 text-[10px] font-semibold text-cup-orange-700">
            {t}
            <button
              type="button"
              onClick={() => onRemove(t)}
              aria-label={`Remove ${t}`}
              className="grid h-3.5 w-3.5 place-items-center rounded-full text-cup-orange-700 hover:bg-cup-orange-200"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          dir={dir}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              onAdd(input);
            } else if (e.key === 'Backspace' && !input && tags.length) {
              onRemove(tags[tags.length - 1]);
            }
          }}
          placeholder="+ tag"
          className="min-w-[60px] flex-1 bg-transparent px-1 py-0.5 text-xs focus:outline-none"
        />
      </div>
      {suggestions.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {suggestions.slice(0, 6).map((s) => (
            <button
              key={s}
              type="button"
              dir={dir}
              onClick={() => onAdd(s)}
              className="flex items-center gap-0.5 rounded-full border border-cup-stroke bg-white px-2 py-0.5 text-[10px] text-cup-muted hover:border-cup-orange-300 hover:text-cup-orange-700"
            >
              <Plus className="h-2.5 w-2.5" /> {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
