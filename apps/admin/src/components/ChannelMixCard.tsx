'use client';

import { Smartphone } from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { formatEgp } from '@/lib/format';
import type { AdminChannelMixEntry } from '@/lib/api';

const CHANNEL_LABELS: Record<string, string> = {
  customer_app: 'Mobile app',
  kiosk: 'Kiosk',
  admin_phone: 'Phone order',
};

const COLORS = ['#C2410C', '#0F766E', '#F4A261'];

export function ChannelMixCard({ data, total }: { data: AdminChannelMixEntry[]; total: number }) {
  const pie = data.map((d) => ({
    name: CHANNEL_LABELS[d.channel] ?? d.channel,
    value: d.orders,
    revenue: d.revenue,
  }));

  return (
    <section className="rounded-card border border-cup-stroke bg-cup-surface p-5 shadow-card">
      <header className="mb-4 flex items-center gap-2">
        <Smartphone className="h-4 w-4 text-cup-orange-600" aria-hidden />
        <h2 className="font-heading text-base font-semibold text-cup-brown-900">Order channels</h2>
      </header>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="h-56 w-full">
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={pie}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={75}
                paddingAngle={3}
              >
                {pie.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ borderRadius: 12, border: '1px solid #E7E5E4' }}
                formatter={(v) => [String(v), 'Orders']}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-3">
          {data.map((d, i) => {
            const pct = total > 0 ? Math.round((d.orders / total) * 1000) / 10 : 0;
            return (
              <div key={d.channel} className="flex items-center justify-between rounded-chip border border-cup-stroke px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: COLORS[i % COLORS.length] }}
                  />
                  <div>
                    <p className="text-sm font-semibold text-cup-brown-900">
                      {CHANNEL_LABELS[d.channel] ?? d.channel}
                    </p>
                    <p className="text-xs text-cup-muted">{formatEgp(d.revenue)}</p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-cup-brown-700">{pct}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
