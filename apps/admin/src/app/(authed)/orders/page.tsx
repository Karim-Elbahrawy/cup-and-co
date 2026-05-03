'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { OrderStatus } from '@cup-and-co/types';
import { OrderCard } from '@/components/OrderCard';
import { adminApi, ApiError, type AdminOrder } from '@/lib/api';

/** Five visible kanban columns in order. Out_for_delivery rolls into Ready visually. */
const COLUMNS: { status: OrderStatus; label: string; tone: string }[] = [
  { status: 'received', label: 'Received', tone: 'border-cup-orange-200' },
  { status: 'accepted', label: 'Accepted', tone: 'border-cup-cream-300' },
  { status: 'preparing', label: 'Preparing', tone: 'border-cup-orange-300' },
  { status: 'ready', label: 'Ready', tone: 'border-cup-teal-200' },
  { status: 'completed', label: 'Completed', tone: 'border-cup-brown-200' },
];

function bucketFor(order: AdminOrder): OrderStatus {
  // Out-for-delivery sits with Ready until completion.
  if (order.status === 'out_for_delivery') return 'ready';
  return order.status;
}

export default function OrdersKanbanPage() {
  const [orders, setOrders] = useState<AdminOrder[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await adminApi.listOrders(signal);
      setOrders(res.orders);
      setLastRefresh(new Date());
      setError(null);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(err instanceof ApiError ? err.message : 'Could not load orders.');
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

  async function changeStatus(orderId: string, target: OrderStatus) {
    if (!orders) return;
    const previous = orders;
    setOrders(orders.map((o) => (o.id === orderId ? { ...o, status: target } : o)));
    setBusyOrderId(orderId);
    try {
      await adminApi.updateOrderStatus(orderId, target);
    } catch (err) {
      setOrders(previous);
      setError(err instanceof ApiError ? err.message : 'Status change failed.');
    } finally {
      setBusyOrderId(null);
    }
  }

  const columns = useMemo(() => {
    const grouped: Record<OrderStatus, AdminOrder[]> = {
      received: [],
      accepted: [],
      preparing: [],
      ready: [],
      out_for_delivery: [],
      completed: [],
      cancelled: [],
      refunded: [],
    };
    for (const order of orders ?? []) {
      grouped[bucketFor(order)].push(order);
    }
    return grouped;
  }, [orders]);

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cup-muted">
            Live operations
          </p>
          <h1 className="font-heading text-3xl font-bold text-cup-brown-900">Orders</h1>
        </div>
        <div className="flex items-center gap-3 text-xs text-cup-muted">
          <span aria-live="polite">
            {lastRefresh
              ? `Updated ${lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
              : 'Loading…'}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-cup-teal-700" />
            Auto-refresh 5s
          </span>
        </div>
      </header>

      {error && (
        <p
          role="alert"
          className="rounded-chip border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-cup-error"
        >
          {error}
        </p>
      )}

      <div
        className="grid flex-1 grid-cols-1 gap-3 overflow-x-auto pb-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
        role="region"
        aria-label="Order kanban board"
      >
        {COLUMNS.map((col) => {
          const list = (columns[col.status] ?? []).sort((a, b) =>
            b.createdAt.localeCompare(a.createdAt),
          );
          return (
            <section
              key={col.status}
              aria-label={`${col.label} column`}
              className={`flex min-h-[280px] flex-col rounded-card border-2 ${col.tone} bg-cup-surface/70 p-3`}
            >
              <header className="mb-3 flex items-center justify-between px-1">
                <h2 className="font-heading text-sm font-semibold uppercase tracking-wider text-cup-brown-700">
                  {col.label}
                </h2>
                <span className="rounded-pill bg-cup-brown-100 px-2 py-0.5 text-[11px] font-semibold text-cup-brown-700">
                  {list.length}
                </span>
              </header>

              {list.length === 0 ? (
                <p className="grid flex-1 place-items-center px-2 py-6 text-center text-xs text-cup-muted">
                  No orders here.
                </p>
              ) : (
                <ul className="flex flex-col gap-3 overflow-y-auto pr-1" role="list">
                  {list.map((order) => (
                    <li key={order.id}>
                      <OrderCard
                        order={order}
                        onAdvance={(next) => changeStatus(order.id, next)}
                        onBack={(prev) => changeStatus(order.id, prev)}
                        isBusy={busyOrderId === order.id}
                        hideStatusPill
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
