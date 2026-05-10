'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  BarChart2,
  BarChart3,
  Clock,
  DollarSign,
  EyeOff,
  FileText,
  MessageSquare,
  Star,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useToast } from '@/components/Toast';
import { Skeleton, SkeletonCard } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';
import { CupAiUsageTile } from '@/components/CupAiUsageTile';
import { useSession } from '@/lib/useSession';
import { formatEgp } from '@/lib/format';
import {
  adminApi,
  type AdminPeakHourEntry,
  type AdminReportReviews,
  type AdminReportRevenue,
  type AdminReportRoleBreakdown,
  type AdminReportTopItem,
  type AdminRevenueTrendEntry,
  type AdminRevenueKpis,
  type AdminCustomersReport,
  type AdminPaymentMixEntry,
  type AdminChannelMixEntry,
  type AdminHeatmapReport,
  type AdminRefundsReport,
  type AdminFunnelReport,
  type AdminPrepSlaReport,
  type AdminKioskLeaderboardRow,
  type AdminSlowMover,
  type AdminProductPair,
  type AdminOfferPerformance,
  type AdminLoyaltyMetrics,
  type AdminCohortRow,
  type AdminClvReport,
  type AdminReferralFunnel,
  type AdminForecastReport,
  type AdminAnomalyReport,
  type AdminTarget,
} from '@/lib/api';
import { KioskBreakdownSection } from '@/components/KioskBreakdownSection';
import { RevenueKpisV2 } from '@/components/RevenueKpisV2';
import { CustomersSplitCard } from '@/components/CustomersSplitCard';
import { PaymentMixCard } from '@/components/PaymentMixCard';
import { ChannelMixCard } from '@/components/ChannelMixCard';
import { OrderHeatmap } from '@/components/OrderHeatmap';
import { RefundsCard } from '@/components/RefundsCard';
import { FunnelChart } from '@/components/FunnelChart';
import { PrepSlaCard } from '@/components/PrepSlaCard';
import { KioskLeaderboard } from '@/components/KioskLeaderboard';
import { SlowMoversCard } from '@/components/SlowMoversCard';
import { ProductAttachCard } from '@/components/ProductAttachCard';
import { OfferPerformanceCard } from '@/components/OfferPerformanceCard';
import { LoyaltyMetricsCard } from '@/components/LoyaltyMetricsCard';
import { CohortRetentionCard } from '@/components/CohortRetentionCard';
import { ClvCard } from '@/components/ClvCard';
import { ReferralFunnelCard } from '@/components/ReferralFunnelCard';
import { ForecastCard } from '@/components/ForecastCard';
import { AnomalyCard } from '@/components/AnomalyCard';
import { ComparisonCard } from '@/components/ComparisonCard';
import { TargetsCard } from '@/components/TargetsCard';
import { AnnotationsCard } from '@/components/AnnotationsCard';
import { SavedViewsBar } from '@/components/SavedViewsBar';
import { PulseCard } from '@/components/PulseCard';
import { MasterExportCard } from '@/components/MasterExportCard';
import { DigestCard } from '@/components/DigestCard';

const PIE_COLORS = ['#C2410C', '#0F766E', '#F4A261', '#9A3412', '#FEF3C7', '#1C1917'];

// ── Date range helpers (R.3 — date filter) ──────────────────────────────────
type RangePreset = 'today' | '7d' | '30d' | 'all' | 'custom';

function presetToDates(preset: RangePreset): { from: string; to: string } | undefined {
  if (preset === 'all') return undefined;
  const now = new Date();
  const to = now.toISOString().slice(0, 10);
  if (preset === 'today') return { from: to, to };
  if (preset === '7d') {
    const d = new Date(now);
    d.setDate(d.getDate() - 6);
    return { from: d.toISOString().slice(0, 10), to };
  }
  if (preset === '30d') {
    const d = new Date(now);
    d.setDate(d.getDate() - 29);
    return { from: d.toISOString().slice(0, 10), to };
  }
  return undefined;
}

// ── Sort helpers (R.3 — sortable tables) ────────────────────────────────────
type SortDir = 'asc' | 'desc';

function useSortState<K extends string>(defaultKey: K, defaultDir: SortDir = 'desc') {
  const [key, setKey] = useState<K>(defaultKey);
  const [dir, setDir] = useState<SortDir>(defaultDir);
  const toggle = (nextKey: K) => {
    if (nextKey === key) setDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    else {
      setKey(nextKey);
      setDir(defaultDir);
    }
  };
  return { key, dir, toggle };
}

type TopItemSortKey = 'count' | 'revenue' | 'name_en';
type RatingSortKey = 'avgRating' | 'reviewCount' | 'name_en';

export default function ReportsPage() {
  const toast = useToast();
  const session = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session && session.role !== 'owner') router.replace('/');
  }, [session, router]);

  // Date range state — drives every filterable section.
  const [preset, setPreset] = useState<RangePreset>('30d');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const dateParams = useMemo(() => {
    if (preset === 'custom') {
      if (customFrom && customTo) return { from: customFrom, to: customTo };
      return undefined;
    }
    return presetToDates(preset);
  }, [preset, customFrom, customTo]);

  const [revenue, setRevenue] = useState<AdminReportRevenue | null>(null);
  const [topItems, setTopItems] = useState<AdminReportTopItem[]>([]);
  const [breakdown, setBreakdown] = useState<AdminReportRoleBreakdown | null>(null);
  const [reviewsReport, setReviewsReport] = useState<AdminReportReviews | null>(null);
  const [trend, setTrend] = useState<AdminRevenueTrendEntry[]>([]);
  const [peakHours, setPeakHours] = useState<AdminPeakHourEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Layer A — v2 report state
  const [revenueKpis, setRevenueKpis] = useState<AdminRevenueKpis | null>(null);
  const [customersReport, setCustomersReport] = useState<AdminCustomersReport | null>(null);
  const [paymentMix, setPaymentMix] = useState<{ breakdown: AdminPaymentMixEntry[]; total: number } | null>(null);
  const [channelMix, setChannelMix] = useState<{ breakdown: AdminChannelMixEntry[]; total: number } | null>(null);
  const [heatmap, setHeatmap] = useState<AdminHeatmapReport | null>(null);
  const [refundsReport, setRefundsReport] = useState<AdminRefundsReport | null>(null);
  const [funnelReport, setFunnelReport] = useState<AdminFunnelReport | null>(null);

  // Layer B — operational insights state
  const [prepSla, setPrepSla] = useState<AdminPrepSlaReport | null>(null);
  const [kioskLeaderboard, setKioskLeaderboard] = useState<AdminKioskLeaderboardRow[]>([]);
  const [slowMovers, setSlowMovers] = useState<AdminSlowMover[]>([]);
  const [productAttach, setProductAttach] = useState<AdminProductPair[]>([]);
  const [offerPerf, setOfferPerf] = useState<AdminOfferPerformance | null>(null);
  const [loyaltyMetrics, setLoyaltyMetrics] = useState<AdminLoyaltyMetrics | null>(null);

  // Layer C — growth analytics state
  const [cohortData, setCohortData] = useState<AdminCohortRow[]>([]);
  const [clvReport, setClvReport] = useState<AdminClvReport | null>(null);
  const [referralFunnel, setReferralFunnel] = useState<AdminReferralFunnel | null>(null);
  const [forecastReport, setForecastReport] = useState<AdminForecastReport | null>(null);
  const [anomalyReport, setAnomalyReport] = useState<AdminAnomalyReport | null>(null);

  // Layer D — current month target for goal-line overlay
  const [currentMonthTarget, setCurrentMonthTarget] = useState<AdminTarget | null>(null);

  const topSort = useSortState<TopItemSortKey>('count');
  const ratingSort = useSortState<RatingSortKey>('avgRating');
  const abortRef = useRef<AbortController | null>(null);

  const loadReports = useCallback(async () => {
    abortRef.current?.abort();
    const ctl = new AbortController();
    abortRef.current = ctl;
    setLoading(true);
    try {
      const [rev, top, roles, revs, trendData, peakData, kpis, customers, pmix, cmix, heat, refunds, funnel, sla, kioskLB, slow, attach, offers, loyalty, cohorts, clv, referrals, forecast, anomalies, targetsRes] = await Promise.all([
        adminApi.getRevenueReport(dateParams, ctl.signal),
        adminApi.getTopItems(dateParams, ctl.signal),
        adminApi.getRoleBreakdown(dateParams, ctl.signal),
        adminApi.getReviewsReport(ctl.signal),
        adminApi.getRevenueTrend(dateParams, ctl.signal),
        adminApi.getPeakHours(dateParams, ctl.signal),
        adminApi.getRevenueKpis(dateParams, ctl.signal),
        adminApi.getCustomersReport(dateParams, ctl.signal),
        adminApi.getPaymentMix(dateParams, ctl.signal),
        adminApi.getChannelMix(dateParams, ctl.signal),
        adminApi.getHeatmap(dateParams, ctl.signal),
        adminApi.getRefundsReport(dateParams, ctl.signal),
        adminApi.getFunnelReport(dateParams, ctl.signal),
        adminApi.getPrepSla(dateParams, ctl.signal),
        adminApi.getKioskLeaderboard(dateParams, ctl.signal),
        adminApi.getSlowMovers(dateParams, ctl.signal),
        adminApi.getProductAttach(dateParams, ctl.signal),
        adminApi.getOfferPerformance(dateParams, ctl.signal),
        adminApi.getLoyaltyMetrics(ctl.signal),
        adminApi.getCohortRetention(undefined, ctl.signal),
        adminApi.getClv(ctl.signal),
        adminApi.getReferralFunnel(ctl.signal),
        adminApi.getForecast(ctl.signal),
        adminApi.getAnomalies(undefined, ctl.signal),
        adminApi.getTargets(ctl.signal),
      ]);
      if (ctl.signal.aborted) return;
      setRevenue(rev);
      setTopItems(top.topItems ?? []);
      setBreakdown(roles);
      setReviewsReport(revs);
      setTrend(trendData.days ?? []);
      setPeakHours(peakData.hours ?? []);
      setRevenueKpis(kpis);
      setCustomersReport(customers);
      setPaymentMix(pmix);
      setChannelMix(cmix);
      setHeatmap(heat);
      setRefundsReport(refunds);
      setFunnelReport(funnel);
      setPrepSla(sla);
      setKioskLeaderboard(kioskLB.rows ?? []);
      setSlowMovers(slow.products ?? []);
      setProductAttach(attach.pairs ?? []);
      setOfferPerf(offers);
      setLoyaltyMetrics(loyalty);
      setCohortData(cohorts.cohorts ?? []);
      setClvReport(clv);
      setReferralFunnel(referrals);
      setForecastReport(forecast);
      setAnomalyReport(anomalies);
      const currentMonth = new Date().toISOString().slice(0, 7);
      setCurrentMonthTarget((targetsRes.targets ?? []).find(t => t.month === currentMonth) ?? null);
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

  function exportCsv(rows: Array<Record<string, string | number>>, filename: string) {
    if (rows.length === 0) {
      toast('info', 'Nothing to export.');
      return;
    }
    const headers = Object.keys(rows[0]!);
    const csv = [
      headers.join(','),
      ...rows.map((r) =>
        headers
          .map((h) => {
            const v = String(r[h] ?? '');
            return v.includes(',') ? `"${v.replace(/"/g, '""')}"` : v;
          })
          .join(','),
      ),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast('success', 'Downloaded.');
  }

  // Sorted tables.
  const sortedTopItems = useMemo(() => {
    const items = [...topItems];
    items.sort((a, b) => {
      const delta =
        topSort.key === 'name_en'
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
      if (ratingSort.key === 'name_en') delta = a.name_en.localeCompare(b.name_en);
      else if (ratingSort.key === 'avgRating') delta = a.avgRating - b.avgRating;
      else if (ratingSort.key === 'reviewCount') delta = a.reviewCount - b.reviewCount;
      return ratingSort.dir === 'asc' ? delta : -delta;
    });
    return items;
  }, [reviewsReport, ratingSort.key, ratingSort.dir]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-40" />
        <div className="grid gap-4 sm:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
    );
  }

  // Reshape role breakdown for the donut.
  const rolePie = breakdown
    ? Object.entries(breakdown.breakdown).map(([role, data]) => ({
        role: role.charAt(0).toUpperCase() + role.slice(1),
        orders: data.orders,
        revenue: data.revenue,
      }))
    : [];

  // Reshape top items for bar chart (top 8).
  const topBars = topItems.slice(0, 8).map((t) => ({
    name: t.name_en.length > 14 ? `${t.name_en.slice(0, 14)}…` : t.name_en,
    full: t.name_en,
    qty: t.count,
    revenue: t.revenue,
  }));

  // Trend chart data — recharts wants whatever-shaped objects.
  const trendData = trend.map((t) => ({
    date: t.date.slice(5), // MM-DD (the API gives YYYY-MM-DD)
    fullDate: t.date,
    revenue: t.revenue,
    orders: t.orders,
  }));

  // Peak hours — fill 0-23 so the X axis is always continuous.
  const peakMap = new Map(peakHours.map((h) => [h.hour, h.count]));
  const peakChart = Array.from({ length: 24 }, (_, h) => ({
    hour: `${h.toString().padStart(2, '0')}:00`,
    count: peakMap.get(h) ?? 0,
  }));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cup-muted">
            Analytics
          </p>
          <h1 className="font-heading text-3xl font-bold text-cup-brown-900">Reports</h1>
          <p className="mt-1 text-sm text-cup-muted">Revenue, top items, and customer mix.</p>
          <button
            type="button"
            onClick={() => window.print()}
            className="mt-2 inline-flex items-center gap-1.5 rounded-pill border border-cup-stroke bg-white px-3 py-1 text-xs font-semibold text-cup-brown-700 transition hover:bg-cup-cream-100"
          >
            <FileText className="h-3 w-3" aria-hidden />
            Print / Save as PDF
          </button>
        </div>

        {/* Phase R.3 — date range presets. Drives revenue / top items /
            role breakdown / revenue trend / peak hours. Reviews is
            currently unfiltered (lifetime) on purpose; it's small data. */}
        <div className="flex flex-wrap items-center gap-2">
          {(['today', '7d', '30d', 'all', 'custom'] as RangePreset[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPreset(p)}
              className={`rounded-pill px-3 py-1.5 text-xs font-semibold transition ${
                preset === p
                  ? 'bg-cup-brown-900 text-white'
                  : 'border border-cup-stroke bg-white text-cup-brown-700 hover:bg-cup-cream-100'
              }`}
            >
              {p === 'today'
                ? 'Today'
                : p === '7d'
                ? 'Last 7 days'
                : p === '30d'
                ? 'Last 30 days'
                : p === 'all'
                ? 'All time'
                : 'Custom'}
            </button>
          ))}
          {preset === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="rounded-lg border border-cup-stroke px-2 py-1.5 text-xs focus:border-cup-orange-600 focus:outline-none"
              />
              <span className="text-xs text-cup-muted">to</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="rounded-lg border border-cup-stroke px-2 py-1.5 text-xs focus:border-cup-orange-600 focus:outline-none"
              />
            </div>
          )}
        </div>
      </header>

      {/* Saved views + owner pulse */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SavedViewsBar
          currentPreset={preset}
          currentFrom={dateParams?.from}
          currentTo={dateParams?.to}
          onApply={(p, f, t) => {
            if (p === 'custom' && f && t) {
              setPreset('custom');
              setCustomFrom(f);
              setCustomTo(t);
            } else {
              setPreset(p as RangePreset);
            }
          }}
        />
      </div>

      {/* v2 KPI cards with delta vs prior period + AOV */}
      {revenueKpis ? (
        <RevenueKpisV2 data={revenueKpis} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <KpiCard label="Today's revenue" value={formatEgp(revenue?.todayRevenueEgp ?? 0)} icon={DollarSign} accent="orange" />
          <KpiCard label="All-time revenue" value={formatEgp(revenue?.totalRevenueEgp ?? 0)} icon={TrendingUp} accent="teal" />
          <KpiCard label="Paid orders" value={String(revenue?.paidOrders ?? 0)} icon={Users} accent="brown" />
        </div>
      )}

      {/* Order funnel */}
      {funnelReport && <FunnelChart data={funnelReport} />}

      {/* New vs returning customers */}
      {customersReport && <CustomersSplitCard data={customersReport} />}

      {/* Cup AI usage analytics */}
      <CupAiUsageTile />

      {/* Payment method + channel mix */}
      <div className="grid gap-4 lg:grid-cols-2">
        {paymentMix && <PaymentMixCard data={paymentMix.breakdown} total={paymentMix.total} />}
        {channelMix && <ChannelMixCard data={channelMix.breakdown} total={channelMix.total} />}
      </div>

      {/* Order heatmap (replaces single-dimension peak hours below) */}
      {heatmap && <OrderHeatmap data={heatmap} />}

      {/* Cancellations & refunds */}
      {refundsReport && <RefundsCard data={refundsReport} />}

      {/* ── Layer B: Operational Mastery ──────────────────────────────── */}

      {/* Prep-time SLA */}
      {prepSla && <PrepSlaCard data={prepSla} />}

      {/* Loyalty program metrics */}
      {loyaltyMetrics && <LoyaltyMetricsCard data={loyaltyMetrics} />}

      {/* Offer / discount performance */}
      {offerPerf && <OfferPerformanceCard data={offerPerf} />}

      {/* Kiosk leaderboard + product attach side by side */}
      <div className="grid gap-4 lg:grid-cols-2">
        {kioskLeaderboard.length > 0 && <KioskLeaderboard rows={kioskLeaderboard} />}
        {productAttach.length > 0 && <ProductAttachCard pairs={productAttach} />}
      </div>

      {/* Slow movers */}
      {slowMovers.length > 0 && <SlowMoversCard products={slowMovers} />}

      {/* ── Layer C: Growth Analytics ────────────────────────────────── */}

      {/* Cohort retention */}
      {cohortData.length > 0 && <CohortRetentionCard cohorts={cohortData} />}

      {/* Customer lifetime value */}
      {clvReport && <ClvCard data={clvReport} />}

      {/* Referral program funnel */}
      {referralFunnel && <ReferralFunnelCard data={referralFunnel} />}

      {/* 7-day revenue forecast */}
      {forecastReport && <ForecastCard data={forecastReport} />}

      {/* Anomaly detection */}
      {anomalyReport && <AnomalyCard data={anomalyReport} />}

      {/* Top items chart */}
      <section className="rounded-card border border-cup-stroke bg-cup-surface p-5 shadow-card">
        <header className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-cup-orange-600" aria-hidden />
            <h2 className="font-heading text-base font-semibold text-cup-brown-900">Top items</h2>
          </div>
          <button
            type="button"
            onClick={() =>
              exportCsv(
                topItems.map((t) => ({
                  Product: t.name_en,
                  Quantity: t.count,
                  Revenue: t.revenue,
                })),
                'top-items.csv',
              )
            }
            className="inline-flex items-center gap-1.5 rounded-pill border border-cup-stroke bg-white px-3 py-1 text-xs font-semibold text-cup-brown-700 transition hover:bg-cup-cream-100"
          >
            <FileText className="h-3 w-3" aria-hidden />
            Export CSV
          </button>
        </header>
        {topBars.length === 0 ? (
          <EmptyState
            icon={BarChart3}
            title="No sales data yet"
            description="Once orders complete, top items will appear here."
          />
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer>
              <BarChart data={topBars} margin={{ top: 10, right: 10, left: -20, bottom: 30 }}>
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#78716C' }}
                  interval={0}
                  angle={-25}
                  textAnchor="end"
                  height={50}
                />
                <YAxis tick={{ fontSize: 11, fill: '#78716C' }} />
                <Tooltip
                  cursor={{ fill: '#FEF3C7' }}
                  contentStyle={{ borderRadius: 12, border: '1px solid #E7E5E4' }}
                  formatter={(value, name) =>
                    name === 'revenue' ? [`${value} EGP`, 'Revenue'] : [String(value), 'Qty']
                  }
                  labelFormatter={(_label, payload) => payload?.[0]?.payload?.full ?? ''}
                />
                <Bar dataKey="qty" fill="#C2410C" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* Role breakdown chart */}
      <section className="rounded-card border border-cup-stroke bg-cup-surface p-5 shadow-card">
        <header className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-cup-orange-600" aria-hidden />
            <h2 className="font-heading text-base font-semibold text-cup-brown-900">
              Customer breakdown
            </h2>
          </div>
          <button
            type="button"
            onClick={() =>
              exportCsv(
                rolePie.map((r) => ({ Role: r.role, Orders: r.orders, Revenue: r.revenue })),
                'role-breakdown.csv',
              )
            }
            className="inline-flex items-center gap-1.5 rounded-pill border border-cup-stroke bg-white px-3 py-1 text-xs font-semibold text-cup-brown-700 transition hover:bg-cup-cream-100"
          >
            <FileText className="h-3 w-3" aria-hidden />
            Export CSV
          </button>
        </header>
        {rolePie.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No customer data yet"
            description="Once orders are placed, the role mix will show here."
          />
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="h-64 w-full">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={rolePie}
                    dataKey="orders"
                    nameKey="role"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={85}
                    paddingAngle={3}
                  >
                    {rolePie.map((_entry, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
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
            <div className="overflow-hidden rounded-chip border border-cup-stroke">
              <table className="w-full text-left text-sm">
                <thead className="bg-cup-cream-100 text-xs font-semibold uppercase text-cup-muted">
                  <tr>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3 text-right">Orders</th>
                    <th className="px-4 py-3 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cup-stroke">
                  {rolePie.map((r, i) => (
                    <tr key={r.role}>
                      <td className="px-4 py-3 font-medium text-cup-brown-900">
                        <span
                          className="mr-2 inline-block h-2.5 w-2.5 rounded-full"
                          style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                          aria-hidden
                        />
                        {r.role}
                      </td>
                      <td className="px-4 py-3 text-right text-cup-brown-700 tabular-nums">
                        {r.orders}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-cup-brown-900 tabular-nums">
                        {formatEgp(r.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Phase R.3 — Revenue trend (line chart). Recharts is reused so the
          visual style matches the existing top-items / customer-breakdown
          charts. The recovery branch used inline divs; we kept recharts. */}
      <section className="rounded-card border border-cup-stroke bg-cup-surface p-5 shadow-card">
        <header className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-cup-orange-600" aria-hidden />
            <h2 className="font-heading text-base font-semibold text-cup-brown-900">
              Revenue trend
            </h2>
          </div>
          <button
            type="button"
            onClick={() =>
              exportCsv(
                trend.map((t) => ({ Date: t.date, RevenueEGP: t.revenue, Orders: t.orders })),
                'revenue-trend.csv',
              )
            }
            className="inline-flex items-center gap-1.5 rounded-pill border border-cup-stroke bg-white px-3 py-1 text-xs font-semibold text-cup-brown-700 transition hover:bg-cup-cream-100"
          >
            <FileText className="h-3 w-3" aria-hidden />
            Export CSV
          </button>
        </header>
        {trendData.length === 0 ? (
          <EmptyState
            icon={BarChart2}
            title="No trend data yet"
            description="Daily revenue will plot here as orders come in."
          />
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer>
              <LineChart data={trendData} margin={{ top: 10, right: 10, left: -10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: '#78716C' }}
                  interval={trendData.length > 14 ? Math.ceil(trendData.length / 12) : 0}
                />
                <YAxis tick={{ fontSize: 11, fill: '#78716C' }} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid #E7E5E4' }}
                  formatter={(value, name) =>
                    name === 'revenue' ? [`${value} EGP`, 'Revenue'] : [String(value), 'Orders']
                  }
                  labelFormatter={(_label, payload) => payload?.[0]?.payload?.fullDate ?? ''}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#C2410C"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#C2410C' }}
                  activeDot={{ r: 5 }}
                />
                {currentMonthTarget && currentMonthTarget.revenueTarget > 0 && (
                  <ReferenceLine
                    y={Math.round(currentMonthTarget.revenueTarget / 30)}
                    stroke="#0F766E"
                    strokeDasharray="6 4"
                    label={{
                      value: `Daily target ${formatEgp(Math.round(currentMonthTarget.revenueTarget / 30))}`,
                      fill: '#0F766E',
                      fontSize: 10,
                      position: 'insideTopRight',
                    }}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* Phase R.3 — Peak hours (bar chart by hour 0-23). */}
      <section className="rounded-card border border-cup-stroke bg-cup-surface p-5 shadow-card">
        <header className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-cup-orange-600" aria-hidden />
            <h2 className="font-heading text-base font-semibold text-cup-brown-900">
              Peak order hours
            </h2>
          </div>
          <button
            type="button"
            onClick={() =>
              exportCsv(
                peakChart.map((p) => ({ Hour: p.hour, Orders: p.count })),
                'peak-hours.csv',
              )
            }
            className="inline-flex items-center gap-1.5 rounded-pill border border-cup-stroke bg-white px-3 py-1 text-xs font-semibold text-cup-brown-700 transition hover:bg-cup-cream-100"
          >
            <FileText className="h-3 w-3" aria-hidden />
            Export CSV
          </button>
        </header>
        {peakHours.length === 0 ? (
          <EmptyState
            icon={Clock}
            title="No hour-of-day data yet"
            description="Order timestamps will populate this chart."
          />
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer>
              <BarChart data={peakChart} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" />
                <XAxis
                  dataKey="hour"
                  tick={{ fontSize: 10, fill: '#78716C' }}
                  interval={1}
                />
                <YAxis tick={{ fontSize: 11, fill: '#78716C' }} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: '#FEF3C7' }}
                  contentStyle={{ borderRadius: 12, border: '1px solid #E7E5E4' }}
                  formatter={(value) => [String(value), 'Orders']}
                />
                <Bar dataKey="count" fill="#0F766E" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* Phase R.3 — Most ordered products (sortable table). */}
      <section className="rounded-card border border-cup-stroke bg-cup-surface p-5 shadow-card">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-cup-orange-600" aria-hidden />
            <h2 className="font-heading text-base font-semibold text-cup-brown-900">
              Most ordered products
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <SortPills
              options={[
                { key: 'count', label: 'Qty Sold' },
                { key: 'revenue', label: 'Revenue' },
                { key: 'name_en', label: 'Name' },
              ]}
              active={topSort.key}
              dir={topSort.dir}
              onSelect={topSort.toggle}
            />
            <button
              type="button"
              onClick={() =>
                exportCsv(
                  sortedTopItems.map((i) => ({
                    Product: i.name_en,
                    Quantity: i.count,
                    Revenue: i.revenue,
                  })),
                  'top-products.csv',
                )
              }
              className="inline-flex items-center gap-1.5 rounded-pill border border-cup-stroke bg-white px-3 py-1 text-xs font-semibold text-cup-brown-700 transition hover:bg-cup-cream-100"
            >
              <FileText className="h-3 w-3" aria-hidden />
              CSV
            </button>
          </div>
        </header>
        {sortedTopItems.length === 0 ? (
          <EmptyState
            icon={BarChart3}
            title="No order data yet"
            description="Sales rankings populate as orders come in."
          />
        ) : (
          <div className="overflow-hidden rounded-chip border border-cup-stroke">
            <table className="w-full text-left text-sm">
              <thead className="bg-cup-cream-100 text-xs font-semibold uppercase text-cup-muted">
                <tr>
                  <SortTh
                    label="Product"
                    sortKey="name_en"
                    active={topSort.key}
                    dir={topSort.dir}
                    onSort={topSort.toggle}
                    className="px-4 py-3"
                  />
                  <SortTh
                    label="Qty Sold"
                    sortKey="count"
                    active={topSort.key}
                    dir={topSort.dir}
                    onSort={topSort.toggle}
                    className="px-4 py-3 text-right"
                  />
                  <SortTh
                    label="Revenue"
                    sortKey="revenue"
                    active={topSort.key}
                    dir={topSort.dir}
                    onSort={topSort.toggle}
                    className="px-4 py-3 text-right"
                  />
                </tr>
              </thead>
              <tbody className="divide-y divide-cup-stroke">
                {sortedTopItems.map((item, i) => (
                  <tr key={i} className="transition-colors hover:bg-cup-cream-50">
                    <td className="px-4 py-3 font-medium text-cup-brown-900">{item.name_en}</td>
                    <td className="px-4 py-3 text-right text-cup-brown-700 tabular-nums">
                      {item.count}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-cup-brown-900 tabular-nums">
                      {formatEgp(item.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Phase R.3 — Product reviews summary tiles + rating distribution. */}
      <section className="space-y-4">
        <header className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-cup-orange-600" aria-hidden />
          <h2 className="font-heading text-base font-semibold text-cup-brown-900">
            Product reviews
          </h2>
        </header>
        <div className="grid gap-4 sm:grid-cols-3">
          <KpiCard
            label="Total reviews"
            value={String(reviewsReport?.total ?? 0)}
            icon={MessageSquare}
            accent="orange"
          />
          <KpiCard
            label="Average rating"
            value={
              reviewsReport
                ? `${reviewsReport.avgRating.toFixed(1)} / 5`
                : '— / 5'
            }
            icon={Star}
            accent="teal"
          />
          <KpiCard
            label="Hidden reviews"
            value={String(reviewsReport?.hiddenCount ?? 0)}
            icon={EyeOff}
            accent="brown"
          />
        </div>

        {reviewsReport && reviewsReport.total === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="No reviews yet"
            description="Customer ratings appear here once orders are reviewed."
          />
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            {/* Rating distribution */}
            <div className="rounded-card border border-cup-stroke bg-cup-surface p-5 shadow-card">
              <h3 className="mb-4 font-heading text-sm font-semibold text-cup-brown-900">
                Rating distribution
              </h3>
              <div className="space-y-2.5">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = reviewsReport?.ratingDistribution[String(star)] ?? 0;
                  const total = reviewsReport?.total ?? 0;
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                  return (
                    <div key={star} className="flex items-center gap-3">
                      <div className="flex w-12 shrink-0 items-center gap-1">
                        <span className="text-sm font-semibold text-cup-brown-900">{star}</span>
                        <Star
                          className="h-3.5 w-3.5 fill-amber-400 text-amber-400"
                          aria-hidden
                        />
                      </div>
                      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-cup-cream-100">
                        <div
                          className="h-full rounded-full bg-amber-400 transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-14 text-right text-xs text-cup-muted tabular-nums">
                        {count} <span className="text-cup-brown-400">({pct}%)</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top 5 by current sort */}
            <div className="rounded-card border border-cup-stroke bg-cup-surface p-5 shadow-card">
              <div className="mb-4 flex items-center justify-between gap-2">
                <h3 className="font-heading text-sm font-semibold text-cup-brown-900">
                  {ratingSort.key === 'avgRating'
                    ? ratingSort.dir === 'desc'
                      ? 'Best rated products'
                      : 'Worst rated products'
                    : ratingSort.key === 'reviewCount'
                    ? ratingSort.dir === 'desc'
                      ? 'Most reviewed products'
                      : 'Least reviewed products'
                    : 'Products A–Z'}
                </h3>
                <DirToggle
                  dir={ratingSort.dir}
                  onToggle={() => ratingSort.toggle(ratingSort.key)}
                />
              </div>
              {sortedByRating.length === 0 ? (
                <p className="text-sm text-cup-muted">No data yet.</p>
              ) : (
                <div className="space-y-3">
                  {sortedByRating.slice(0, 5).map((p) => (
                    <div key={p.productId} className="flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-cup-brown-900">
                          {p.name_en}
                        </p>
                        <div className="mt-0.5 flex items-center gap-2">
                          <StarRow rating={p.avgRating} />
                          <span className="text-xs text-cup-muted">
                            {p.avgRating.toFixed(1)} · {p.reviewCount} review
                            {p.reviewCount !== 1 ? 's' : ''}
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

        {/* Phase R.3 — All products list (sortable, searchable via header sort). */}
        {reviewsReport && reviewsReport.byProduct.length > 0 && (
          <div className="rounded-card border border-cup-stroke bg-cup-surface p-5 shadow-card">
            <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-heading text-sm font-semibold text-cup-brown-900">All products</h3>
              <div className="flex items-center gap-2">
                <SortPills
                  options={[
                    { key: 'avgRating', label: 'Rating' },
                    { key: 'reviewCount', label: 'Reviews' },
                    { key: 'name_en', label: 'Name' },
                  ]}
                  active={ratingSort.key}
                  dir={ratingSort.dir}
                  onSelect={ratingSort.toggle}
                />
                <button
                  type="button"
                  onClick={() =>
                    exportCsv(
                      sortedByRating.map((p) => ({
                        Product: p.name_en,
                        AvgRating: p.avgRating.toFixed(2),
                        Reviews: p.reviewCount,
                        Hidden: p.hiddenCount,
                      })),
                      'reviews-by-product.csv',
                    )
                  }
                  className="inline-flex items-center gap-1.5 rounded-pill border border-cup-stroke bg-white px-3 py-1 text-xs font-semibold text-cup-brown-700 transition hover:bg-cup-cream-100"
                >
                  <FileText className="h-3 w-3" aria-hidden />
                  CSV
                </button>
              </div>
            </header>
            <div className="overflow-hidden rounded-chip border border-cup-stroke">
              <table className="w-full text-left text-sm">
                <thead className="bg-cup-cream-100 text-xs font-semibold uppercase text-cup-muted">
                  <tr>
                    <SortTh
                      label="Product"
                      sortKey="name_en"
                      active={ratingSort.key}
                      dir={ratingSort.dir}
                      onSort={ratingSort.toggle}
                      className="px-4 py-3"
                    />
                    <SortTh
                      label="Avg Rating"
                      sortKey="avgRating"
                      active={ratingSort.key}
                      dir={ratingSort.dir}
                      onSort={ratingSort.toggle}
                      className="px-4 py-3 text-center"
                    />
                    <SortTh
                      label="Reviews"
                      sortKey="reviewCount"
                      active={ratingSort.key}
                      dir={ratingSort.dir}
                      onSort={ratingSort.toggle}
                      className="px-4 py-3 text-right"
                    />
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
                          <span className="text-xs font-semibold text-cup-brown-900">
                            {p.avgRating.toFixed(1)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-cup-brown-700 tabular-nums">
                        {p.reviewCount}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {p.hiddenCount > 0 ? (
                          <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-600">
                            {p.hiddenCount}
                          </span>
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

      {/* Phase K6.4 — by-kiosk daily breakdown. Self-fetching so the
          rest of the Reports page can keep its single-shot Promise.all
          pattern without growing here. */}
      <KioskBreakdownSection />

      {/* ── Layer D: Self-serve owner tools ──────────────────────────── */}

      {/* Owner pulse — quick mobile-friendly snapshot */}
      <PulseCard />

      {/* Interactive Layer D — hidden from print since they're tools, not data. */}
      <div data-print-hide="true" className="space-y-6">
        {/* Period comparison */}
        <ComparisonCard />

        {/* Monthly targets */}
        <TargetsCard />

        {/* Annotations — pin notes to dates */}
        <AnnotationsCard dateRange={dateParams} />

        {/* Bulk CSV export — full data dumps */}
        <MasterExportCard dateRange={dateParams} />

        {/* Weekly email digest */}
        <DigestCard />
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  icon: typeof DollarSign;
  accent: 'orange' | 'teal' | 'brown';
}) {
  const ringClass =
    accent === 'orange'
      ? 'bg-cup-orange-100 text-cup-orange-700'
      : accent === 'teal'
        ? 'bg-cup-teal-100 text-cup-teal-700'
        : 'bg-cup-brown-100 text-cup-brown-700';
  return (
    <div className="rounded-card border border-cup-stroke bg-cup-surface p-5 shadow-card">
      <div className="flex items-center gap-2">
        <span className={`grid h-9 w-9 place-items-center rounded-chip ${ringClass}`}>
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cup-muted">
          {label}
        </span>
      </div>
      <p className="mt-3 font-heading text-3xl font-bold text-cup-brown-900">{value}</p>
    </div>
  );
}

// ── Sortable-table primitives (Phase R.3) ───────────────────────────────────

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`h-3 w-3 ${
            s <= Math.round(rating)
              ? 'fill-amber-400 text-amber-400'
              : 'fill-cup-cream-100 text-cup-stroke'
          }`}
          aria-hidden
        />
      ))}
    </div>
  );
}

function SortPills<K extends string>({
  options,
  active,
  dir,
  onSelect,
}: {
  options: { key: K; label: string }[];
  active: K;
  dir: SortDir;
  onSelect: (key: K) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      {options.map(({ key, label }) => {
        const isActive = key === active;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onSelect(key)}
            className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
              isActive
                ? 'bg-cup-brown-900 text-white'
                : 'bg-cup-cream-100 text-cup-muted hover:bg-cup-cream-200 hover:text-cup-brown-900'
            }`}
          >
            {label}
            {isActive &&
              (dir === 'desc' ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />)}
          </button>
        );
      })}
    </div>
  );
}

function SortTh<K extends string>({
  label,
  sortKey,
  active,
  dir,
  onSort,
  className,
}: {
  label: string;
  sortKey: K;
  active: K;
  dir: SortDir;
  onSort: (key: K) => void;
  className?: string;
}) {
  const isActive = sortKey === active;
  return (
    <th className={`cursor-pointer select-none ${className ?? ''}`} onClick={() => onSort(sortKey)}>
      <span className="inline-flex items-center gap-1">
        {label}
        {isActive ? (
          dir === 'desc' ? (
            <ArrowDown className="h-3 w-3 text-cup-brown-700" />
          ) : (
            <ArrowUp className="h-3 w-3 text-cup-brown-700" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-30" />
        )}
      </span>
    </th>
  );
}

function DirToggle({ dir, onToggle }: { dir: SortDir; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center gap-1 rounded-full bg-cup-cream-100 px-2.5 py-1 text-[11px] font-semibold text-cup-muted transition-colors hover:bg-cup-cream-200 hover:text-cup-brown-900"
    >
      {dir === 'desc' ? (
        <>
          <ArrowDown className="h-3 w-3" /> Best first
        </>
      ) : (
        <>
          <ArrowUp className="h-3 w-3" /> Worst first
        </>
      )}
    </button>
  );
}
