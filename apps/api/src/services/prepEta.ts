/**
 * Prep-time ETA calculator. Returns an estimate (in minutes) of when the
 * given order will reach `ready` status, plus a tag describing what the
 * estimate is based on so the client can show the right copy:
 *
 *   `'queue'`    — order is in `received`/`accepted`. ETA = queue wait
 *                  + prep budget. Updates as orders ahead progress.
 *   `'in_prep'`  — order is in `preparing`. ETA = remaining budget
 *                  (budget − elapsed-since-`preparing`).
 *   `'ready'`    — order is ready/out-for-delivery/completed. ETA = 0.
 *   `'cancelled'` — order was cancelled or refunded. ETA = 0.
 *   `'scheduled'` — order has a future scheduledFor; ETA derived from that.
 *
 * Why server-side: the server is the only place that knows the full
 * queue (orders ahead of yours). The client could approximate from local
 * data but would always lag the truth.
 */

import type { Order } from './orders.js';

export type EtaBasis = 'queue' | 'in_prep' | 'ready' | 'cancelled' | 'scheduled';

export interface PrepEta {
  /** Whole minutes until the order is ready. Always >= 0; never NaN. */
  etaMinutes: number;
  /** What the estimate is computed from — drives copy on the client. */
  basis: EtaBasis;
}

/** Statuses that count as "ahead of you" in the queue. */
const QUEUE_STATUSES: ReadonlyArray<Order['status']> = ['received', 'accepted', 'preparing'];

/**
 * Per-order base prep time (minutes). The first item costs 5 min; each
 * additional item over 1 adds 1 min. Tunable here — match the heuristic
 * used by the KDS card budget so the two views agree.
 */
function prepBudget(order: Order): number {
  const totalQty = order.items.reduce((s, it) => s + it.quantity, 0);
  return 5 + Math.max(0, totalQty - 1);
}

/** Approximate per-order serial cost when waiting in the queue. */
const QUEUE_SLOT_MINUTES = 3;

function statusReachedAt(order: Order, status: Order['status']): string | null {
  for (let i = order.statusHistory.length - 1; i >= 0; i--) {
    const ev = order.statusHistory[i];
    if (ev && ev.status === status) return ev.at;
  }
  return null;
}

/**
 * Compute the ETA for a single order.
 *
 * @param order        The order to compute for.
 * @param allOrders    Every active order in the system. Used to count
 *                     how many are ahead of `order` in the queue.
 * @param nowMs        Current epoch ms. Injected for testability.
 */
export function computePrepEta(
  order: Order,
  allOrders: ReadonlyArray<Order>,
  nowMs: number = Date.now(),
): PrepEta {
  if (order.status === 'cancelled' || order.status === 'refunded') {
    return { etaMinutes: 0, basis: 'cancelled' };
  }
  if (
    order.status === 'ready' ||
    order.status === 'out_for_delivery' ||
    order.status === 'completed'
  ) {
    return { etaMinutes: 0, basis: 'ready' };
  }

  // Pre-orders: if the customer scheduled it for later, the ETA is
  // anchored to that time rather than queue position.
  if (order.scheduledFor) {
    const scheduledMs = new Date(order.scheduledFor).getTime();
    const minutesUntilScheduled = Math.ceil((scheduledMs - nowMs) / 60_000);
    if (minutesUntilScheduled > 5) {
      return {
        etaMinutes: Math.max(0, minutesUntilScheduled),
        basis: 'scheduled',
      };
    }
    // Else fall through: scheduled time is now-ish, treat like a normal
    // queue entry.
  }

  const budget = prepBudget(order);

  if (order.status === 'preparing') {
    const startedAt = statusReachedAt(order, 'preparing');
    if (!startedAt) {
      // Defensive — should always have a history entry for the current
      // status, but if it's missing fall back to the full budget.
      return { etaMinutes: budget, basis: 'in_prep' };
    }
    const elapsedMin = Math.max(0, (nowMs - new Date(startedAt).getTime()) / 60_000);
    const remaining = Math.max(1, Math.ceil(budget - elapsedMin));
    return { etaMinutes: remaining, basis: 'in_prep' };
  }

  // status is received or accepted — count orders ahead in the queue.
  const ordersAhead = allOrders.filter(
    (o) =>
      o.id !== order.id &&
      o.createdAt < order.createdAt &&
      QUEUE_STATUSES.includes(o.status),
  ).length;

  const queueWait = ordersAhead * QUEUE_SLOT_MINUTES;
  return {
    etaMinutes: queueWait + budget,
    basis: 'queue',
  };
}

/**
 * Friendly string for client display, e.g. "ready in ~3 min" or "ready
 * in 1-2 min". Pure formatter — UI may choose to render its own copy
 * via i18n keyed on `basis`. Returned as-is for non-i18n consumers.
 */
export function formatEta(eta: PrepEta): string {
  if (eta.basis === 'ready') return 'Ready now';
  if (eta.basis === 'cancelled') return 'Cancelled';
  if (eta.etaMinutes <= 1) return 'Ready in ~1 min';
  return `Ready in ~${eta.etaMinutes} min`;
}
