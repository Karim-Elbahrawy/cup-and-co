'use client';

/**
 * Kitchen Display System (KDS) — full-screen, glanceable order queue for
 * baristas at the bar. Designed for an iPad propped near the espresso
 * machine, not for a desk.
 *
 * Differences from /admin/orders kanban:
 *   - 3 columns (NEW / MAKING / READY) instead of 5. Out_for_delivery sits
 *     with READY; completed orders fall off after a short flash.
 *   - Big-text cards (pickup code at text-6xl, items at text-lg) so the
 *     barista can read across the bar.
 *   - One-tap status advancement — the action button auto-targets the
 *     next status. No menu, no confirmation.
 *   - Audible chime on every new order arrival (Web Audio sine beep, no
 *     asset). Honors a mute toggle in the header.
 *   - Wait-time badge on every card. Cards turn red after the per-product
 *     prep budget is blown (computed from the longest item's prep_minutes).
 *   - Renders fixed inset-0 over the AdminShell so the sidebar doesn't eat
 *     screen space. Tap "Exit" to return to the dashboard.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  ChefHat,
  CupSoda,
  PauseCircle,
  PlayCircle,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { OrderStatus } from '@cup-and-co/types';
import { adminApi, ApiError, type AdminOrder } from '@/lib/api';
import { useOrdersSSE } from '@/lib/useOrdersSSE';
import { useToast } from '@/components/Toast';

interface ColumnDef {
  key: 'new' | 'making' | 'ready';
  label: string;
  /** Statuses that bucket into this column. */
  statuses: OrderStatus[];
  accentClass: string;
  /** Status the action button transitions an order to. */
  nextStatus: OrderStatus;
  actionLabel: string;
  actionIcon: typeof ChefHat;
}

const COLUMNS: ColumnDef[] = [
  {
    key: 'new',
    label: 'New',
    statuses: ['received', 'accepted'],
    accentClass: 'border-cup-orange-300 bg-cup-orange-50',
    nextStatus: 'preparing',
    actionLabel: 'Start brewing',
    actionIcon: ChefHat,
  },
  {
    key: 'making',
    label: 'Making',
    statuses: ['preparing'],
    accentClass: 'border-cup-cream-300 bg-cup-cream-100',
    nextStatus: 'ready',
    actionLabel: 'Mark ready',
    actionIcon: CheckCircle2,
  },
  {
    key: 'ready',
    label: 'Ready',
    statuses: ['ready', 'out_for_delivery'],
    accentClass: 'border-cup-teal-300 bg-cup-teal-50',
    nextStatus: 'completed',
    actionLabel: 'Hand off',
    actionIcon: CupSoda,
  },
];

/** Map every status to its column, returning null for ones we hide (cancelled/refunded/completed). */
function columnFor(status: OrderStatus): ColumnDef | null {
  return COLUMNS.find((c) => c.statuses.includes(status)) ?? null;
}

/**
 * "Wait minutes" since order creation. Updated every 30 s by a tick
 * counter so cards drift their colour without a per-card timer.
 */
function waitMinutes(createdAt: string, nowMs: number): number {
  return Math.max(0, Math.floor((nowMs - new Date(createdAt).getTime()) / 60000));
}

/** Compute a single "prep budget" for an order — longest item prep_minutes. */
function prepBudget(order: AdminOrder): number {
  // Items don't carry prep_minutes on the admin DTO, so use a flat heuristic:
  // 5 minutes for the first item, +1 minute per additional item over 1.
  const totalQty = order.items.reduce((s, it) => s + it.quantity, 0);
  return 5 + Math.max(0, totalQty - 1);
}

/**
 * Beep via Web Audio. Created lazily so we don't spin up an AudioContext
 * until the first chime — Safari/iOS often block audio until a user
 * gesture, but admin/baristas tap "Unmute" on the header which kicks the
 * context awake.
 */
function useChime(enabled: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    return () => {
      ctxRef.current?.close().catch(() => {});
    };
  }, []);

  return useCallback(() => {
    if (!enabled) return;
    try {
      if (!ctxRef.current) {
        const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return;
        ctxRef.current = new Ctor();
      }
      const ctx = ctxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.value = 0.0001;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const t = ctx.currentTime;
      // Quick pluck: ramp up, sustain, ramp down — about 220ms total.
      gain.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      osc.start(t);
      osc.stop(t + 0.24);
    } catch {
      // Audio unavailable or blocked — silent fail is the right call.
    }
  }, [enabled]);
}

export default function KdsPage() {
  const { orders, setOrders, connectionState } = useOrdersSSE();
  const toast = useToast();
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [muted, setMuted] = useState(false);
  const [paused, setPaused] = useState(false);
  const chime = useChime(!muted);

  // Re-render every 30s so wait timers refresh even when no orders change.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  // Track which order ids we've already announced so reconnects/SSE replays
  // don't re-chime for orders we've seen this session.
  const announcedRef = useRef<Set<string>>(new Set());
  const firstLoadRef = useRef(true);

  useEffect(() => {
    if (!orders) return;
    if (firstLoadRef.current) {
      // Seed the announced set from the first load — chime only for orders
      // that arrive AFTER the page has hydrated.
      orders.forEach((o) => announcedRef.current.add(o.id));
      firstLoadRef.current = false;
      return;
    }
    let newCount = 0;
    for (const o of orders) {
      if (announcedRef.current.has(o.id)) continue;
      const col = columnFor(o.status);
      if (col?.key === 'new') newCount++;
      announcedRef.current.add(o.id);
    }
    if (newCount > 0) chime();
  }, [orders, chime]);

  const advance = useCallback(
    async (orderId: string, target: OrderStatus) => {
      if (!orders) return;
      const previous = orders;
      setOrders(orders.map((o) => (o.id === orderId ? { ...o, status: target } : o)));
      setBusy((b) => new Set(b).add(orderId));
      try {
        await adminApi.updateOrderStatus(orderId, target);
      } catch (err) {
        setOrders(previous);
        const message = err instanceof ApiError ? err.message : 'Status change failed.';
        toast('error', message);
      } finally {
        setBusy((b) => {
          const next = new Set(b);
          next.delete(orderId);
          return next;
        });
      }
    },
    [orders, setOrders, toast],
  );

  const grouped = useMemo(() => {
    const out: Record<ColumnDef['key'], AdminOrder[]> = { new: [], making: [], ready: [] };
    for (const o of orders ?? []) {
      const col = columnFor(o.status);
      if (col) out[col.key].push(o);
    }
    // Oldest first inside each column — barista works the queue head-to-tail.
    for (const k of Object.keys(out) as ColumnDef['key'][]) {
      out[k].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    }
    return out;
  }, [orders]);

  const totalActive = grouped.new.length + grouped.making.length + grouped.ready.length;

  return (
    <div className="fixed inset-0 z-30 flex flex-col bg-cup-paper text-cup-brown-900">
      {/* Header */}
      <header className="flex h-16 items-center justify-between border-b border-cup-stroke bg-cup-surface/95 px-4 shadow-subtle md:px-6">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            aria-label="Exit KDS"
            className="grid h-10 w-10 place-items-center rounded-chip border border-cup-stroke bg-white text-cup-brown-700 transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cup-orange-600"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden />
          </Link>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cup-muted">
              Kitchen Display
            </p>
            <h1 className="font-heading text-lg font-bold">{totalActive} active</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className="hidden items-center gap-2 rounded-pill border border-cup-stroke bg-white px-3 py-1.5 text-xs font-semibold text-cup-brown-700 sm:flex"
            aria-live="polite"
          >
            <span
              className={`h-2 w-2 rounded-full ${
                connectionState === 'open'
                  ? 'bg-cup-teal-700 animate-pulse'
                  : connectionState === 'fallback'
                  ? 'bg-cup-brown-400 animate-pulse'
                  : 'bg-cup-orange-500 animate-pulse'
              }`}
              aria-hidden
            />
            {connectionState === 'open'
              ? 'Live'
              : connectionState === 'fallback'
              ? 'Polling'
              : 'Connecting'}
          </span>

          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            aria-pressed={paused}
            className="flex items-center gap-1.5 rounded-pill border border-cup-stroke bg-white px-3 py-2 text-xs font-semibold text-cup-brown-700 transition hover:bg-cup-cream-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cup-orange-600"
          >
            {paused ? <PlayCircle className="h-4 w-4" /> : <PauseCircle className="h-4 w-4" />}
            <span className="hidden sm:inline">{paused ? 'Resume' : 'Pause'}</span>
          </button>

          <button
            type="button"
            onClick={() => setMuted((m) => !m)}
            aria-pressed={muted}
            className="flex items-center gap-1.5 rounded-pill border border-cup-stroke bg-white px-3 py-2 text-xs font-semibold text-cup-brown-700 transition hover:bg-cup-cream-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cup-orange-600"
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            <span className="hidden sm:inline">{muted ? 'Muted' : 'Sound on'}</span>
          </button>
        </div>
      </header>

      {/* Pause overlay banner */}
      {paused && (
        <div
          role="status"
          className="border-b border-cup-orange-300 bg-cup-orange-100 px-4 py-2 text-center text-sm font-semibold text-cup-orange-700"
        >
          Paused — new orders are still arriving but no chime will play. Tap Resume to re-enable
          alerts.
        </div>
      )}

      {/* Columns */}
      <div className="flex flex-1 gap-3 overflow-hidden p-3 md:gap-4 md:p-4">
        {COLUMNS.map((col) => (
          <KdsColumn
            key={col.key}
            def={col}
            orders={grouped[col.key]}
            now={now}
            busyIds={busy}
            onAdvance={advance}
          />
        ))}
      </div>
    </div>
  );
}

function KdsColumn({
  def,
  orders,
  now,
  busyIds,
  onAdvance,
}: {
  def: ColumnDef;
  orders: AdminOrder[];
  now: number;
  busyIds: Set<string>;
  onAdvance: (id: string, target: OrderStatus) => void;
}) {
  return (
    <section
      aria-label={`${def.label} (${orders.length})`}
      className={`flex flex-1 flex-col rounded-card border-2 ${def.accentClass} overflow-hidden`}
    >
      <header className="flex items-center justify-between border-b-2 border-current/20 px-4 py-3">
        <h2 className="font-heading text-lg font-bold uppercase tracking-wide">{def.label}</h2>
        <span className="rounded-pill bg-white px-3 py-1 text-sm font-bold text-cup-brown-900 shadow-subtle">
          {orders.length}
        </span>
      </header>
      <div className="flex-1 space-y-3 overflow-y-auto p-3 md:space-y-4 md:p-4">
        {orders.length === 0 ? (
          <p className="mt-12 text-center text-sm text-cup-muted">Nothing here.</p>
        ) : (
          orders.map((o) => (
            <KdsCard
              key={o.id}
              order={o}
              def={def}
              now={now}
              busy={busyIds.has(o.id)}
              onAdvance={onAdvance}
            />
          ))
        )}
      </div>
    </section>
  );
}

function KdsCard({
  order,
  def,
  now,
  busy,
  onAdvance,
}: {
  order: AdminOrder;
  def: ColumnDef;
  now: number;
  busy: boolean;
  onAdvance: (id: string, target: OrderStatus) => void;
}) {
  const wait = waitMinutes(order.createdAt, now);
  const budget = prepBudget(order);
  const overBudget = wait > budget && def.key !== 'ready';
  const ActionIcon = def.actionIcon;

  return (
    <article
      className={`rounded-card bg-white p-3 shadow-card transition md:p-4 ${
        overBudget ? 'ring-2 ring-cup-error' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cup-muted">
            Pickup
          </p>
          <p className="font-heading text-4xl font-black leading-none text-cup-orange-700 md:text-5xl">
            {order.pickupCode ?? order.id.slice(0, 4).toUpperCase()}
          </p>
        </div>
        <span
          className={`rounded-pill px-2.5 py-1 text-xs font-bold tabular-nums ${
            overBudget
              ? 'bg-cup-error text-white'
              : wait >= Math.max(1, budget - 1)
              ? 'bg-cup-orange-100 text-cup-orange-700'
              : 'bg-cup-paper text-cup-brown-700'
          }`}
        >
          {wait} min
        </span>
      </div>

      <ul className="mt-3 space-y-1.5 text-base font-medium leading-snug text-cup-brown-900 md:text-lg">
        {order.items.map((it) => (
          <li key={`${order.id}-${it.productId}-${JSON.stringify(it.options)}`}>
            <span className="font-bold text-cup-orange-700">{it.quantity}×</span>{' '}
            <span>{it.productNameEn}</span>
            {Object.keys(it.options).length > 0 && (
              <span className="ml-1 text-sm text-cup-muted">
                ({Object.values(it.options).join(', ')})
              </span>
            )}
          </li>
        ))}
      </ul>

      {order.notes && (
        <p className="mt-2 rounded-chip bg-cup-cream-100 px-2 py-1 text-sm text-cup-brown-700">
          Note: {order.notes}
        </p>
      )}

      <button
        type="button"
        onClick={() => onAdvance(order.id, def.nextStatus)}
        disabled={busy}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-pill bg-cup-orange-600 py-3 text-base font-bold uppercase tracking-wide text-white shadow-subtle transition hover:bg-cup-orange-700 active:scale-[0.98] disabled:opacity-60"
      >
        <ActionIcon className="h-5 w-5" aria-hidden />
        {busy ? 'Saving…' : def.actionLabel}
      </button>
    </article>
  );
}
