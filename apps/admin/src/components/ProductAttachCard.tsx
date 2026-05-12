'use client';

import { Link2 } from 'lucide-react';
import type { AdminProductPair } from '@/lib/api';

export function ProductAttachCard({ pairs }: { pairs: AdminProductPair[] }) {
  if (pairs.length === 0) return null;
  const maxCount = Math.max(1, pairs[0]?.count ?? 1);

  return (
    <section className="rounded-card border border-cup-stroke bg-cup-surface p-5 shadow-card">
      <header className="mb-4 flex items-center gap-2">
        <Link2 className="h-4 w-4 text-cup-orange-600" aria-hidden />
        <h2 className="font-heading text-base font-semibold text-cup-brown-900">
          Bought together
        </h2>
        <span className="text-xs text-cup-muted">(product attach)</span>
      </header>

      <div className="space-y-2.5">
        {pairs.slice(0, 10).map((p, i) => {
          const barWidth = Math.max(8, (p.count / maxCount) * 100);
          return (
            <div key={i} className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-cup-brown-900">
                  <span className="font-semibold">{p.productA}</span>
                  <span className="mx-2 text-cup-muted">+</span>
                  <span className="font-semibold">{p.productB}</span>
                </p>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-cup-cream-100">
                  <div
                    className="h-full rounded-full bg-cup-orange-400 transition-all"
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>
              <span className="shrink-0 rounded-full bg-cup-cream-100 px-2.5 py-0.5 text-xs font-semibold text-cup-brown-700">
                {p.count}×
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
