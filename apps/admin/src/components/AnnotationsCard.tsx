'use client';

import { useCallback, useEffect, useState } from 'react';
import { StickyNote, Trash2 } from 'lucide-react';
import { adminApi, type AdminAnnotation } from '@/lib/api';

export function AnnotationsCard({ dateRange }: { dateRange?: { from?: string; to?: string } }) {
  const [annotations, setAnnotations] = useState<AdminAnnotation[]>([]);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await adminApi.getAnnotations(dateRange);
    setAnnotations(res.annotations ?? []);
  }, [dateRange]);

  useEffect(() => { load(); }, [load]);

  async function add() {
    if (!date || !text.trim()) return;
    setSaving(true);
    try {
      await adminApi.createAnnotation(date, text.trim());
      setText('');
      load();
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    await adminApi.deleteAnnotation(id);
    load();
  }

  return (
    <section className="rounded-card border border-cup-stroke bg-cup-surface p-5 shadow-card">
      <header className="mb-4 flex items-center gap-2">
        <StickyNote className="h-4 w-4 text-cup-orange-600" aria-hidden />
        <h2 className="font-heading text-base font-semibold text-cup-brown-900">
          Annotations
        </h2>
        <span className="text-xs text-cup-muted">Pin notes to dates</span>
      </header>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase text-cup-muted">Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="rounded-lg border border-cup-stroke px-2 py-1.5 text-xs focus:border-cup-orange-600 focus:outline-none" />
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-[10px] font-semibold uppercase text-cup-muted">Note</label>
          <input type="text" value={text} onChange={e => setText(e.target.value)} placeholder="e.g. Ramadan promo launched"
            className="w-full rounded-lg border border-cup-stroke px-2 py-1.5 text-xs focus:border-cup-orange-600 focus:outline-none" />
        </div>
        <button type="button" onClick={add} disabled={saving || !text.trim()}
          className="rounded-pill bg-cup-brown-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-cup-brown-800 disabled:opacity-40">
          {saving ? 'Adding…' : 'Add'}
        </button>
      </div>

      {annotations.length > 0 && (
        <div className="space-y-2">
          {annotations.map(a => (
            <div key={a.id} className="flex items-center justify-between rounded-chip border border-cup-stroke px-3 py-2">
              <div className="flex items-center gap-3">
                <span className="rounded bg-cup-cream-100 px-2 py-0.5 text-[10px] font-bold text-cup-brown-700">{a.date}</span>
                <span className="text-xs text-cup-brown-900">{a.text}</span>
              </div>
              <button type="button" onClick={() => remove(a.id)}
                className="rounded p-1 text-cup-muted transition hover:bg-rose-50 hover:text-rose-600">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {annotations.length === 0 && (
        <p className="text-xs text-cup-muted">No annotations yet. Pin notes to important dates to remember context behind metrics.</p>
      )}
    </section>
  );
}
