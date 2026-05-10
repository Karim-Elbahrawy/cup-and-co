'use client';

import { useCallback, useEffect, useState } from 'react';
import { Bookmark, Plus, X } from 'lucide-react';
import { adminApi, type AdminSavedView } from '@/lib/api';

interface Props {
  currentPreset: string;
  currentFrom?: string;
  currentTo?: string;
  onApply: (preset: string, from?: string, to?: string) => void;
}

export function SavedViewsBar({ currentPreset, currentFrom, currentTo, onApply }: Props) {
  const [views, setViews] = useState<AdminSavedView[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await adminApi.getSavedViews();
    setViews(res.views ?? []);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await adminApi.createSavedView(name.trim(), currentPreset, currentFrom, currentTo);
      setName('');
      setShowAdd(false);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    await adminApi.deleteSavedView(id);
    load();
  }

  if (views.length === 0 && !showAdd) {
    return (
      <div className="flex items-center gap-2">
        <Bookmark className="h-3.5 w-3.5 text-cup-muted" />
        <button type="button" onClick={() => setShowAdd(true)}
          className="flex items-center gap-1 text-[11px] font-semibold text-cup-muted hover:text-cup-brown-900">
          <Plus className="h-3 w-3" /> Save current view
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Bookmark className="h-3.5 w-3.5 text-cup-muted" />
      {views.map(v => (
        <div key={v.id} className="group flex items-center gap-1 rounded-full border border-cup-stroke bg-cup-cream-50 px-2.5 py-1">
          <button type="button" onClick={() => onApply(v.preset, v.from, v.to)}
            className="text-[11px] font-semibold text-cup-brown-900 hover:text-cup-orange-600">
            {v.name}
          </button>
          <button type="button" onClick={() => remove(v.id)}
            className="hidden text-cup-muted hover:text-rose-600 group-hover:block">
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
      {showAdd ? (
        <div className="flex items-center gap-1.5">
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="View name"
            className="w-28 rounded-lg border border-cup-stroke px-2 py-1 text-[11px] focus:border-cup-orange-600 focus:outline-none"
            onKeyDown={e => e.key === 'Enter' && save()} autoFocus />
          <button type="button" onClick={save} disabled={saving || !name.trim()}
            className="rounded-full bg-cup-brown-900 px-2.5 py-1 text-[10px] font-semibold text-white disabled:opacity-40">
            Save
          </button>
          <button type="button" onClick={() => setShowAdd(false)} className="text-cup-muted hover:text-cup-brown-900">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => setShowAdd(true)}
          className="flex items-center gap-0.5 rounded-full border border-dashed border-cup-stroke px-2 py-1 text-[10px] font-semibold text-cup-muted hover:border-cup-brown-400 hover:text-cup-brown-900">
          <Plus className="h-3 w-3" /> Save view
        </button>
      )}
    </div>
  );
}
