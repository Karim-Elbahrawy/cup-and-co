'use client';

import { TrendingUp } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatEgp } from '@/lib/format';
import type { AdminForecastReport } from '@/lib/api';

const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function ForecastCard({ data }: { data: AdminForecastReport }) {
  const chartData = data.forecast.map(f => ({
    date: f.date.slice(5),
    predicted: f.predicted,
    day: DOW_LABELS[f.dow],
  }));

  return (
    <section className="rounded-card border border-cup-stroke bg-cup-surface p-5 shadow-card">
      <header className="mb-4 flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-cup-orange-600" aria-hidden />
        <h2 className="font-heading text-base font-semibold text-cup-brown-900">
          7-day revenue forecast
        </h2>
        <span className={`ml-auto rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
          data.trendFactor >= 1 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
        }`}>
          Trend: {data.trendFactor >= 1 ? '+' : ''}{Math.round((data.trendFactor - 1) * 100)}%
        </span>
      </header>

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-chip border border-cup-stroke bg-cup-cream-50 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-cup-muted">Predicted 7-day total</p>
          <p className="mt-1 font-heading text-2xl font-bold text-cup-brown-900">{formatEgp(data.totalForecast)}</p>
        </div>
        <div className="rounded-chip border border-cup-stroke bg-cup-cream-50 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-cup-muted">Predicted daily avg</p>
          <p className="mt-1 font-heading text-2xl font-bold text-cup-brown-900">{formatEgp(Math.round(data.totalForecast / 7))}</p>
        </div>
      </div>

      <div className="h-48 w-full">
        <ResponsiveContainer>
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#78716C' }} />
            <YAxis tick={{ fontSize: 11, fill: '#78716C' }} />
            <Tooltip
              contentStyle={{ borderRadius: 12, border: '1px solid #E7E5E4' }}
              formatter={(v) => [formatEgp(v as number), 'Predicted']}
              labelFormatter={(_label, payload) => {
                const item = payload?.[0]?.payload;
                return item ? `${item.day} ${item.date}` : '';
              }}
            />
            <Area
              type="monotone"
              dataKey="predicted"
              stroke="#C2410C"
              fill="#FED7AA"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
