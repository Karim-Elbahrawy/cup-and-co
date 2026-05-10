'use client';

import { ArrowDown, ArrowUp, DollarSign, ShoppingBag, TrendingUp } from 'lucide-react';
import { formatEgp } from '@/lib/format';
import type { AdminRevenueKpis } from '@/lib/api';

function DeltaBadge({ value }: { value: number }) {
  if (value === 0) return <span className="text-[11px] text-cup-muted">—</span>;
  const positive = value > 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
        positive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
      }`}
    >
      {positive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}

export function RevenueKpisV2({ data }: { data: AdminRevenueKpis }) {
  const cards = [
    {
      label: 'Revenue',
      value: formatEgp(data.current.revenue),
      delta: data.delta.revenue,
      icon: DollarSign,
      accent: 'bg-cup-orange-100 text-cup-orange-700',
    },
    {
      label: 'Orders',
      value: String(data.current.orders),
      delta: data.delta.orders,
      icon: ShoppingBag,
      accent: 'bg-cup-teal-100 text-cup-teal-700',
    },
    {
      label: 'Avg order value',
      value: formatEgp(data.current.aov),
      delta: data.delta.aov,
      icon: TrendingUp,
      accent: 'bg-cup-brown-100 text-cup-brown-700',
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {cards.map((c) => (
        <div
          key={c.label}
          className="rounded-card border border-cup-stroke bg-cup-surface p-5 shadow-card"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`grid h-9 w-9 place-items-center rounded-chip ${c.accent}`}>
                <c.icon className="h-4 w-4" aria-hidden />
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cup-muted">
                {c.label}
              </span>
            </div>
            <DeltaBadge value={c.delta} />
          </div>
          <p className="mt-3 font-heading text-3xl font-bold text-cup-brown-900">{c.value}</p>
          <p className="mt-1 text-[11px] text-cup-muted">
            vs prior: {c.label === 'Orders' ? data.prior.orders : formatEgp(c.label === 'Revenue' ? data.prior.revenue : data.prior.aov)}
          </p>
        </div>
      ))}
    </div>
  );
}
