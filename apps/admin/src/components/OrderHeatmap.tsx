'use client';

import { Grid3X3 } from 'lucide-react';
import type { AdminHeatmapReport } from '@/lib/api';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function OrderHeatmap({ data }: { data: AdminHeatmapReport }) {
  const maxVal = Math.max(1, ...data.grid.flat());

  function intensity(value: number): string {
    if (value === 0) return 'bg-cup-cream-50';
    const ratio = value / maxVal;
    if (ratio < 0.2) return 'bg-orange-100';
    if (ratio < 0.4) return 'bg-orange-200';
    if (ratio < 0.6) return 'bg-orange-300';
    if (ratio < 0.8) return 'bg-orange-400';
    return 'bg-orange-600';
  }

  return (
    <section className="rounded-card border border-cup-stroke bg-cup-surface p-5 shadow-card">
      <header className="mb-4 flex items-center gap-2">
        <Grid3X3 className="h-4 w-4 text-cup-orange-600" aria-hidden />
        <h2 className="font-heading text-base font-semibold text-cup-brown-900">
          Order heatmap
        </h2>
        <span className="text-xs text-cup-muted">(day × hour)</span>
      </header>

      <div className="overflow-x-auto">
        <div className="min-w-[640px]">
          {/* Hour labels */}
          <div className="mb-1 flex">
            <div className="w-10 shrink-0" />
            {Array.from({ length: 24 }, (_, h) => (
              <div key={h} className="flex-1 text-center text-[9px] text-cup-muted">
                {h.toString().padStart(2, '0')}
              </div>
            ))}
          </div>

          {/* Grid rows */}
          {data.grid.map((row, dayIdx) => (
            <div key={dayIdx} className="flex items-center gap-0">
              <div className="w-10 shrink-0 text-[11px] font-semibold text-cup-brown-700">
                {DAY_LABELS[dayIdx]}
              </div>
              {row.map((val, hourIdx) => (
                <div
                  key={hourIdx}
                  className={`flex-1 aspect-square rounded-sm mx-[1px] my-[1px] transition-colors ${intensity(val)}`}
                  title={`${DAY_LABELS[dayIdx]} ${hourIdx}:00 — ${val} orders`}
                />
              ))}
            </div>
          ))}

          {/* Legend */}
          <div className="mt-3 flex items-center justify-end gap-2">
            <span className="text-[10px] text-cup-muted">Less</span>
            {['bg-cup-cream-50', 'bg-orange-100', 'bg-orange-200', 'bg-orange-300', 'bg-orange-400', 'bg-orange-600'].map((c) => (
              <div key={c} className={`h-3 w-3 rounded-sm ${c}`} />
            ))}
            <span className="text-[10px] text-cup-muted">More</span>
          </div>
        </div>
      </div>
    </section>
  );
}
