'use client';

import { Share2 } from 'lucide-react';
import { formatEgp } from '@/lib/format';
import type { AdminReferralFunnel } from '@/lib/api';

export function ReferralFunnelCard({ data }: { data: AdminReferralFunnel }) {
  const funnel = [
    { label: 'Link clicks', value: data.totalClicks },
    { label: 'Signups', value: data.totalSignups },
    { label: 'Conversions', value: data.totalConversions },
  ];
  const maxVal = Math.max(1, funnel[0].value);

  return (
    <section className="rounded-card border border-cup-stroke bg-cup-surface p-5 shadow-card">
      <header className="mb-4 flex items-center gap-2">
        <Share2 className="h-4 w-4 text-cup-orange-600" aria-hidden />
        <h2 className="font-heading text-base font-semibold text-cup-brown-900">
          Referral program
        </h2>
      </header>

      <div className="grid gap-5 md:grid-cols-2">
        {/* Funnel viz */}
        <div className="space-y-2">
          {funnel.map((s, i) => {
            const width = Math.max(12, (s.value / maxVal) * 100);
            const prev = i > 0 ? funnel[i - 1].value : 0;
            const dropoff = prev > 0 ? Math.round(((prev - s.value) / prev) * 100) : 0;
            return (
              <div key={s.label}>
                {i > 0 && dropoff > 0 && (
                  <p className="mb-1 pl-8 text-[10px] font-semibold text-rose-600">
                    ↓ {dropoff}% drop
                  </p>
                )}
                <div className="flex items-center gap-3">
                  <span className="w-24 shrink-0 text-right text-xs font-semibold text-cup-brown-900">
                    {s.label}
                  </span>
                  <div className="flex-1">
                    <div
                      className="flex h-7 items-center rounded-md bg-gradient-to-r from-cup-teal-600 to-cup-teal-400 px-2.5"
                      style={{ width: `${width}%` }}
                    >
                      <span className="text-xs font-bold text-white">{s.value}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Stats */}
        <div className="space-y-3">
          <Stat label="Conversion rate" value={`${data.conversionRate}%`} />
          <Stat label="Revenue from referred" value={formatEgp(data.revenueFromReferred)} />
          <Stat label="Points awarded" value={data.totalPointsAwarded.toLocaleString()} />

          {data.topReferrers.length > 0 && (
            <div className="mt-3">
              <p className="mb-1.5 text-[10px] font-semibold uppercase text-cup-muted">Top referrers</p>
              {data.topReferrers.slice(0, 3).map((r, i) => (
                <div key={r.userId} className="flex items-center justify-between border-b border-cup-stroke py-1.5 last:border-0">
                  <span className="text-xs text-cup-brown-900">#{i + 1} {r.userId.slice(0, 8)}…</span>
                  <span className="text-xs font-semibold text-cup-brown-700">{r.conversions} conv</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-chip border border-cup-stroke bg-cup-cream-50 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-cup-muted">{label}</p>
      <p className="mt-0.5 font-heading text-lg font-bold text-cup-brown-900">{value}</p>
    </div>
  );
}
