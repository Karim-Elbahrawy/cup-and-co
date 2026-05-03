'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, QrCode } from 'lucide-react';
import type { OrderStatus } from '@cup-and-co/types';
import { StatCard } from '@/components/StatCard';
import { OrderCard } from '@/components/OrderCard';
import { KioskToggle } from '@/components/KioskToggle';
import { adminApi, ApiError, type AdminOrder, type AdminSummary } from '@/lib/api';
import { formatEgp } from '@/lib/format';
import { useSession } from '@/lib/useSession';
import { isOwner } from '@/lib/session';

const ACTIVE_STATUSES: OrderStatus[] = ['received', 'accepted', 'preparing', 'ready'];

/**
 * Today Overview — default landing after login. Three stats up top
 * (revenue, active orders, kiosk status), then a "Live Orders" preview with
 * quick-advance buttons, then the owner-only "This Week" placeholder.
 *
 * Polls `/admin/summary` + `/admin/orders` every 5s; Phase 2 swaps in Supabase
 * Realtime. We intentionally hold optimistic state for the quick-advance so a
 * laggy API doesn't block the operator.
 */
export default function TodayOverviewPage() {
  const session = useSession();
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [orders, setOrders] = useState<AdminOrder[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    try {
      const [summaryRes, ordersRes] = await Promise.all([
        adminApi.summary(signal),
        adminApi.listOrders(signal),
      ]);
      setSummary(summaryRes);
      setOrders(ordersRes.orders);
      setError(null);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(
        err instanceof ApiError
          ? err.message
          : 'Could not reach the API. Is it running on port 4000?',
      );
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    refresh(controller.signal);
    const id = setInterval(() => refresh(), 5000);
    return () => {
      controller.abort();
      clearInterval(id);
    };
  }, [refresh]);

  const breakdown = useMemo(() => {
    const counts: Record<OrderStatus, number> = {
      received: 0,
      accepted: 0,
      preparing: 0,
      ready: 0,
      out_for_delivery: 0,
      completed: 0,
      cancelled: 0,
      refunded: 0,
    };
    for (const o of orders ?? []) counts[o.status] += 1;
    return counts;
  }, [orders]);

  const recent = useMemo(
    () =>
      (orders ?? [])
        .filter((o) => ACTIVE_STATUSES.includes(o.status))
        .slice(0, 5),
    [orders],
  );

  async function advance(orderId: string, target: OrderStatus) {
    if (!orders) return;
    const previous = orders;
    // Optimistic: flip the status locally first.
    setOrders(orders.map((o) => (o.id === orderId ? { ...o, status: target } : o)));
    setBusyOrderId(orderId);
    try {
      await adminApi.updateOrderStatus(orderId, target);
      // Background refresh for revenue/active counts.
      refresh();
    } catch (err) {
      setOrders(previous);
      setError(err instanceof ApiError ? err.message : 'Could not update order.');
    } finally {
      setBusyOrderId(null);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cup-muted">
            Today
          </p>
          <h1 className="font-heading text-3xl font-bold text-cup-brown-900">
            Your morning, handled.
          </h1>
        </div>
        <Link
          href="/qr"
          className="inline-flex items-center gap-2 rounded-pill border border-cup-stroke bg-white px-4 py-2 text-sm font-semibold text-cup-brown-700 shadow-subtle transition hover:bg-cup-cream-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cup-orange-600"
        >
          <QrCode className="h-4 w-4" aria-hidden />
          Generate QR receipt
        </Link>
      </header>

      {error && (
        <p
          role="alert"
          className="rounded-chip border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-cup-error"
        >
          {error}
        </p>
      )}

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard
          accent="orange"
          label="Today revenue"
          value={summary ? formatEgp(summary.todayRevenueEgp) : '—'}
          hint={
            <span className="text-cup-muted">
              {/* TODO Phase 2: yesterday delta from /admin/summary?compare=yesterday */}
              vs yesterday — coming Phase 2
            </span>
          }
        />
        <StatCard
          accent="teal"
          label="Active orders"
          value={summary?.activeOrders ?? '—'}
          hint={
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
              <li>
                <span className="font-semibold text-cup-brown-900">{breakdown.received}</span>{' '}
                <span className="text-cup-muted">received</span>
              </li>
              <li>
                <span className="font-semibold text-cup-brown-900">{breakdown.preparing}</span>{' '}
                <span className="text-cup-muted">preparing</span>
              </li>
              <li>
                <span className="font-semibold text-cup-brown-900">{breakdown.ready}</span>{' '}
                <span className="text-cup-muted">ready</span>
              </li>
            </ul>
          }
        />
        <StatCard
          label="Kiosk status"
          value={
            <div className="flex items-center justify-between gap-3">
              <span className="font-heading text-3xl font-bold text-cup-teal-700">Open</span>
              <KioskToggle initialOpen onChange={async () => undefined} />
            </div>
          }
          hint={
            // TODO Phase 2: PATCH /admin/kiosk/status — endpoint not yet in API,
            // toggle is currently UI-only state.
            <span className="text-xs text-cup-muted">Toggle is UI-only until Phase 2 ships /admin/kiosk/status.</span>
          }
        />
      </section>

      <section
        className="rounded-card border border-cup-stroke bg-cup-surface p-5 shadow-card"
        aria-label="Live orders preview"
      >
        <header className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-heading text-lg font-semibold text-cup-brown-900">
              Live orders
            </h2>
            <p className="text-sm text-cup-muted">5 most recent · refreshes every 5s</p>
          </div>
          <Link
            href="/orders"
            className="inline-flex items-center gap-1 text-sm font-semibold text-cup-orange-700 hover:text-cup-orange-600 focus-visible:outline-none focus-visible:underline"
          >
            Open kanban
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </header>

        {orders === null ? (
          <p className="text-sm text-cup-muted">Loading orders…</p>
        ) : recent.length === 0 ? (
          <p className="rounded-chip bg-cup-cream-100 px-4 py-6 text-center text-sm text-cup-muted">
            No active orders right now. Skip the line — first one&apos;s on its way.
          </p>
        ) : (
          <ul
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
            role="list"
            aria-live="polite"
          >
            {recent.map((order) => (
              <li key={order.id}>
                <OrderCard
                  order={order}
                  compact
                  onAdvance={(next) => advance(order.id, next)}
                  isBusy={busyOrderId === order.id}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      {isOwner(session) && (
        <section
          className="rounded-card border border-dashed border-cup-stroke bg-cup-surface/60 p-5 text-cup-muted"
          aria-label="This week"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em]">This week</p>
          <p className="mt-2 font-heading text-lg text-cup-brown-700">
            Revenue trends, top items, busiest hours.
          </p>
          <p className="mt-1 text-sm">Phase 5 brings real charts.</p>
        </section>
      )}
    </div>
  );
}
