'use client';

import { Gem } from 'lucide-react';
import { formatEgp } from '@/lib/format';
import type { AdminLoyaltyMetrics } from '@/lib/api';

const TIER_COLORS: Record<string, string> = {
  bronze: 'bg-amber-100 text-amber-800',
  silver: 'bg-gray-100 text-gray-700',
  gold: 'bg-yellow-100 text-yellow-800',
};

export function LoyaltyMetricsCard({ data }: { data: AdminLoyaltyMetrics }) {
  const totalTierUsers = Object.values(data.tierDistribution).reduce((s, v) => s + v, 0) || 1;

  return (
    <section className="rounded-card border border-cup-stroke bg-cup-surface p-5 shadow-card">
      <header className="mb-4 flex items-center gap-2">
        <Gem className="h-4 w-4 text-cup-orange-600" aria-hidden />
        <h2 className="font-heading text-base font-semibold text-cup-brown-900">
          Loyalty program
        </h2>
      </header>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Points issued" value={data.totalPointsIssued.toLocaleString()} />
        <Stat label="Points redeemed" value={data.totalPointsRedeemed.toLocaleString()} />
        <Stat label="Redemption rate" value={`${data.redemptionRate}%`} />
        <Stat label="Revenue from redemptions" value={formatEgp(data.revenueFromRedemptions)} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Tier distribution */}
        <div className="rounded-chip border border-cup-stroke bg-cup-cream-50 p-4">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-cup-muted">
            Tier distribution
          </p>
          <div className="space-y-2">
            {Object.entries(data.tierDistribution).map(([tier, count]) => {
              const pct = Math.round((count / totalTierUsers) * 100);
              return (
                <div key={tier} className="flex items-center gap-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${TIER_COLORS[tier] ?? 'bg-cup-cream-100 text-cup-muted'}`}>
                    {tier}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-cup-cream-100">
                    <div
                      className="h-full rounded-full bg-cup-orange-400 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-cup-brown-700 tabular-nums">
                    {count} ({pct}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Points economy */}
        <div className="rounded-chip border border-cup-stroke bg-cup-cream-50 p-4">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-cup-muted">
            Points economy
          </p>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-cup-brown-700">Outstanding balance</span>
              <span className="font-heading text-lg font-bold text-cup-brown-900">
                {data.totalCurrentBalance.toLocaleString()} pts
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-cup-brown-700">Users with points</span>
              <span className="font-heading text-lg font-bold text-cup-brown-900">
                {data.usersWithPoints}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-cup-brown-700">Avg balance</span>
              <span className="font-heading text-lg font-bold text-cup-brown-900">
                {data.usersWithPoints > 0 ? Math.round(data.totalCurrentBalance / data.usersWithPoints) : 0} pts
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-chip border border-cup-stroke bg-cup-cream-50 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-cup-muted">{label}</p>
      <p className="mt-1 font-heading text-xl font-bold text-cup-brown-900">{value}</p>
    </div>
  );
}
