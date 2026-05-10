'use client';

import { AlertTriangle, ArrowUp, ArrowDown } from 'lucide-react';
import { formatEgp } from '@/lib/format';
import type { AdminAnomalyReport } from '@/lib/api';

export function AnomalyCard({ data }: { data: AdminAnomalyReport }) {
  const todayStatus = Math.abs(data.today.deviation) >= data.threshold;

  return (
    <section className="rounded-card border border-cup-stroke bg-cup-surface p-5 shadow-card">
      <header className="mb-4 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-cup-orange-600" aria-hidden />
        <h2 className="font-heading text-base font-semibold text-cup-brown-900">
          Anomaly detection
        </h2>
      </header>

      {/* Today's pulse */}
      <div className={`mb-4 rounded-chip border px-4 py-3 ${
        todayStatus
          ? data.today.deviation > 0
            ? 'border-emerald-200 bg-emerald-50'
            : 'border-rose-200 bg-rose-50'
          : 'border-cup-stroke bg-cup-cream-50'
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-cup-muted">Today</p>
            <p className="mt-0.5 font-heading text-xl font-bold text-cup-brown-900">
              {formatEgp(data.today.revenue)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-cup-muted">vs expected {formatEgp(data.today.expected)}</p>
            <p className={`mt-0.5 flex items-center justify-end gap-1 font-heading text-lg font-bold ${
              data.today.deviation > 0 ? 'text-emerald-700' : data.today.deviation < 0 ? 'text-rose-700' : 'text-cup-brown-700'
            }`}>
              {data.today.deviation > 0 ? <ArrowUp className="h-4 w-4" /> : data.today.deviation < 0 ? <ArrowDown className="h-4 w-4" /> : null}
              {data.today.deviation > 0 ? '+' : ''}{data.today.deviation}%
            </p>
          </div>
        </div>
      </div>

      {/* Anomaly list */}
      {data.anomalies.length > 0 ? (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-cup-muted">
            Recent anomalies ({'>'}±{data.threshold}% from DOW average)
          </p>
          {data.anomalies.slice(0, 8).map((a) => (
            <div key={a.date} className="flex items-center justify-between rounded-chip border border-cup-stroke px-3 py-2">
              <div className="flex items-center gap-2">
                <span className={`grid h-6 w-6 place-items-center rounded-full ${
                  a.type === 'spike' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                }`}>
                  {a.type === 'spike' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                </span>
                <div>
                  <p className="text-xs font-semibold text-cup-brown-900">{a.date}</p>
                  <p className="text-[10px] text-cup-muted">
                    Actual: {formatEgp(a.revenue)} · Expected: {formatEgp(a.expected)}
                  </p>
                </div>
              </div>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                a.type === 'spike' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
              }`}>
                {a.deviation > 0 ? '+' : ''}{a.deviation}%
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-cup-muted">No anomalies detected in the last {data.threshold}% threshold window.</p>
      )}
    </section>
  );
}
