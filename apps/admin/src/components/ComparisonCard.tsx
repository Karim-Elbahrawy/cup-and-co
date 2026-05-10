'use client';

import { useState } from 'react';
import { GitCompare, ArrowUp, ArrowDown } from 'lucide-react';
import { formatEgp } from '@/lib/format';
import { adminApi, type AdminComparisonReport } from '@/lib/api';

export function ComparisonCard() {
  const [from1, setFrom1] = useState('');
  const [to1, setTo1] = useState('');
  const [from2, setFrom2] = useState('');
  const [to2, setTo2] = useState('');
  const [data, setData] = useState<AdminComparisonReport | null>(null);
  const [loading, setLoading] = useState(false);

  async function compare() {
    if (!from1 || !to1 || !from2 || !to2) return;
    setLoading(true);
    try {
      const result = await adminApi.getComparison(from1, to1, from2, to2);
      setData(result);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-card border border-cup-stroke bg-cup-surface p-5 shadow-card">
      <header className="mb-4 flex items-center gap-2">
        <GitCompare className="h-4 w-4 text-cup-orange-600" aria-hidden />
        <h2 className="font-heading text-base font-semibold text-cup-brown-900">
          Period comparison
        </h2>
      </header>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase text-cup-muted">Period A</p>
          <div className="flex items-center gap-1.5">
            <input type="date" value={from1} onChange={e => setFrom1(e.target.value)}
              className="rounded-lg border border-cup-stroke px-2 py-1.5 text-xs focus:border-cup-orange-600 focus:outline-none" />
            <span className="text-xs text-cup-muted">to</span>
            <input type="date" value={to1} onChange={e => setTo1(e.target.value)}
              className="rounded-lg border border-cup-stroke px-2 py-1.5 text-xs focus:border-cup-orange-600 focus:outline-none" />
          </div>
        </div>
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase text-cup-muted">Period B</p>
          <div className="flex items-center gap-1.5">
            <input type="date" value={from2} onChange={e => setFrom2(e.target.value)}
              className="rounded-lg border border-cup-stroke px-2 py-1.5 text-xs focus:border-cup-orange-600 focus:outline-none" />
            <span className="text-xs text-cup-muted">to</span>
            <input type="date" value={to2} onChange={e => setTo2(e.target.value)}
              className="rounded-lg border border-cup-stroke px-2 py-1.5 text-xs focus:border-cup-orange-600 focus:outline-none" />
          </div>
        </div>
        <button type="button" onClick={compare} disabled={loading || !from1 || !to1 || !from2 || !to2}
          className="rounded-pill bg-cup-brown-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-cup-brown-800 disabled:opacity-40">
          {loading ? 'Comparing…' : 'Compare'}
        </button>
      </div>

      {data && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCompare label="Revenue" a={formatEgp(data.period1.revenue)} b={formatEgp(data.period2.revenue)} delta={data.delta.revenue} />
          <MetricCompare label="Orders" a={String(data.period1.orders)} b={String(data.period2.orders)} delta={data.delta.orders} />
          <MetricCompare label="Customers" a={String(data.period1.customers)} b={String(data.period2.customers)} delta={data.delta.customers} />
          <MetricCompare label="AOV" a={formatEgp(data.period1.aov)} b={formatEgp(data.period2.aov)} delta={data.delta.aov} />
        </div>
      )}
    </section>
  );
}

function MetricCompare({ label, a, b, delta }: { label: string; a: string; b: string; delta: number }) {
  return (
    <div className="rounded-chip border border-cup-stroke bg-cup-cream-50 px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-cup-muted">{label}</p>
      <div className="mt-1 flex items-baseline justify-between gap-2">
        <span className="font-heading text-lg font-bold text-cup-brown-900">{a}</span>
        <span className="text-xs text-cup-muted">vs {b}</span>
      </div>
      <p className={`mt-1 flex items-center gap-1 text-xs font-bold ${
        delta > 0 ? 'text-emerald-700' : delta < 0 ? 'text-rose-700' : 'text-cup-brown-700'
      }`}>
        {delta > 0 ? <ArrowUp className="h-3 w-3" /> : delta < 0 ? <ArrowDown className="h-3 w-3" /> : null}
        {delta > 0 ? '+' : ''}{delta}%
      </p>
    </div>
  );
}
