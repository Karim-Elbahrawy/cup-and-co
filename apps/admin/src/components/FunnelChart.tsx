'use client';

import { Filter } from 'lucide-react';
import type { AdminFunnelReport } from '@/lib/api';

const STAGE_LABELS: Record<string, string> = {
  placed: 'Order placed',
  paid: 'Payment confirmed',
  accepted: 'Accepted by staff',
  completed: 'Completed',
};

export function FunnelChart({ data }: { data: AdminFunnelReport }) {
  const maxCount = Math.max(1, data.stages[0]?.count ?? 1);

  return (
    <section className="rounded-card border border-cup-stroke bg-cup-surface p-5 shadow-card">
      <header className="mb-4 flex items-center gap-2">
        <Filter className="h-4 w-4 text-cup-orange-600" aria-hidden />
        <h2 className="font-heading text-base font-semibold text-cup-brown-900">Order funnel</h2>
      </header>

      <div className="space-y-1">
        {data.stages.map((s, i) => {
          const width = maxCount > 0 ? Math.max(8, (s.count / maxCount) * 100) : 8;
          const dropoff = data.dropoffs[i - 1];
          return (
            <div key={s.stage}>
              {dropoff && dropoff.dropoff > 0 && (
                <div className="flex items-center gap-2 py-1 pl-4">
                  <div className="h-4 w-px bg-cup-stroke" />
                  <span className="text-[10px] font-semibold text-rose-600">
                    ↓ {dropoff.dropoff}% drop-off
                  </span>
                </div>
              )}
              <div className="flex items-center gap-3">
                <div className="w-32 shrink-0 text-right">
                  <span className="text-xs font-semibold text-cup-brown-900">
                    {STAGE_LABELS[s.stage] ?? s.stage}
                  </span>
                </div>
                <div className="flex-1">
                  <div
                    className="flex h-8 items-center rounded-md bg-gradient-to-r from-cup-orange-600 to-cup-orange-400 px-3 transition-all duration-500"
                    style={{ width: `${width}%` }}
                  >
                    <span className="text-xs font-bold text-white">{s.count}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {data.cancelled > 0 && (
        <div className="mt-4 flex items-center gap-2 rounded-chip border border-rose-100 bg-rose-50 px-3 py-2">
          <span className="text-xs text-rose-700">
            <strong>{data.cancelled}</strong> orders cancelled in this period
          </span>
        </div>
      )}
    </section>
  );
}
