'use client';

import { Tag, CheckCircle2, XCircle } from 'lucide-react';
import { formatEgp } from '@/lib/format';
import type { AdminOfferPerformance } from '@/lib/api';

export function OfferPerformanceCard({ data }: { data: AdminOfferPerformance }) {
  return (
    <section className="rounded-card border border-cup-stroke bg-cup-surface p-5 shadow-card">
      <header className="mb-4 flex items-center gap-2">
        <Tag className="h-4 w-4 text-cup-orange-600" aria-hidden />
        <h2 className="font-heading text-base font-semibold text-cup-brown-900">
          Discount &amp; offer performance
        </h2>
      </header>

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Stat label="Discounted orders" value={String(data.totalDiscountedOrders)} />
        <Stat label="Total discounted" value={formatEgp(data.totalDiscountAmount)} />
        <Stat label="Revenue w/ discount" value={formatEgp(data.totalRevenueWithDiscount)} />
      </div>

      {data.offers.length > 0 && (
        <div className="overflow-hidden rounded-chip border border-cup-stroke">
          <table className="w-full text-left text-sm">
            <thead className="bg-cup-cream-100 text-xs font-semibold uppercase text-cup-muted">
              <tr>
                <th className="px-4 py-3">Offer</th>
                <th className="px-4 py-3 text-center">Type</th>
                <th className="px-4 py-3 text-right">Used</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cup-stroke">
              {data.offers.map((o) => (
                <tr key={o.id} className="transition-colors hover:bg-cup-cream-50">
                  <td className="px-4 py-3 font-medium text-cup-brown-900">{o.name_en}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="rounded-full bg-cup-cream-100 px-2 py-0.5 text-[10px] font-semibold text-cup-brown-700">
                      {o.type === 'percentage' ? `${o.value}%` : o.type === 'fixed' ? formatEgp(o.value) : 'Free item'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-cup-brown-700">
                    {o.usageCount}{o.usageLimit ? ` / ${o.usageLimit}` : ''}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {o.active ? (
                      <CheckCircle2 className="mx-auto h-4 w-4 text-emerald-600" />
                    ) : (
                      <XCircle className="mx-auto h-4 w-4 text-cup-muted" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-chip border border-cup-stroke bg-cup-cream-50 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-cup-muted">{label}</p>
      <p className="mt-1 font-heading text-xl font-bold text-cup-brown-900">{value}</p>
    </div>
  );
}
