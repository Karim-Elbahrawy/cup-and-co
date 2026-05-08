'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { DollarSign, TrendingUp, Users, BarChart3, FileText } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { Skeleton, SkeletonCard } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';
import { useSession } from '@/lib/useSession';
import { formatEgp } from '@/lib/format';
import {
  adminApi,
  type AdminReportRevenue,
  type AdminReportTopItem,
  type AdminReportRoleBreakdown,
} from '@/lib/api';
import { KioskBreakdownSection } from '@/components/KioskBreakdownSection';

const PIE_COLORS = ['#C2410C', '#0F766E', '#F4A261', '#9A3412', '#FEF3C7', '#1C1917'];

export default function ReportsPage() {
  const toast = useToast();
  const session = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session && session.role !== 'owner') router.replace('/');
  }, [session, router]);

  const [revenue, setRevenue] = useState<AdminReportRevenue | null>(null);
  const [topItems, setTopItems] = useState<AdminReportTopItem[]>([]);
  const [breakdown, setBreakdown] = useState<AdminReportRoleBreakdown | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      adminApi.getRevenueReport(),
      adminApi.getTopItems(),
      adminApi.getRoleBreakdown(),
    ])
      .then(([rev, top, roles]) => {
        if (cancelled) return;
        setRevenue(rev);
        setTopItems(top.topItems);
        setBreakdown(roles);
      })
      .catch((err) => toast('error', err.message))
      .finally(() => setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [toast]);

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

  // Reshape role breakdown for the donut
  const rolePie = breakdown
    ? Object.entries(breakdown.breakdown).map(([role, data]) => ({
        role: role.charAt(0).toUpperCase() + role.slice(1),
        orders: data.orders,
        revenue: data.revenue,
      }))
    : [];

  // Reshape top items for bar chart (top 8)
  const topBars = topItems.slice(0, 8).map((t) => ({
    name: t.name_en.length > 14 ? `${t.name_en.slice(0, 14)}…` : t.name_en,
    full: t.name_en,
    qty: t.count,
    revenue: t.revenue,
  }));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cup-muted">Analytics</p>
          <h1 className="font-heading text-3xl font-bold text-cup-brown-900">Reports</h1>
          <p className="mt-1 text-sm text-cup-muted">Revenue, top items, and customer mix.</p>
        </div>
      </header>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard
          label="Today's revenue"
          value={formatEgp(revenue?.todayRevenueEgp ?? 0)}
          icon={DollarSign}
          accent="orange"
        />
        <KpiCard
          label="All-time revenue"
          value={formatEgp(revenue?.totalRevenueEgp ?? 0)}
          icon={TrendingUp}
          accent="teal"
        />
        <KpiCard
          label="Paid orders"
          value={String(revenue?.paidOrders ?? 0)}
          icon={Users}
          accent="brown"
        />
      </div>

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
                topItems.map((t) => ({ Product: t.name_en, Quantity: t.count, Revenue: t.revenue })),
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

      {/* Phase K6.4 — by-kiosk daily breakdown. Self-fetching so the
          rest of the Reports page can keep its single-shot Promise.all
          pattern without growing here. */}
      <KioskBreakdownSection />
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
