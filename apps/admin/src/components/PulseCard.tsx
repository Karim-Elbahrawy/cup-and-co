'use client';

import { useCallback, useEffect, useState } from 'react';
import { Activity, ArrowUp, ArrowDown } from 'lucide-react';
import { formatEgp } from '@/lib/format';
import { adminApi, type AdminPulseReport } from '@/lib/api';

export function PulseCard() {
  const [data, setData] = useState<AdminPulseReport | null>(null);

  const load = useCallback(async () => {
    const res = await adminApi.getPulse();
    setData(res);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (!data) return null;

  const vsYesterday = data.yesterday.revenue > 0
    ? Math.round(((data.today.revenue - data.yesterday.revenue) / data.yesterday.revenue) * 100)
    : 0;

  return (
    <section className="rounded-card border border-cup-stroke bg-cup-surface p-5 shadow-card">
      <header className="mb-4 flex items-center gap-2">
        <Activity className="h-4 w-4 text-cup-orange-600" aria-hidden />
        <h2 className="font-heading text-base font-semibold text-cup-brown-900">
          Owner pulse
        </h2>
        <span className="text-xs text-cup-muted">Quick snapshot</span>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <PulseStat label="Today" value={formatEgp(data.today.revenue)} sub={`${data.today.orders} orders`}>
          {vsYesterday !== 0 && (
            <span className={`flex items-center gap-0.5 text-[10px] font-bold ${vsYesterday > 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              {vsYesterday > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
              {vsYesterday > 0 ? '+' : ''}{vsYesterday}% vs yesterday
            </span>
          )}
        </PulseStat>
        <PulseStat label="Yesterday" value={formatEgp(data.yesterday.revenue)} sub={`${data.yesterday.orders} orders`} />
        <PulseStat label="Last 7 days" value={formatEgp(data.week.revenue)} sub={`${data.week.orders} orders`} />
        <PulseStat label="Pending now" value={String(data.pendingOrders)} sub="active orders" />
      </div>

      {data.monthProgress && (
        <div className="mt-4 rounded-chip border border-cup-stroke bg-cup-cream-50 px-4 py-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-cup-muted">Monthly target progress</p>
            <span className="text-xs font-bold text-cup-brown-900">{data.monthProgress.pct}%</span>
          </div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-cup-cream-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cup-teal-600 to-cup-teal-400 transition-all duration-500"
              style={{ width: `${Math.min(100, data.monthProgress.pct)}%` }}
            />
          </div>
          <div className="mt-1.5 flex justify-between text-[10px] text-cup-muted">
            <span>Actual: {formatEgp(data.monthProgress.actual)}</span>
            <span>Target: {formatEgp(data.monthProgress.target)}</span>
          </div>
        </div>
      )}
    </section>
  );
}

function PulseStat({ label, value, sub, children }: { label: string; value: string; sub: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-chip border border-cup-stroke bg-cup-cream-50 px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-cup-muted">{label}</p>
      <p className="mt-0.5 font-heading text-xl font-bold text-cup-brown-900">{value}</p>
      <p className="text-[10px] text-cup-muted">{sub}</p>
      {children}
    </div>
  );
}
