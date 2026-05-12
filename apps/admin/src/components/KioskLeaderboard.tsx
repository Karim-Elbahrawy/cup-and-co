'use client';

import { Trophy } from 'lucide-react';
import { formatEgp } from '@/lib/format';
import type { AdminKioskLeaderboardRow } from '@/lib/api';

export function KioskLeaderboard({ rows }: { rows: AdminKioskLeaderboardRow[] }) {
  if (rows.length === 0) return null;

  const maxRevenue = Math.max(1, ...rows.map(r => r.revenue));

  return (
    <section className="rounded-card border border-cup-stroke bg-cup-surface p-5 shadow-card">
      <header className="mb-4 flex items-center gap-2">
        <Trophy className="h-4 w-4 text-cup-orange-600" aria-hidden />
        <h2 className="font-heading text-base font-semibold text-cup-brown-900">
          Kiosk leaderboard
        </h2>
      </header>

      <div className="space-y-3">
        {rows.map((row, i) => {
          const barWidth = Math.max(8, (row.revenue / maxRevenue) * 100);
          return (
            <div key={row.kioskId} className="flex items-center gap-3">
              <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${
                i === 0 ? 'bg-amber-100 text-amber-700' :
                i === 1 ? 'bg-gray-100 text-gray-600' :
                i === 2 ? 'bg-orange-100 text-orange-700' :
                'bg-cup-cream-100 text-cup-muted'
              }`}>
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="truncate text-sm font-semibold text-cup-brown-900">{row.kioskName}</p>
                  <span className="shrink-0 text-sm font-bold text-cup-brown-900">{formatEgp(row.revenue)}</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-cup-cream-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cup-teal-600 to-cup-teal-400 transition-all"
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
                <div className="mt-1 flex items-center gap-3 text-[10px] text-cup-muted">
                  <span>{row.orders} orders</span>
                  <span>Peak: {row.peakHour.toString().padStart(2, '0')}:00</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
