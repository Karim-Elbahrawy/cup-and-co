'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  DollarSign, TrendingUp, Users, Star, EyeOff, MessageSquare,
  ArrowUp, ArrowDown, ArrowUpDown,
} from 'lucide-react';
import { useToast } from '@/components/Toast';
import { useSession } from '@/lib/useSession';
import {
  adminApi,
  type AdminReportRevenue,
  type AdminReportTopItem,
  type AdminReportRoleBreakdown,
  type AdminReportReviews,
} from '@/lib/api';

// ── Sort helpers ─────────────────────────────────────────────────────────────

type SortDir = 'asc' | 'desc';

function useSortState<K extends string>(defaultKey: K, defaultDir: SortDir = 'desc') {
  const [key, setKey] = useState<K>(defaultKey);
  const [dir, setDir] = useState<SortDir>(defaultDir);

  const toggle = (nextKey: K) => {
    if (nextKey === key) {
      setDir(d => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setKey(nextKey);
      setDir(defaultDir);
    }
  };

  return { key, dir, toggle };
}

type TopItemSortKey = 'count' | 'revenue' | 'name_en';
type RatingSortKey   = 'avgRating' | 'reviewCount' | 'name_en';

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const toast   = useToast();
  const session = useSession();
  const router  = useRouter();

  useEffect(() => {
    if (session && session.role !== 'owner') router.replace('/');
  }, [session, router]);

  const [revenue,       setRevenue]       = useState<AdminReportRevenue | null>(null);
  const [topItems,      setTopItems]      = useState<AdminReportTopItem[]>([]);
  const [breakdown,     setBreakdown]     = useState<AdminReportRoleBreakdown | null>(null);
  const [reviewsReport, setReviewsReport] = useState<AdminReportReviews | null>(null);
  const [loading,       setLoading]       = useState(true);

  const topSort    = useSortState<TopItemSortKey>('count');
  const ratingSort = useSortState<RatingSortKey>('avgRating');

  // Sorted top-items
  const sortedTopItems = useMemo(() => {
    const items = [...topItems];
    items.sort((a, b) => {
      let delta = 0;
      if (topSort.key === 'name_en') delta = a.name_en.localeCompare(b.name_en);
      else delta = (a[topSort.key] as number) - (b[topSort.key] as number);
      return topSort.dir === 'asc' ? delta : -delta;
    });
    return items;
  }, [topItems, topSort.key, topSort.dir]);

  // Sorted ratings
  const sortedByRating = useMemo(() => {
    if (!reviewsReport) return [];
    const items = [...reviewsReport.byProduct];
    items.sort((a, b) => {
      let delta = 0;
      if (ratingSort.key === 'name_en')    delta = a.name_en.localeCompare(b.name_en);
      else if (ratingSort.key === 'avgRating')  delta = a.avgRating   - b.avgRating;
      else if (ratingSort.key === 'reviewCount') delta = a.reviewCount - b.reviewCount;
      return ratingSort.dir === 'asc' ? delta : -delta;
    });
    return items;
  }, [reviewsReport, ratingSort.key, ratingSort.dir]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      adminApi.getRevenueReport(),
      adminApi.getTopItems(),
      adminApi.getRoleBreakdown(),
      adminApi.getReviewsReport(),
    ])
      .then(([rev, top, roles, revs]) => {
        if (cancelled) return;
        setRevenue(rev);
        setTopItems(top.topItems);
        setBreakdown(roles);
        setReviewsReport(revs);
      })
      .catch((err) => toast('error', err.message))
      .finally(() => setLoading(false));
    return () => { cancelled = true; };
  }, [toast]);

  if (loading) {
    return (
      <div className="grid min-h-[60vh] place-items-center text-cup-muted">
        Loading reports…
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-cup-brown-900">Reports</h1>

      {/* ── Revenue ── */}
      <section className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-cup-muted">Revenue</h2>
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

      {/* ── Most Ordered Products ── */}
      <section className="rounded-card border border-cup-stroke bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-cup-brown-900">Most Ordered Products</h2>
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
        </div>

        {sortedTopItems.length === 0 ? (
          <p className="text-sm text-cup-muted">No order data yet.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-cup-stroke">
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
                    <td className="px-4 py-3 text-right text-cup-brown-700">{item.count}</td>
                    <td className="px-4 py-3 text-right font-semibold text-cup-brown-900">
                      {item.revenue} EGP
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Role Breakdown ── */}
      <section className="rounded-card border border-cup-stroke bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-cup-brown-900">Role Breakdown</h2>
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
                    <td className="px-4 py-3 text-right font-semibold text-cup-brown-900">
                      {data.revenue} EGP
                    </td>
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

        {/* Summary cards */}
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
            No reviews yet. They'll appear here once customers start rating products.
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
                        <div
                          className="h-full rounded-full bg-amber-400 transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-14 text-right text-xs text-cup-muted">
                        {count} <span className="text-cup-brown-400">({pct}%)</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top 5 by current sort */}
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

        {/* Full per-product sortable table */}
        {reviewsReport && reviewsReport.byProduct.length > 0 && (
          <div className="rounded-card border border-cup-stroke bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-cup-brown-900">All Products</h3>
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
            </div>
            <div className="overflow-hidden rounded-lg border border-cup-stroke">
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
                      <td className="px-4 py-3 text-right text-cup-brown-700">{p.reviewCount}</td>
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
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
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
        <Star
          key={s}
          className={`h-3 w-3 ${
            s <= Math.round(rating)
              ? 'fill-amber-400 text-amber-400'
              : 'fill-cup-cream-100 text-cup-stroke'
          }`}
        />
      ))}
    </div>
  );
}

/** Pill-style sort selector */
function SortPills<K extends string>({
  options,
  active,
  dir,
  onSelect,
}: {
  options: { key: K; label: string }[];
  active: K;
  dir: 'asc' | 'desc';
  onSelect: (key: K) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      {options.map(({ key, label }) => {
        const isActive = key === active;
        return (
          <button
            key={key}
            onClick={() => onSelect(key)}
            className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
              isActive
                ? 'bg-cup-brown-900 text-white'
                : 'bg-cup-cream-100 text-cup-muted hover:bg-cup-cream-200 hover:text-cup-brown-900'
            }`}
          >
            {label}
            {isActive && (
              dir === 'desc'
                ? <ArrowDown className="h-3 w-3" />
                : <ArrowUp   className="h-3 w-3" />
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Sortable <th> with directional arrow */
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
  dir: 'asc' | 'desc';
  onSort: (key: K) => void;
  className?: string;
}) {
  const isActive = sortKey === active;
  return (
    <th
      className={`cursor-pointer select-none ${className ?? ''}`}
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {isActive ? (
          dir === 'desc'
            ? <ArrowDown   className="h-3 w-3 text-cup-brown-700" />
            : <ArrowUp     className="h-3 w-3 text-cup-brown-700" />
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-30" />
        )}
      </span>
    </th>
  );
}

/** Simple asc/desc toggle button */
function DirToggle({ dir, onToggle }: { dir: 'asc' | 'desc'; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      title={dir === 'desc' ? 'Showing best first — click for worst first' : 'Showing worst first — click for best first'}
      className="flex items-center gap-1 rounded-full bg-cup-cream-100 px-2.5 py-1 text-[11px] font-semibold text-cup-muted transition-colors hover:bg-cup-cream-200 hover:text-cup-brown-900"
    >
      {dir === 'desc' ? (
        <><ArrowDown className="h-3 w-3" /> Best first</>
      ) : (
        <><ArrowUp   className="h-3 w-3" /> Worst first</>
      )}
    </button>
  );
}
