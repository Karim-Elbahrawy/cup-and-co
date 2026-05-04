'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { OrderStatus } from '@cup-and-co/types';
import { adminApi } from '@/lib/api';
import { OrderTimeline } from '@/components/OrderTimeline';
import { ItemsTable } from '@/components/ItemsTable';
import { StatusPill } from '@/components/StatusPill';
import { useToast } from '@/components/Toast';
import { useSession } from '@/lib/useSession';
import { isOwner } from '@/lib/session';
import { formatEgp, formatTime, timeAgo } from '@/lib/format';
import { nextStatus, previousStatus } from '@/components/OrderCard';
import { useOrderSSE } from '@/lib/useOrdersSSE';

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const session = useSession();
  const toast = useToast();

  const {
    order,
    setOrder,
    timeline,
    setTimeline,
    connectionState,
  } = useOrderSSE(id);
  const [busy, setBusy] = useState(false);

  // Keyboard shortcuts: ←/→ for prev/next status, c for cancel
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!order || busy) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowRight') {
        const next = nextStatus(order.status);
        if (next) advance(next);
      } else if (e.key === 'ArrowLeft') {
        const prev = previousStatus(order.status);
        if (prev) advance(prev);
      } else if (e.key === 'c' && (order.status === 'received' || order.status === 'accepted')) {
        cancel();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order, busy]);

  async function advance(to: OrderStatus) {
    if (!order || busy) return;
    setBusy(true);
    const previousOrder = order;
    // Optimistic
    setOrder({ ...order, status: to });
    try {
      const res = await adminApi.updateOrderStatus(order.id, to);
      setOrder(res.order);
      setTimeline(res.timeline);
      toast('success', `Status updated to ${to}.`);
    } catch (e) {
      setOrder(previousOrder);
      toast('error', (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    if (!order || busy) return;
    if (!window.confirm('Cancel this order? This cannot be undone.')) return;
    setBusy(true);
    try {
      const res = await adminApi.cancelOrder(order.id);
      setOrder(res.order);
      setTimeline(res.timeline);
      toast('success', 'Order cancelled.');
    } catch (e) {
      toast('error', (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function refund() {
    if (!order || busy) return;
    if (!window.confirm('Refund this order? This cannot be undone.')) return;
    setBusy(true);
    try {
      const res = await adminApi.refundOrder(order.id);
      setOrder(res.order);
      setTimeline(res.timeline);
      toast('success', 'Order refunded.');
    } catch (e) {
      toast('error', (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!order) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-12 w-48 rounded-card bg-cup-stroke" />
        <div className="h-32 rounded-card bg-cup-stroke" />
        <div className="h-64 rounded-card bg-cup-stroke" />
      </div>
    );
  }

  const next = nextStatus(order.status);
  const prev = previousStatus(order.status);
  const canCancel = order.status === 'received' || order.status === 'accepted';
  const canRefund = order.status === 'completed' && session && isOwner(session);

  return (
    <div className="space-y-6 print:space-y-3">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-4 print:hidden">
        <div className="flex items-baseline gap-3">
          <Link
            href="/orders"
            className="rounded-pill border border-cup-stroke bg-white px-3 py-1 text-xs font-semibold text-cup-brown-700 hover:bg-cup-cream-100"
          >
            ← Back
          </Link>
          <span className="text-xs text-cup-muted">
            Order <code className="rounded bg-cup-cream-100 px-1.5 py-0.5">{order.id.slice(0, 8)}</code>
          </span>
          <span className="text-xs text-cup-muted">{timeAgo(order.createdAt)}</span>
          {connectionState === 'reconnecting' && (
            <span className="inline-flex items-center gap-1.5 rounded-pill bg-cup-orange-50 px-2 py-0.5 text-[11px] font-semibold text-cup-orange-600">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-cup-orange-500" />
              Reconnecting...
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-pill border border-cup-stroke bg-white px-4 py-2 text-xs font-semibold text-cup-brown-700 hover:bg-cup-cream-100"
        >
          🖨 Print receipt
        </button>
      </header>

      {/* Pickup code hero */}
      <section className="rounded-card border border-cup-stroke bg-white p-8 shadow-card print:border-0 print:shadow-none">
        <div className="flex flex-wrap items-baseline justify-between gap-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cup-muted">
              Pickup code
            </p>
            <p className="mt-1 font-heading text-[64px] font-bold leading-none text-cup-orange-600">
              {order.pickupCode ?? '—'}
            </p>
            <p className="mt-2 text-sm text-cup-muted">
              {order.fulfillmentType === 'pickup'
                ? 'Show this at the counter on collection.'
                : 'Confirm with the courier on delivery.'}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2 text-right">
            <StatusPill status={order.status} />
            <p className="font-heading text-3xl font-bold text-cup-brown-900">
              {formatEgp(order.totalEgp)}
            </p>
            <p className="text-xs uppercase tracking-wider text-cup-muted">
              {order.paymentMethod.replace('_', ' ')} · {order.paymentStatus}
            </p>
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="rounded-card border border-cup-stroke bg-white p-6 shadow-card">
        <h2 className="mb-6 text-xs font-semibold uppercase tracking-[0.18em] text-cup-muted">
          Status timeline
        </h2>
        <OrderTimeline steps={timeline} />
      </section>

      {/* Two-column: items + summary */}
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-card border border-cup-stroke bg-white p-6 shadow-card lg:col-span-2">
          <h2 className="mb-3 font-heading text-base font-semibold">Items</h2>
          <ItemsTable items={order.items} />
        </section>

        <aside className="space-y-4">
          <section className="rounded-card border border-cup-stroke bg-white p-6 shadow-card">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-cup-muted">
              Summary
            </h3>
            <dl className="space-y-2 text-sm">
              <Row label="Subtotal" value={formatEgp(order.subtotalEgp)} />
              {order.discountEgp > 0 && (
                <Row label="Discount" value={`-${formatEgp(order.discountEgp)}`} valueColor="text-cup-success" />
              )}
              {order.pointsRedeemed > 0 && (
                <Row label="Points redeemed" value={`${order.pointsRedeemed}`} />
              )}
              <hr className="border-cup-stroke" />
              <Row label="Total" value={formatEgp(order.totalEgp)} bold />
              <Row label="Fulfillment" value={order.fulfillmentType} />
              {order.scheduledFor && (
                <Row label="Scheduled" value={formatTime(order.scheduledFor)} />
              )}
              {order.pickedUpAt && (
                <Row label="Picked up" value={formatTime(order.pickedUpAt)} />
              )}
            </dl>
          </section>

          {order.notes && (
            <section className="rounded-card border border-cup-stroke bg-white p-6 shadow-card">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-cup-muted">
                Notes
              </h3>
              <p className="text-sm italic text-cup-brown-700">{order.notes}</p>
            </section>
          )}

          {/* Actions */}
          <section className="rounded-card border border-cup-stroke bg-white p-6 shadow-card print:hidden">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-cup-muted">
              Actions
            </h3>
            <div className="flex flex-col gap-2">
              {next && (
                <button
                  type="button"
                  onClick={() => advance(next)}
                  disabled={busy}
                  className="rounded-pill bg-cup-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-subtle hover:bg-cup-orange-700 disabled:opacity-50"
                >
                  Advance to {next} →
                </button>
              )}
              {prev && (
                <button
                  type="button"
                  onClick={() => advance(prev)}
                  disabled={busy}
                  className="rounded-pill border border-cup-stroke bg-white px-4 py-2 text-sm font-semibold text-cup-brown-700 hover:bg-cup-cream-100 disabled:opacity-50"
                >
                  ← Move back to {prev}
                </button>
              )}
              {canCancel && (
                <button
                  type="button"
                  onClick={cancel}
                  disabled={busy}
                  className="rounded-pill border border-cup-error bg-white px-4 py-2 text-sm font-semibold text-cup-error hover:bg-cup-error/5 disabled:opacity-50"
                >
                  Cancel order
                </button>
              )}
              {canRefund && (
                <button
                  type="button"
                  onClick={refund}
                  disabled={busy}
                  className="rounded-pill border border-cup-error bg-white px-4 py-2 text-sm font-semibold text-cup-error hover:bg-cup-error/5 disabled:opacity-50"
                >
                  Refund (owner)
                </button>
              )}
              {!next && !prev && !canCancel && !canRefund && (
                <p className="text-xs italic text-cup-muted">No further actions available.</p>
              )}
            </div>
            <p className="mt-4 text-[10px] text-cup-muted">
              Tip: ←/→ to advance/regress · c to cancel
            </p>
          </section>
        </aside>
      </div>

      {/* Print-only header */}
      <section className="hidden print:block">
        <h1 className="font-heading text-2xl font-bold">Cup &amp; Co</h1>
        <p className="text-sm">Pickup code: {order.pickupCode}</p>
        <p className="text-xs text-gray-500">{formatTime(order.createdAt)}</p>
      </section>

      <button
        type="button"
        onClick={() => router.push('/orders')}
        className="hidden"
      />
    </div>
  );
}

function Row({
  label,
  value,
  bold,
  valueColor,
}: {
  label: string;
  value: string;
  bold?: boolean;
  valueColor?: string;
}) {
  return (
    <div className="flex justify-between">
      <dt className="text-cup-muted">{label}</dt>
      <dd className={`${bold ? 'font-heading text-base font-bold text-cup-brown-900' : ''} ${valueColor ?? ''}`}>
        {value}
      </dd>
    </div>
  );
}
