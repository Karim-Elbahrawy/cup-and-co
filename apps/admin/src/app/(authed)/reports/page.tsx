'use client';

import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  DollarSign, TrendingUp, Users, Star, EyeOff, MessageSquare,
  ArrowUp, ArrowDown, ArrowUpDown, Download, BarChart2, Clock,
} from 'lucide-react';
import { useToast } from '@/components/Toast';
import { CupAiUsageTile } from '@/components/CupAiUsageTile';
import { useSession } from '@/lib/useSession';
import {
  adminApi,
  type AdminReportRevenue,
  type AdminReportTopItem,
  type AdminReportRoleBreakdown,
  type AdminReportReviews,
  type AdminRevenueTrendEntry,
  type AdminPeakHourEntry,
} from '@/lib/api';

// ── Date range helpers ────────────────────────────────────────────────────────

type RangePreset = 'today' | '7d' | '30d' | 'all' | 'custom';

function presetToDates(preset: RangePreset): { from: string; to: string } | undefined {
  if (preset === 'all') return undefined;
  const now = new Date();
  const to = now.toISOString().slice(0, 10);
  if (preset === 'today') return { from: to, to };
  if (preset === '7d') {
    const d = new Date(now); d.setDate(d.getDate() - 6);
    return { from: d.toISOString().slice(0, 10), to };
  }
  if (preset === '30d') {
    const d = new Date(now); d.setDate(d.getDate() - 29);
    return { from: d.toISOString().slice(0, 10), to };
  }
  return undefined;
}

// ── Sort helpers ──────────────────────────────────────────────────────────────

type SortDir = 'asc' | 'desc';

function useSortState<K extends string>(defaultKey: K, defaultDir: SortDir = 'desc') {
  const [key, setKey] = useState<K>(defaultKey);
  const [dir, setDir] = useState<SortDir>(defaultDir);
  const toggle = (nextKey: K) => {
    if (nextKey === key) setDir(d => (d === 'desc' ? 'asc' : 'desc'));
    else { setKey(nextKey); setDir(defaultDir); }
  };
  return { key, dir, toggle };
}

type TopItemSortKey = 'count' | 'revenue' | 'name_en';
type RatingSortKey  = 'avgRating' | 'reviewCount' | 'name_en';

// ── CSV export ────────────────────────────────────────────────────────────────

function downloadCsv(filename: string, rows: string[][]) {
  const content = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  // UTF-8 BOM so Excel handles Arabic and special characters correctly
  const bom = '﻿';
  const blob = new Blob([bom + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const toast   = useToast();
  const session = useSession();
  const router  = useRouter();

  useEffect(() => {
    if (session && session.role !== 'owner') router.replace('/');
  }, [session, router]);

  // Date range state
  const [preset, setPreset]         = useState<RangePreset>('30d');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo]     = useState('');

  const dateParams = useMemo(() => {
    if (preset === 'custom') {
      if (customFrom && customTo) return { from: customFrom, to: customTo };
      return undefined;
    }
    return presetToDates(preset);
  }, [preset, customFrom, customTo]);

  // Report data
  const [revenue,       setRevenue]       = useState<AdminReportRevenue | null>(null);
  const [topItems,      setTopItems]      = useState<AdminReportTopItem[]>([]);
  const [breakdown,     setBreakdown]     = useState<AdminReportRoleBreakdown | null>(null);
  const [reviewsReport, setReviewsReport] = useState<AdminReportReviews | null>(null);
  const [trend,         setTrend]         = useState<AdminRevenueTrendEntry[]>([]);
  const [peakHours,     setPeakHours]     = useState<AdminPeakHourEntry[]>([]);
  const [loading,       setLoading]       = useState(true);

  const topSort    = useSortState<TopItemSortKey>('count');
  const ratingSort = useSortState<RatingSortKey>('avgRating');
  const abortRef   = useRef<AbortController | null>(null);

  const loadReports = useCallback(async () => {
    abortRef.current?.abort();
    const ctl = new AbortController();
    abortRef.current = ctl;
    setLoading(true);
    try {
      const [rev, top, roles, revs, trendData, peakData] = await Promise.all([
        adminApi.getRevenueReport(dateParams, ctl.signal),
        adminApi.getTopItems(dateParams, ctl.signal),
        adminApi.getRoleBreakdown(dateParams, ctl.signal),
        adminApi.getReviewsReport(ctl.signal),
        adminApi.getRevenueTrend(dateParams, ctl.signal),
        adminApi.getPeakHours(dateParams, ctl.signal),
      ]);
      if (ctl.signal.aborted) return;
      setRevenue(rev);
      setTopItems(top.topItems ?? []);
      setBreakdown(roles);
      setReviewsReport(revs);
      setTrend(trendData.days ?? []);
      setPeakHours(peakData.hours ?? []);
    } catch (err: unknown) {
      if ((err as Error).name === 'AbortError') return;
      toast('error', (err as Error).message);
    } finally {
      if (!ctl.signal.aborted) setLoading(false);
    }
  }, [dateParams, toast]);

  useEffect(() => {
    loadReports();
    return () => abortRef.current?.abort();
  }, [loadReports]);

  // Sorted data
  const sortedTopItems = useMemo(() => {
    const items = [...topItems];
    items.sort((a, b) => {
      const delta = topSort.key === 'name_en'
        ? a.name_en.localeCompare(b.name_en)
        : (a[topSort.key] as number) - (b[topSort.key] as number);
      return topSort.dir === 'asc' ? delta : -delta;
    });
    return items;
  }, [topItems, topSort.key, topSort.dir]);

  const sortedByRating = useMemo(() => {
    if (!reviewsReport) return [];
    const items = [...reviewsReport.byProduct];
    items.sort((a, b) => {
      let delta = 0;
      if (ratingSort.key === 'name_en')     delta = a.name_en.localeCompare(b.name_en);
      else if (ratingSort.key === 'avgRating')  delta = a.avgRating   - b.avgRating;
      else if (ratingSort.key === 'reviewCount') delta = a.reviewCount - b.reviewCount;
      return ratingSort.dir === 'asc' ? delta : -delta;
    });
    return items;
  }, [reviewsReport, ratingSort.key, ratingSort.dir]);

  // Peak hour heatmap helpers
  const maxPeak = useMemo(() => Math.max(1, ...peakHours.map(h => h.count)), [peakHours]);
  const peakMap = useMemo(() => {
    const m: Record<number, number> = {};
    peakHours.forEach(h => { m[h.hour] = h.count; });
    return m;
  }, [peakHours]);

  // Revenue trend chart helpers
  const maxRevenue = useMemo(() => Math.max(1, ...trend.map(t => t.revenue)), [trend]);

  return (
    <div className="space-y-8">
      {/* Header + date range */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cup-muted">Analytics</p>
          <h1 className="font-heading text-3xl font-bold text-cup-brown-900">Reports</h1>
        </div>

        {/* Date range presets */}
        <div className="flex flex-wrap items-center gap-2">
          {(['today', '7d', '30d', 'all', 'custom'] as RangePreset[]).map(p => (
            <button
              key={p}
              onClick={() => setPreset(p)}
              className={`rounded-pill px-3 py-1.5 text-xs font-semibold transition ${
                preset === p
                  ? 'bg-cup-brown-900 text-white'
                  : 'border border-cup-stroke bg-white text-cup-brown-700 hover:bg-cup-cream-100'
              }`}
            >
              {p === 'today' ? 'Today' : p === '7d' ? 'Last 7 days' : p === '30d' ? 'Last 30 days' : p === 'all' ? 'All time' : 'Custom'}
            </button>
          ))}
          {preset === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customFrom}
                onChange={e => setCustomFrom(e.target.value)}
                className="rounded-lg border border-cup-stroke px-2 py-1.5 text-xs focus:border-cup-orange-600 focus:outline-none"
              />
              <span className="text-xs text-cup-muted">to</span>
              <input
                type="date"
                value={customTo}
                onChange={e => setCustomTo(e.target.value)}
                className="rounded-lg border border-cup-stroke px-2 py-1.5 text-xs focus:border-cup-orange-600 focus:outline-none"
              />
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-6 animate-pulse">
          {/* KPI cards skeleton */}
          <div className="grid gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-card border border-cup-stroke bg-white p-5">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded bg-cup-stroke" />
                  <div className="h-3 w-20 rounded bg-cup-stroke" />
                </div>
                <div className="mt-3 h-7 w-28 rounded bg-cup-stroke" />
              </div>
            ))}
          </div>
          {/* Chart skeleton */}
          <div className="rounded-card border border-cup-stroke bg-white p-5">
            <div className="h-4 w-32 rounded bg-cup-stroke" />
            <div className="mt-4 flex h-48 items-end gap-1">
              {Array.from({ length: 14 }).map((_, i) => (
                <div key={i} className="flex-1 rounded-t bg-cup-stroke" style={{ height: `${20 + Math.random() * 60}%` }} />
              ))}
            </div>
          </div>
          {/* Table skeleton */}
          <div className="rounded-card border border-cup-stroke bg-white p-5">
            <div className="h-4 w-40 rounded bg-cup-stroke" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-4">
                  <div className="h-4 flex-1 rounded bg-cup-stroke" />
                  <div className="h-4 w-16 rounded bg-cup-stroke" />
                  <div className="h-4 w-20 rounded bg-cup-stroke" />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* ── Revenue KPIs ── */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-cup-muted">Revenue</h2>
              <button
                onClick={() => downloadCsv('revenue.csv', [
                  ['Metric', 'Value'],
                  ['Today Revenue EGP', String(revenue?.todayRevenueEgp ?? 0)],
                  ['Total Revenue EGP', String(revenue?.totalRevenueEgp ?? 0)],
                  ['Paid Orders', String(revenue?.paidOrders ?? 0)],
                ])}
                className="flex items-center gap-1.5 rounded-pill border border-cup-stroke bg-white px-3 py-1.5 text-xs font-semibold text-cup-brown-700 transition hover:bg-cup-cream-100"
              >
                <Download className="h-3.5 w-3.5" /> Export
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard icon={<DollarSign className="h-4 w-4" />} label="Today Revenue">
                {revenue?.todayRevenueEgp ?? 0} EGP
              </StatCard>
              <StatCard icon={<TrendingUp className="h-4 w-4" />} label="Total Revenue">
                {revenue?.totalRevenueEgp ?? 0} EGP
              </StatCard>
              <StatCard icon={<Users className="h-4 w-4" />} label="Paid Orders">
                {revenue?.paidOrders ?? 0}
              </StatCard>
            </div>
          </section>

          {/* ── Cup AI usage tile ── */}
          <CupAiUsageTile />

          {/* ── Revenue Trend Chart ── */}
          {trend.length > 0 && (
            <section className="rounded-card border border-cup-stroke bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart2 className="h-4 w-4 text-cup-orange-600" />
                  <h2 className="text-sm font-bold text-cup-brown-900">Revenue Trend</h2>
                </div>
                <button
                  onClick={() => downloadCsv('revenue-trend.csv', [
                    ['Date', 'Revenue EGP', 'Orders'],
                    ...trend.map(t => [t.date, String(t.revenue), String(t.orders)]),
                  ])}
                  className="flex items-center gap-1.5 rounded-pill border border-cup-stroke bg-white px-3 py-1.5 text-xs font-semibold text-cup-brown-700 transition hover:bg-cup-cream-100"
                >
                  <Download className="h-3.5 w-3.5" /> CSV
                </button>
              </div>

              {/* Bar chart */}
              <div className="overflow-x-auto">
                <div
                  className="flex h-48 items-end gap-1 min-w-max"
                  role="img"
                  aria-label="Revenue trend chart"
                >
                  {trend.map((entry) => {
                    const heightPct = Math.max(2, Math.round((entry.revenue / maxRevenue) * 100));
                    return (
                      <div key={entry.date} className="group relative flex flex-col items-center gap-1">
                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-2 hidden rounded-lg border border-cup-stroke bg-white px-2.5 py-1.5 text-center text-xs shadow-card group-hover:block z-10 whitespace-nowrap">
                          <p className="font-semibold text-cup-brown-900">{entry.revenue} EGP</p>
                          <p className="text-cup-muted">{entry.orders} orders</p>
                          <p className="text-cup-muted">{entry.date}</p>
                        </div>
                        <div
                          className="w-7 rounded-t-md bg-cup-orange-600 transition-all duration-300 hover:bg-cup-orange-700"
                          style={{ height: `${heightPct}%` }}
                        />
                        {trend.length <= 14 && (
                          <span className="rotate-45 text-[8px] text-cup-muted origin-left">
                            {entry.date.slice(5)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              {trend.length > 14 && (
                <p className="mt-2 text-center text-[11px] text-cup-muted">
                  {trend[0]?.date} — {trend[trend.length - 1]?.date} · {trend.length} days
                </p>
              )}
            </section>
          )}

          {/* ── Peak Hours Heatmap ── */}
          {peakHours.length > 0 && (
            <section className="rounded-card border border-cup-stroke bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Clock className="h-4 w-4 text-cup-orange-600" />
                <h2 className="text-sm font-bold text-cup-brown-900">Peak Order Hours</h2>
              </div>
              <div className="grid grid-cols-12 gap-1.5">
                {Array.from({ length: 24 }, (_, h) => {
                  const count = peakMap[h] ?? 0;
                  const intensity = count / maxPeak;
                  return (
                    <div key={h} className="group relative flex flex-col items-center gap-1">
                      <div
                        className="h-10 w-full rounded transition-colors"
                        style={{
                          backgroundColor: count === 0
                            ? 'var(--cup-stroke)'
                            : `oklch(${65 - intensity * 22}% ${0.12 + intensity * 0.14} 43)`,
                        }}
                        title={`${h}:00 — ${count} orders`}
                      />
                      {/* Tooltip */}
                      <div className="absolute bottom-full mb-1 hidden rounded-lg border border-cup-stroke bg-white px-2 py-1 text-center text-xs shadow-card group-hover:block z-10 whitespace-nowrap">
                        <p className="font-semibold text-cup-brown-900">{count} orders</p>
                        <p className="text-cup-muted">{h}:00–{h + 1}:00</p>
                      </div>
                      <span className="text-[8px] text-cup-muted">{h}</span>
                    </div>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-cup-muted">
                Darker = more orders. Hover for exact count.
              </p>
            </section>
          )}

          {/* ── Most Ordered Products ── */}
          <section className="rounded-card border border-cup-stroke bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-cup-brown-900">Most Ordered Products</h2>
              <div className="flex items-center gap-2">
                <SortPills
                  options={[
                    { key: 'count',   label: 'Qty Sold' },
                    { key: 'revenue', label: 'Revenue'  },
                    { key: 'name_en', label: 'Name'     },
                  ]}
                  active={topSort.key}
                  dir={topSort.dir}
                  onSelect={topSort.toggle}
                />
                <button
                  onClick={() => downloadCsv('top-products.csv', [
                    ['Product', 'Qty Sold', 'Revenue EGP'],
                    ...sortedTopItems.map(i => [i.name_en, String(i.count), String(i.revenue)]),
                  ])}
                  className="flex items-center gap-1 rounded-pill border border-cup-stroke bg-white px-2.5 py-1 text-[11px] font-semibold text-cup-muted transition hover:bg-cup-cream-100"
                >
                  <Download className="h-3 w-3" /> CSV
                </button>
              </div>
            </div>

            {sortedTopItems.length === 0 ? (
              <p className="text-sm text-cup-muted">No order data yet.</p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-cup-stroke">
                <table className="w-full text-left text-sm">
                  <thead className="bg-cup-cream-100 text-xs font-semibold uppercase text-cup-muted">
                    <tr>
                      <SortTh label="Product" sortKey="name_en" active={topSort.key} dir={topSort.dir} onSort={topSort.toggle} className="px-4 py-3" />
                      <SortTh label="Qty Sold" sortKey="count" active={topSort.key} dir={topSort.dir} onSort={topSort.toggle} className="px-4 py-3 text-right" />
                      <SortTh label="Revenue" sortKey="revenue" active={topSort.key} dir={topSort.dir} onSort={topSort.toggle} className="px-4 py-3 text-right" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cup-stroke">
                    {sortedTopItems.map((item, i) => (
                      <tr key={i} className="transition-colors hover:bg-cup-cream-50">
                        <td className="px-4 py-3 font-medium text-cup-brown-900">{item.name_en}</td>
                        <td className="px-4 py-3 text-right text-cup-brown-700">{item.count}</td>
                        <td className="px-4 py-3 text-right font-semibold text-cup-brown-900">{item.revenue} EGP</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* ── Role Breakdown ── */}
          <section className="rounded-card border border-cup-stroke bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-cup-brown-900">Role Breakdown</h2>
              {breakdown && Object.keys(breakdown.breakdown).length > 0 && (
                <button
                  onClick={() => downloadCsv('role-breakdown.csv', [
                    ['Role', 'Orders', 'Revenue EGP'],
                    ...Object.entries(breakdown.breakdown).map(([r, d]) => [r, String(d.orders), String(d.revenue)]),
                  ])}
                  className="flex items-center gap-1 rounded-pill border border-cup-stroke bg-white px-2.5 py-1 text-[11px] font-semibold text-cup-muted transition hover:bg-cup-cream-100"
                >
                  <Download className="h-3 w-3" /> CSV
                </button>
              )}
            </div>
            {breakdown && Object.keys(breakdown.breakdown).length === 0 ? (
              <p className="text-sm text-cup-muted">No order data yet.</p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-cup-stroke">
                <table className="w-full text-left text-sm">
                  <thead className="bg-cup-cream-100 text-xs font-semibold uppercase text-cup-muted">
                    <tr>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3 text-right">Orders</th>
                      <th className="px-4 py-3 text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cup-stroke">
                    {breakdown && Object.entries(breakdown.breakdown).map(([role, data]) => (
                      <tr key={role} className="transition-colors hover:bg-cup-cream-50">
                        <td className="px-4 py-3 font-medium capitalize text-cup-brown-900">{role}</td>
                        <td className="px-4 py-3 text-right text-cup-brown-700">{data.orders}</td>
                        <td className="px-4 py-3 text-right font-semibold text-cup-brown-900">{data.revenue} EGP</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* ── Product Reviews ── */}
          <section className="space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-cup-muted">Product Reviews</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard icon={<MessageSquare className="h-4 w-4" />} label="Total Reviews">
                {reviewsReport?.total ?? 0}
              </StatCard>
              <StatCard icon={<Star className="h-4 w-4" />} label="Average Rating">
                <span className="flex items-baseline gap-1.5">
                  {reviewsReport?.avgRating ?? 0}
                  <span className="text-base font-normal text-cup-muted">/ 5</span>
                </span>
              </StatCard>
              <StatCard icon={<EyeOff className="h-4 w-4" />} label="Hidden Reviews">
                {reviewsReport?.hiddenCount ?? 0}
              </StatCard>
            </div>

            {reviewsReport && reviewsReport.total === 0 ? (
              <p className="rounded-card border border-cup-stroke bg-white px-5 py-8 text-center text-sm text-cup-muted">
                No reviews yet. They&apos;ll appear here once customers start rating products.
              </p>
            ) : (
              <div className="grid gap-5 lg:grid-cols-2">
                {/* Rating distribution */}
                <div className="rounded-card border border-cup-stroke bg-white p-5 shadow-sm">
                  <h3 className="mb-4 text-sm font-bold text-cup-brown-900">Rating Distribution</h3>
                  <div className="space-y-2.5">
                    {[5, 4, 3, 2, 1].map((star) => {
                      const count = reviewsReport?.ratingDistribution[String(star)] ?? 0;
                      const total = reviewsReport?.total ?? 0;
                      const pct   = total > 0 ? Math.round((count / total) * 100) : 0;
                      return (
                        <div key={star} className="flex items-center gap-3">
                          <div className="flex w-12 shrink-0 items-center gap-1">
                            <span className="text-sm font-semibold text-cup-brown-900">{star}</span>
                            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          </div>
                          <div className="flex-1 overflow-hidden rounded-full bg-cup-cream-100 h-2.5">
                            <div className="h-full rounded-full bg-amber-400 transition-all duration-500" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="w-14 text-right text-xs text-cup-muted">
                            {count} <span className="text-cup-brown-400">({pct}%)</span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Top 5 by rating */}
                <div className="rounded-card border border-cup-stroke bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-cup-brown-900">
                      {ratingSort.key === 'avgRating'
                        ? ratingSort.dir === 'desc' ? 'Best Rated Products' : 'Worst Rated Products'
                        : ratingSort.key === 'reviewCount'
                        ? ratingSort.dir === 'desc' ? 'Most Reviewed Products' : 'Least Reviewed Products'
                        : 'Products A–Z'}
                    </h3>
                    <DirToggle dir={ratingSort.dir} onToggle={() => ratingSort.toggle(ratingSort.key)} />
                  </div>
                  {sortedByRating.length === 0 ? (
                    <p className="text-sm text-cup-muted">No data yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {sortedByRating.slice(0, 5).map((p) => (
                        <div key={p.productId} className="flex items-center gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-cup-brown-900">{p.name_en}</p>
                            <div className="mt-0.5 flex items-center gap-2">
                              <StarRow rating={p.avgRating} />
                              <span className="text-xs text-cup-muted">
                                {p.avgRating.toFixed(1)} · {p.reviewCount} review{p.reviewCount !== 1 ? 's' : ''}
                              </span>
                            </div>
                          </div>
                          {p.hiddenCount > 0 && (
                            <span className="shrink-0 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-600">
                              {p.hiddenCount} hidden
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Full sortable table */}
            {reviewsReport && reviewsReport.byProduct.length > 0 && (
              <div className="rounded-card border border-cup-stroke bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-bold text-cup-brown-900">All Products</h3>
                  <div className="flex items-center gap-2">
                    <SortPills
                      options={[
                        { key: 'avgRating',   label: 'Rating'  },
                        { key: 'reviewCount', label: 'Reviews' },
                        { key: 'name_en',     label: 'Name'    },
                      ]}
                      active={ratingSort.key}
                      dir={ratingSort.dir}
                      onSelect={ratingSort.toggle}
                    />
                    <button
                      onClick={() => downloadCsv('reviews-by-product.csv', [
                        ['Product', 'Avg Rating', 'Reviews', 'Hidden'],
                        ...sortedByRating.map(p => [p.name_en, p.avgRating.toFixed(2), String(p.reviewCount), String(p.hiddenCount)]),
                      ])}
                      className="flex items-center gap-1 rounded-pill border border-cup-stroke bg-white px-2.5 py-1 text-[11px] font-semibold text-cup-muted transition hover:bg-cup-cream-100"
                    >
                      <Download className="h-3 w-3" /> CSV
                    </button>
                  </div>
                </div>
                <div className="overflow-hidden rounded-lg border border-cup-stroke">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-cup-cream-100 text-xs font-semibold uppercase text-cup-muted">
                      <tr>
                        <SortTh label="Product" sortKey="name_en" active={ratingSort.key} dir={ratingSort.dir} onSort={ratingSort.toggle} className="px-4 py-3" />
                        <SortTh label="Avg Rating" sortKey="avgRating" active={ratingSort.key} dir={ratingSort.dir} onSort={ratingSort.toggle} className="px-4 py-3 text-center" />
                        <SortTh label="Reviews" sortKey="reviewCount" active={ratingSort.key} dir={ratingSort.dir} onSort={ratingSort.toggle} className="px-4 py-3 text-right" />
                        <th className="px-4 py-3 text-right">Hidden</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-cup-stroke">
                      {sortedByRating.map((p) => (
                        <tr key={p.productId} className="transition-colors hover:bg-cup-cream-50">
                          <td className="px-4 py-3 font-medium text-cup-brown-900">{p.name_en}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-1.5">
                              <StarRow rating={p.avgRating} />
                              <span className="text-xs font-semibold text-cup-brown-900">{p.avgRating.toFixed(1)}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right text-cup-brown-700">{p.reviewCount}</td>
                          <td className="px-4 py-3 text-right">
                            {p.hiddenCount > 0 ? (
                              <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-600">{p.hiddenCount}</span>
                            ) : (
                              <span className="text-cup-muted">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-card border border-cup-stroke bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 text-cup-muted">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold text-cup-brown-900">{children}</p>
    </div>
  );
}

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} className={`h-3 w-3 ${s <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'fill-cup-cream-100 text-cup-stroke'}`} />
      ))}
    </div>
  );
}

function SortPills<K extends string>({ options, active, dir, onSelect }: { options: { key: K; label: string }[]; active: K; dir: 'asc' | 'desc'; onSelect: (key: K) => void }) {
  return (
    <div className="flex items-center gap-1">
      {options.map(({ key, label }) => {
        const isActive = key === active;
        return (
          <button key={key} onClick={() => onSelect(key)}
            className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
              isActive ? 'bg-cup-brown-900 text-white' : 'bg-cup-cream-100 text-cup-muted hover:bg-cup-cream-200 hover:text-cup-brown-900'
            }`}>
            {label}
            {isActive && (dir === 'desc' ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />)}
          </button>
        );
      })}
    </div>
  );
}

function SortTh<K extends string>({ label, sortKey, active, dir, onSort, className }: { label: string; sortKey: K; active: K; dir: 'asc' | 'desc'; onSort: (key: K) => void; className?: string }) {
  const isActive = sortKey === active;
  return (
    <th className={`cursor-pointer select-none ${className ?? ''}`} onClick={() => onSort(sortKey)}>
      <span className="inline-flex items-center gap-1">
        {label}
        {isActive ? (dir === 'desc' ? <ArrowDown className="h-3 w-3 text-cup-brown-700" /> : <ArrowUp className="h-3 w-3 text-cup-brown-700" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}
      </span>
    </th>
  );
}

function DirToggle({ dir, onToggle }: { dir: 'asc' | 'desc'; onToggle: () => void }) {
  return (
    <button onClick={onToggle}
      className="flex items-center gap-1 rounded-full bg-cup-cream-100 px-2.5 py-1 text-[11px] font-semibold text-cup-muted transition-colors hover:bg-cup-cream-200 hover:text-cup-brown-900">
      {dir === 'desc' ? <><ArrowDown className="h-3 w-3" /> Best first</> : <><ArrowUp className="h-3 w-3" /> Worst first</>}
    </button>
  );
}
