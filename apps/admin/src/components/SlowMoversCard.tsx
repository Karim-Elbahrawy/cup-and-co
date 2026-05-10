'use client';

import { TrendingDown } from 'lucide-react';
import { formatEgp } from '@/lib/format';
import type { AdminSlowMover } from '@/lib/api';

export function SlowMoversCard({ products }: { products: AdminSlowMover[] }) {
  if (products.length === 0) return null;

  return (
    <section className="rounded-card border border-cup-stroke bg-cup-surface p-5 shadow-card">
      <header className="mb-4 flex items-center gap-2">
        <TrendingDown className="h-4 w-4 text-cup-orange-600" aria-hidden />
        <h2 className="font-heading text-base font-semibold text-cup-brown-900">
          Slow movers
        </h2>
        <span className="text-xs text-cup-muted">(lowest sales in period)</span>
      </header>

      <div className="overflow-hidden rounded-chip border border-cup-stroke">
        <table className="w-full text-left text-sm">
          <thead className="bg-cup-cream-100 text-xs font-semibold uppercase text-cup-muted">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3 text-right">Units sold</th>
              <th className="px-4 py-3 text-right">Revenue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cup-stroke">
            {products.map((p) => (
              <tr key={p.name_en} className="transition-colors hover:bg-cup-cream-50">
                <td className="px-4 py-3 font-medium text-cup-brown-900">{p.name_en}</td>
                <td className="px-4 py-3 text-right tabular-nums text-cup-brown-700">
                  {p.count === 0 ? (
                    <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-600">
                      0 sales
                    </span>
                  ) : p.count}
                </td>
                <td className="px-4 py-3 text-right tabular-nums font-semibold text-cup-brown-900">
                  {formatEgp(p.revenue)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
