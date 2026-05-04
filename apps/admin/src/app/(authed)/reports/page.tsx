'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DollarSign, TrendingUp, Users } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { useSession } from '@/lib/useSession';
import {
  adminApi,
  type AdminReportRevenue,
  type AdminReportTopItem,
  type AdminReportRoleBreakdown,
} from '@/lib/api';

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
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-cup-brown-900">Reports</h1>

      {/* Revenue cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-card border border-cup-stroke bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-cup-muted">
            <DollarSign className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase">Today Revenue</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-cup-brown-900">
            {revenue?.todayRevenueEgp ?? 0} EGP
          </p>
        </div>
        <div className="rounded-card border border-cup-stroke bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-cup-muted">
            <TrendingUp className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase">Total Revenue</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-cup-brown-900">
            {revenue?.totalRevenueEgp ?? 0} EGP
          </p>
        </div>
        <div className="rounded-card border border-cup-stroke bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-cup-muted">
            <Users className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase">Paid Orders</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-cup-brown-900">
            {revenue?.paidOrders ?? 0}
          </p>
        </div>
      </div>

      {/* Top items */}
      <div className="rounded-card border border-cup-stroke bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-cup-brown-900">Top Items</h2>
        {topItems.length === 0 ? (
          <p className="text-sm text-cup-muted">No order data yet.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-cup-stroke">
            <table className="w-full text-left text-sm">
              <thead className="bg-cup-cream-100 text-xs font-semibold uppercase text-cup-muted">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3 text-right">Qty Sold</th>
                  <th className="px-4 py-3 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cup-stroke">
                {topItems.map((item, i) => (
                  <tr key={i}>
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
      </div>

      {/* Role breakdown */}
      <div className="rounded-card border border-cup-stroke bg-white p-5 shadow-sm">
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
                  <tr key={role}>
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
      </div>
    </div>
  );
}
