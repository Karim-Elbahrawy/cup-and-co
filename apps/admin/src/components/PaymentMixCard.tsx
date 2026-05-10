'use client';

import { CreditCard } from 'lucide-react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatEgp } from '@/lib/format';
import type { AdminPaymentMixEntry } from '@/lib/api';

const METHOD_LABELS: Record<string, string> = {
  paymob_card: 'Card',
  paymob_wallet: 'Wallet',
  cash: 'Cash',
};

export function PaymentMixCard({ data, total }: { data: AdminPaymentMixEntry[]; total: number }) {
  const bars = data.map((d) => ({
    method: METHOD_LABELS[d.method] ?? d.method,
    orders: d.orders,
    revenue: d.revenue,
    pct: total > 0 ? Math.round((d.orders / total) * 1000) / 10 : 0,
  }));

  return (
    <section className="rounded-card border border-cup-stroke bg-cup-surface p-5 shadow-card">
      <header className="mb-4 flex items-center gap-2">
        <CreditCard className="h-4 w-4 text-cup-orange-600" aria-hidden />
        <h2 className="font-heading text-base font-semibold text-cup-brown-900">Payment methods</h2>
      </header>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="h-48 w-full">
          <ResponsiveContainer>
            <BarChart data={bars} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
              <XAxis type="number" tick={{ fontSize: 11, fill: '#78716C' }} />
              <YAxis type="category" dataKey="method" tick={{ fontSize: 12, fill: '#78716C' }} width={60} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: '1px solid #E7E5E4' }}
                formatter={(v, name) => name === 'revenue' ? [formatEgp(v as number), 'Revenue'] : [String(v), 'Orders']}
              />
              <Bar dataKey="orders" fill="#C2410C" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-3">
          {bars.map((b) => (
            <div key={b.method} className="flex items-center justify-between rounded-chip border border-cup-stroke px-3 py-2.5">
              <div>
                <p className="text-sm font-semibold text-cup-brown-900">{b.method}</p>
                <p className="text-xs text-cup-muted">{b.orders} orders · {formatEgp(b.revenue)}</p>
              </div>
              <span className="rounded-full bg-cup-cream-100 px-2.5 py-0.5 text-xs font-semibold text-cup-brown-700">
                {b.pct}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
