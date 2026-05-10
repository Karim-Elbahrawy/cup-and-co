'use client';

/**
 * Coffee Pass admin tile — surfaces locked-in MRR + active subscriber count
 * on the admin reports page. Self-fetches; renders an empty state when no
 * one has subscribed yet.
 */

import { useEffect, useState } from 'react';
import { Coffee, Loader2, TrendingUp, Users } from 'lucide-react';
import { adminApi, type AdminSubscriptionsSummary } from '@/lib/api';
import { useToast } from '@/components/Toast';

export function CoffeePassTile() {
  const toast = useToast();
  const [stats, setStats] = useState<AdminSubscriptionsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    adminApi
      .getSubscriptionsSummary()
      .then((res) => { if (!cancelled) setStats(res); })
      .catch((err) => { if (!cancelled) toast('error', (err as Error).message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [toast]);

  return (
    <section
      aria-labelledby="coffee-pass-tile-heading"
      className="overflow-hidden rounded-card border border-cup-stroke bg-gradient-to-br from-amber-50 via-white to-cup-cream-100 shadow-sm"
    >
      <header className="flex items-center justify-between gap-3 border-b border-cup-stroke/60 px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-cup-orange-600 text-white">
            <Coffee className="h-3.5 w-3.5" aria-hidden />
          </span>
          <div>
            <h2 id="coffee-pass-tile-heading" className="font-heading text-sm font-bold text-cup-brown-900">
              Coffee Pass
            </h2>
            <p className="text-[11px] text-cup-muted">Subscribers &amp; locked-in MRR this cycle</p>
          </div>
        </div>
      </header>

      {loading || !stats ? (
        <div className="flex items-center justify-center gap-2 px-5 py-10 text-xs text-cup-muted">
          <Loader2 className="h-3 w-3 animate-spin" /> Loading subscriptions…
        </div>
      ) : stats.activeCount + stats.cancelledCount === 0 ? (
        <div className="px-5 py-10 text-center">
          <Coffee className="mx-auto h-8 w-8 text-cup-stroke" aria-hidden />
          <p className="mt-2 text-sm font-semibold text-cup-brown-900">No subscribers yet</p>
          <p className="mt-1 text-xs text-cup-muted">
            Customers subscribe to Coffee Pass from the rewards page in the customer app.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 px-5 py-4 sm:grid-cols-3">
          <Metric
            label="Active subscribers"
            value={stats.activeCount.toLocaleString()}
            icon={Users}
            accent="orange"
          />
          <Metric
            label="Cancelled (cycle ongoing)"
            value={stats.cancelledCount.toLocaleString()}
            icon={Users}
            accent="muted"
            hint="Still paid for this cycle"
          />
          <Metric
            label="Locked-in MRR (cycle)"
            value={`EGP ${stats.monthlyRevenueEgp.toLocaleString()}`}
            icon={TrendingUp}
            accent="teal"
            hint="Active + cancelled-but-still-valid"
          />
        </div>
      )}
    </section>
  );
}

function Metric({
  label, value, icon: Icon, accent, hint,
}: {
  label: string;
  value: string;
  icon: typeof Coffee;
  accent: 'orange' | 'teal' | 'muted';
  hint?: string;
}) {
  const valueClass = accent === 'orange'
    ? 'text-cup-orange-700'
    : accent === 'teal'
      ? 'text-cup-teal-700'
      : 'text-cup-brown-900';
  return (
    <div className="rounded-lg border border-cup-stroke bg-white p-3">
      <div className="flex items-center gap-1.5">
        <Icon className="h-3 w-3 text-cup-muted" aria-hidden />
        <p className="text-[10px] font-semibold uppercase tracking-wider text-cup-muted">{label}</p>
      </div>
      <p className={`mt-1 font-heading text-lg font-bold leading-none ${valueClass}`}>{value}</p>
      {hint && <p className="mt-1 text-[10px] text-cup-muted">{hint}</p>}
    </div>
  );
}
