'use client';

import { Timer } from 'lucide-react';
import type { AdminPrepSlaReport } from '@/lib/api';

export function PrepSlaCard({ data }: { data: AdminPrepSlaReport }) {
  const metrics = [
    { label: 'Placed → Accepted', ...data.placedToAccepted },
    { label: 'Accepted → Ready', ...data.acceptedToReady },
    { label: 'Placed → Completed', ...data.placedToCompleted },
  ];

  return (
    <section className="rounded-card border border-cup-stroke bg-cup-surface p-5 shadow-card">
      <header className="mb-4 flex items-center gap-2">
        <Timer className="h-4 w-4 text-cup-orange-600" aria-hidden />
        <h2 className="font-heading text-base font-semibold text-cup-brown-900">
          Prep-time SLA
        </h2>
        <span className="text-xs text-cup-muted">(minutes)</span>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-chip border border-cup-stroke bg-cup-cream-50 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-cup-muted">{m.label}</p>
            <div className="mt-2 flex items-end gap-3">
              <div>
                <p className="text-[10px] text-cup-muted">p50</p>
                <p className="font-heading text-2xl font-bold text-cup-brown-900">{m.p50}</p>
              </div>
              <div>
                <p className="text-[10px] text-cup-muted">p95</p>
                <p className="font-heading text-2xl font-bold text-rose-600">{m.p95}</p>
              </div>
              <div>
                <p className="text-[10px] text-cup-muted">avg</p>
                <p className="font-heading text-lg font-semibold text-cup-brown-700">{m.avg}</p>
              </div>
            </div>
            <p className="mt-1 text-[10px] text-cup-muted">{m.count} orders measured</p>
          </div>
        ))}
      </div>
    </section>
  );
}
