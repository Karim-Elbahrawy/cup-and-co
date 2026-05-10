'use client';

import { XCircle, RotateCcw } from 'lucide-react';
import { formatEgp } from '@/lib/format';
import type { AdminRefundsReport } from '@/lib/api';

export function RefundsCard({ data }: { data: AdminRefundsReport }) {
  return (
    <section className="rounded-card border border-cup-stroke bg-cup-surface p-5 shadow-card">
      <header className="mb-4 flex items-center gap-2">
        <XCircle className="h-4 w-4 text-cup-orange-600" aria-hidden />
        <h2 className="font-heading text-base font-semibold text-cup-brown-900">
          Cancellations &amp; refunds
        </h2>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Cancellation rate" value={`${data.cancellationRate}%`} sub={`${data.cancelled} of ${data.totalOrders}`} />
        <Stat label="Refund rate" value={`${data.refundRate}%`} sub={`${data.refunded} of ${data.totalOrders}`} />
        <Stat label="Lost to cancellations" value={formatEgp(data.cancelledRevenue)} sub="potential revenue" />
        <Stat label="Refunded amount" value={formatEgp(data.refundedRevenue)} sub="returned to customers" />
      </div>

      {data.reasons.length > 0 && (
        <div className="mt-5">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-cup-muted">
            Cancellation reasons
          </h3>
          <div className="space-y-2">
            {data.reasons.slice(0, 5).map((r) => (
              <div key={r.reason} className="flex items-center justify-between rounded-chip border border-cup-stroke px-3 py-2">
                <div className="flex items-center gap-2">
                  <RotateCcw className="h-3.5 w-3.5 text-cup-muted" aria-hidden />
                  <span className="text-sm text-cup-brown-900">{r.reason}</span>
                </div>
                <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700">
                  {r.count}×
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-chip border border-cup-stroke bg-cup-cream-50 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-cup-muted">{label}</p>
      <p className="mt-1 font-heading text-xl font-bold text-cup-brown-900">{value}</p>
      <p className="mt-0.5 text-[11px] text-cup-muted">{sub}</p>
    </div>
  );
}
