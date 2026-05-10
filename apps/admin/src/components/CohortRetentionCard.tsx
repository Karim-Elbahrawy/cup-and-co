'use client';

import { Users } from 'lucide-react';
import type { AdminCohortRow } from '@/lib/api';

export function CohortRetentionCard({ cohorts }: { cohorts: AdminCohortRow[] }) {
  const nonEmpty = cohorts.filter(c => c.size > 0);
  if (nonEmpty.length === 0) return null;

  const maxWeeks = Math.max(...nonEmpty.map(c => c.retention.length));

  function cellColor(pct: number): string {
    if (pct >= 80) return 'bg-emerald-600 text-white';
    if (pct >= 60) return 'bg-emerald-400 text-white';
    if (pct >= 40) return 'bg-emerald-200 text-emerald-900';
    if (pct >= 20) return 'bg-emerald-100 text-emerald-800';
    if (pct > 0) return 'bg-emerald-50 text-emerald-700';
    return 'bg-cup-cream-50 text-cup-muted';
  }

  return (
    <section className="rounded-card border border-cup-stroke bg-cup-surface p-5 shadow-card">
      <header className="mb-4 flex items-center gap-2">
        <Users className="h-4 w-4 text-cup-orange-600" aria-hidden />
        <h2 className="font-heading text-base font-semibold text-cup-brown-900">
          Cohort retention
        </h2>
        <span className="text-xs text-cup-muted">(weekly)</span>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr>
              <th className="px-2 py-1.5 text-left font-semibold text-cup-muted">Cohort</th>
              <th className="px-2 py-1.5 text-right font-semibold text-cup-muted">Size</th>
              {Array.from({ length: Math.min(maxWeeks, 12) }, (_, i) => (
                <th key={i} className="px-1.5 py-1.5 text-center font-semibold text-cup-muted">
                  W{i}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {nonEmpty.slice(-10).map((c) => (
              <tr key={c.week}>
                <td className="px-2 py-1 font-medium text-cup-brown-900">{c.week.slice(5)}</td>
                <td className="px-2 py-1 text-right tabular-nums text-cup-brown-700">{c.size}</td>
                {c.retention.slice(0, 12).map((pct, i) => (
                  <td key={i} className="px-0.5 py-0.5">
                    <div className={`rounded px-1.5 py-1 text-center font-semibold tabular-nums ${cellColor(pct)}`}>
                      {pct > 0 ? `${pct}%` : '—'}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
