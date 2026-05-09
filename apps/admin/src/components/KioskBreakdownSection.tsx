'use client';

import { useEffect, useState } from 'react';
import { Tablet, AlertCircle, ThumbsUp, ThumbsDown } from 'lucide-react';
import { adminApi, ApiError, type AdminKioskReport } from '@/lib/api';
import { Skeleton } from './Skeleton';
import { EmptyState } from './EmptyState';
import { formatEgp } from '@/lib/format';

/**
 * Phase K6.4 — by-kiosk breakdown for the admin Reports page.
 *
 * Self-fetching component slotted into the existing reports surface so
 * we don't have to refactor the 300+ line Reports page. Polls once on
 * mount; the broader Reports page already has its own refresh model.
 *
 * Each row = one registered kiosk. Empty state covers two cases:
 *   - no kiosks registered yet (zero heartbeats ever)
 *   - kiosks registered but zero orders today (rendered as 'no orders
 *     yet today' inside each row, not as page-level empty state)
 */
export function KioskBreakdownSection() {
  const [data, setData] = useState<AdminKioskReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const ctrl = new AbortController();
    adminApi
      .getKioskReport(ctrl.signal)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((e) => {
        if (cancelled || ctrl.signal.aborted) return;
        setError(e instanceof ApiError ? e.message : 'Could not load kiosk breakdown.');
      });
    return () => {
      cancelled = true;
      ctrl.abort();
    };
  }, []);

  return (
    <section
      aria-label="By-kiosk breakdown"
      className="rounded-card border border-cup-stroke bg-cup-surface p-6 shadow-card"
    >
      <header className="mb-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cup-muted">
            By Kiosk
          </p>
          <h2 className="mt-0.5 font-heading text-xl font-bold text-cup-brown-900">
            Today by device
          </h2>
        </div>
        <span className="text-[11px] font-semibold text-cup-muted">
          {data?.dateIso ?? '—'}
        </span>
      </header>

      {error ? (
        <div
          role="alert"
          className="flex items-center gap-3 rounded-card bg-cup-error/10 px-4 py-3 text-sm font-semibold text-cup-error"
        >
          <AlertCircle className="h-4 w-4" aria-hidden="true" />
          {error}
        </div>
      ) : data === null ? (
        <LoadingRows />
      ) : data.rows.length === 0 ? (
        <EmptyState
          icon={Tablet}
          title="No kiosks registered."
          description="As soon as an iPad sends its first heartbeat, it'll show up here with today's order numbers."
        />
      ) : (
        <ul className="space-y-3">
          {data.rows.map((row) => (
            <KioskRow key={row.kiosk.id} row={row} />
          ))}
        </ul>
      )}
    </section>
  );
}

function KioskRow({ row }: { row: AdminKioskReport['rows'][number] }) {
  const { kiosk, today } = row;
  const top = today.topItems[0];

  return (
    <li
      className={`grid grid-cols-1 gap-3 rounded-card border bg-cup-paper p-4 sm:grid-cols-[1.4fr_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.6fr)] sm:items-center ${
        kiosk.active ? 'border-cup-stroke' : 'border-dashed border-cup-stroke opacity-70'
      }`}
    >
      <div className="min-w-0">
        <p className="truncate font-heading text-base font-bold text-cup-brown-900">
          {kiosk.name}
        </p>
        {/* Ratings sit under the name as a secondary read so they don't
            compete with the orders/revenue columns but are still glanceable.
            Hidden when there are zero ratings today — the row is dense
            enough without an empty 0/0 line. */}
        {today.ratings.up + today.ratings.down > 0 ? (
          <p className="mt-0.5 inline-flex items-center gap-2.5 text-xs font-semibold tabular-nums text-cup-muted">
            <span className="inline-flex items-center gap-1 text-cup-teal-700">
              <ThumbsUp className="h-3 w-3" aria-hidden="true" /> {today.ratings.up}
            </span>
            <span className="inline-flex items-center gap-1 text-cup-error">
              <ThumbsDown className="h-3 w-3" aria-hidden="true" /> {today.ratings.down}
            </span>
          </p>
        ) : null}
        <p className="mt-0.5 truncate font-mono text-[10px] uppercase tracking-wider text-cup-muted">
          {kiosk.id}
        </p>
      </div>

      <Stat label="Orders" value={String(today.orderCount)} />
      <Stat
        label="Revenue"
        value={today.revenueEgp > 0 ? formatEgp(today.revenueEgp) : '—'}
      />

      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cup-muted">
          Top item
        </p>
        {top ? (
          <p className="mt-0.5 truncate font-heading text-sm font-bold text-cup-brown-900">
            {top.name_en}
            <span className="ms-2 text-xs font-semibold text-cup-muted">
              {top.count}×
            </span>
          </p>
        ) : (
          <p className="mt-0.5 truncate text-sm italic text-cup-muted">
            No orders yet today.
          </p>
        )}
      </div>
    </li>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cup-muted">
        {label}
      </p>
      <p className="mt-0.5 font-heading text-base font-bold tabular-nums text-cup-brown-900">
        {value}
      </p>
    </div>
  );
}

function LoadingRows() {
  return (
    <ul className="space-y-3">
      {Array.from({ length: 2 }).map((_, i) => (
        <li
          key={i}
          className="grid grid-cols-1 gap-3 rounded-card border border-cup-stroke bg-cup-paper p-4 sm:grid-cols-[1.4fr_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.6fr)]"
        >
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-44" />
        </li>
      ))}
    </ul>
  );
}
