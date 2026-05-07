'use client';

import type { OrderStatus } from '@cup-and-co/types';
import type { AdminOrder } from '@/lib/api';
import { formatEgp, timeAgo } from '@/lib/format';

/** Forward flow used by the kanban + Today Overview quick-advance buttons. */
const FORWARD: Partial<Record<OrderStatus, OrderStatus>> = {
  received: 'accepted',
  accepted: 'preparing',
  preparing: 'ready',
  ready: 'completed',
  out_for_delivery: 'completed',
};

const BACKWARD: Partial<Record<OrderStatus, OrderStatus>> = {
  accepted: 'received',
  preparing: 'accepted',
  ready: 'preparing',
  completed: 'ready',
};

export function nextStatus(current: OrderStatus): OrderStatus | null {
  return FORWARD[current] ?? null;
}

export function previousStatus(current: OrderStatus): OrderStatus | null {
  return BACKWARD[current] ?? null;
}

interface OrderCardProps {
  order: AdminOrder;
  /** Called with the new status on advance/back. The parent applies optimism + revert. */
  onAdvance?: (next: OrderStatus) => void;
  onBack?: (prev: OrderStatus) => void;
  /** Open the detail drawer for this order. */
  onOpen?: () => void;
  /** When true, the status pill in the corner is hidden (kanban columns already say it). */
  hideStatusPill?: boolean;
  /** Suppress the per-card busy spinner — used during optimistic batches. */
  isBusy?: boolean;
  compact?: boolean;
}

export function OrderCard({
  order,
  onAdvance,
  onBack,
  onOpen,
  hideStatusPill = false,
  isBusy = false,
  compact = false,
}: OrderCardProps) {
  const next = nextStatus(order.status);
  const prev = previousStatus(order.status);
  const items = order.items ?? [];
  const summary =
    items.length === 0
      ? null
      : items.map((it) => `${it.quantity}× ${it.productNameEn}`).join(', ');

  return (
    <article
      tabIndex={onOpen ? 0 : undefined}
      role={onOpen ? 'button' : undefined}
      onClick={onOpen}
      onKeyDown={
        onOpen
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onOpen();
              }
            }
          : undefined
      }
      className={`group relative rounded-card border border-cup-stroke bg-cup-surface p-4 shadow-subtle transition hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cup-orange-600 ${
        isBusy ? 'opacity-60' : ''
      } ${onOpen ? 'cursor-pointer' : ''}`}
      aria-busy={isBusy || undefined}
    >
      <header className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cup-muted">
            Pickup
          </p>
          <p className="font-heading text-2xl font-bold leading-none text-cup-brown-900">
            {order.pickupCode ?? '—'}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 text-right">
          <span className="font-heading text-base font-semibold text-cup-orange-700">
            {formatEgp(order.totalEgp)}
          </span>
          <span className="text-[11px] text-cup-muted">{timeAgo(order.createdAt)}</span>
        </div>
      </header>

      {!compact && summary && (
        <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-cup-brown-700">{summary}</p>
      )}

      {!compact && !summary && (
        <p className="mt-3 text-xs italic text-cup-muted">No items</p>
      )}

      <footer className="mt-3 flex items-center gap-2">
        {onBack && prev && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onBack(prev); }}
            disabled={isBusy}
            className="rounded-pill border border-cup-stroke bg-white px-3 py-1 text-xs font-semibold text-cup-brown-700 transition hover:bg-cup-cream-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cup-orange-600 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={`Move back to ${prev}`}
          >
            ← Back
          </button>
        )}
        {onAdvance && next && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onAdvance(next); }}
            disabled={isBusy}
            className="ml-auto rounded-pill bg-cup-orange-600 px-3 py-1 text-xs font-semibold text-white shadow-subtle transition hover:bg-cup-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-cup-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={`Advance to ${next}`}
          >
            {labelForAdvance(next)} →
          </button>
        )}
        {!next && (
          <span className="ml-auto text-[11px] font-semibold uppercase tracking-wider text-cup-muted">
            Done
          </span>
        )}
      </footer>

      {!hideStatusPill && order.fulfillmentType === 'delivery' && (
        <span className="absolute right-3 top-3 rounded-pill bg-cup-teal-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-cup-teal-700">
          Delivery
        </span>
      )}
    </article>
  );
}

function labelForAdvance(target: OrderStatus): string {
  switch (target) {
    case 'accepted':
      return 'Accept';
    case 'preparing':
      return 'Prep';
    case 'ready':
      return 'Ready';
    case 'completed':
      return 'Complete';
    default:
      return 'Advance';
  }
}
