'use client';

import { DollarSign } from 'lucide-react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatEgp } from '@/lib/format';
import type { AdminClvReport } from '@/lib/api';

export function ClvCard({ data }: { data: AdminClvReport }) {
  if (data.totalCustomers === 0) return null;

  return (
    <section className="rounded-card border border-cup-stroke bg-cup-surface p-5 shadow-card">
      <header className="mb-4 flex items-center gap-2">
        <DollarSign className="h-4 w-4 text-cup-orange-600" aria-hidden />
        <h2 className="font-heading text-base font-semibold text-cup-brown-900">
          Customer Lifetime Value
        </h2>
      </header>

      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        <Stat label="Median CLV" value={formatEgp(data.median)} />
        <Stat label="Average CLV" value={formatEgp(data.avg)} />
        <Stat label="p75" value={formatEgp(data.p75)} />
        <Stat label="p90" value={formatEgp(data.p90)} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Distribution chart */}
        <div>
          <p className="mb-2 text-xs font-semibold text-cup-muted">Revenue distribution (EGP)</p>
          <div className="h-44 w-full">
            <ResponsiveContainer>
              <BarChart data={data.buckets} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#78716C' }} interval={0} angle={-15} textAnchor="end" height={40} />
                <YAxis tick={{ fontSize: 10, fill: '#78716C' }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E7E5E4' }} />
                <Bar dataKey="count" fill="#0F766E" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top customers */}
        <div>
          <p className="mb-2 text-xs font-semibold text-cup-muted">Top 10 customers by revenue</p>
          <div className="space-y-1.5">
            {data.topCustomers.slice(0, 7).map((c, i) => (
              <div key={c.userId} className="flex items-center gap-2 rounded-chip border border-cup-stroke px-3 py-1.5">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-cup-cream-100 text-[10px] font-bold text-cup-brown-700">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-cup-brown-900">
                    {c.userId.slice(0, 8)}…
                  </p>
                </div>
                <span className="text-xs font-bold text-cup-brown-900">{formatEgp(c.revenue)}</span>
                <span className="text-[10px] text-cup-muted">{c.orders} orders</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-chip border border-cup-stroke bg-cup-cream-50 px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-cup-muted">{label}</p>
      <p className="mt-0.5 font-heading text-lg font-bold text-cup-brown-900">{value}</p>
    </div>
  );
}
