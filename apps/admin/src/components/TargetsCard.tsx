'use client';

import { useCallback, useEffect, useState } from 'react';
import { Target } from 'lucide-react';
import { formatEgp } from '@/lib/format';
import { adminApi, type AdminTarget } from '@/lib/api';

export function TargetsCard() {
  const [targets, setTargets] = useState<AdminTarget[]>([]);
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [revTarget, setRevTarget] = useState('');
  const [ordTarget, setOrdTarget] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await adminApi.getTargets();
    setTargets(res.targets ?? []);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function save() {
    setSaving(true);
    try {
      await adminApi.setTarget(month, {
        revenueTarget: Number(revTarget) || 0,
        ordersTarget: Number(ordTarget) || 0,
        note: note || undefined,
      });
      setRevTarget('');
      setOrdTarget('');
      setNote('');
      load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-card border border-cup-stroke bg-cup-surface p-5 shadow-card">
      <header className="mb-4 flex items-center gap-2">
        <Target className="h-4 w-4 text-cup-orange-600" aria-hidden />
        <h2 className="font-heading text-base font-semibold text-cup-brown-900">
          Monthly targets
        </h2>
      </header>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase text-cup-muted">Month</label>
          <input type="month" value={month} onChange={e => setMonth(e.target.value)}
            className="rounded-lg border border-cup-stroke px-2 py-1.5 text-xs focus:border-cup-orange-600 focus:outline-none" />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase text-cup-muted">Revenue goal (EGP)</label>
          <input type="number" value={revTarget} onChange={e => setRevTarget(e.target.value)} placeholder="50000"
            className="w-28 rounded-lg border border-cup-stroke px-2 py-1.5 text-xs focus:border-cup-orange-600 focus:outline-none" />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase text-cup-muted">Orders goal</label>
          <input type="number" value={ordTarget} onChange={e => setOrdTarget(e.target.value)} placeholder="500"
            className="w-24 rounded-lg border border-cup-stroke px-2 py-1.5 text-xs focus:border-cup-orange-600 focus:outline-none" />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase text-cup-muted">Note</label>
          <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="Optional"
            className="w-36 rounded-lg border border-cup-stroke px-2 py-1.5 text-xs focus:border-cup-orange-600 focus:outline-none" />
        </div>
        <button type="button" onClick={save} disabled={saving}
          className="rounded-pill bg-cup-brown-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-cup-brown-800 disabled:opacity-40">
          {saving ? 'Saving…' : 'Set target'}
        </button>
      </div>

      {targets.length > 0 && (
        <div className="overflow-hidden rounded-chip border border-cup-stroke">
          <table className="w-full text-left text-sm">
            <thead className="bg-cup-cream-100 text-xs font-semibold uppercase text-cup-muted">
              <tr>
                <th className="px-4 py-2">Month</th>
                <th className="px-4 py-2 text-right">Revenue target</th>
                <th className="px-4 py-2 text-right">Orders target</th>
                <th className="px-4 py-2">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cup-stroke">
              {targets.slice(0, 12).map(t => (
                <tr key={t.month}>
                  <td className="px-4 py-2 font-medium text-cup-brown-900">{t.month}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-cup-brown-900">{formatEgp(t.revenueTarget)}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-cup-brown-700">{t.ordersTarget}</td>
                  <td className="px-4 py-2 text-xs text-cup-muted">{t.note || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
