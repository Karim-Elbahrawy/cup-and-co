'use client';

import { useEffect, useRef } from 'react';
import { create } from 'zustand';
import {
  enqueueOrder,
  peekAll,
  pendingCount,
  removeOrder,
  recordFailure,
  type QueuedOrder,
  type QueuedOrderBody,
} from './offlineQueue';

/**
 * Offline-queue store + auto-flush driver (K5.1).
 *
 * The store exposes:
 *   - `count` — # pending orders, refreshed on every mutation
 *   - `enqueue({ body, userJwt })` — wraps offlineQueue.enqueueOrder and
 *     bumps `count`. Returns the temp pickup code so the caller can
 *     immediately show the customer something.
 *   - `flushNow(send)` — drains the queue. The caller passes in the
 *     real network send function, which the store wraps with
 *     remove-on-success / recordFailure-on-throw.
 *
 * `useOfflineQueueAutoFlush()` is a tiny React hook that callers mount
 * once at the page root. It listens to `online` events + a 30s tick and
 * calls flushNow with a default network sender.
 *
 * The store itself doesn't know about the API client — keeps it
 * test-friendly (you can pass any `send` from a test).
 */

const FLUSH_INTERVAL_MS = 30_000;

interface OfflineQueueState {
  count: number;
  isFlushing: boolean;
  init: () => Promise<void>;
  enqueue: (args: {
    body: QueuedOrderBody;
    userJwt?: string;
  }) => Promise<{ tempId: string; tempPickupCode: string }>;
  flushNow: (
    send: (row: QueuedOrder) => Promise<void>,
  ) => Promise<{ flushed: number; failed: number }>;
}

export const useOfflineQueue = create<OfflineQueueState>((set, get) => ({
  count: 0,
  isFlushing: false,

  /** Read the current count from IDB on first mount. */
  async init() {
    try {
      const c = await pendingCount();
      set({ count: c });
    } catch {
      // IDB unavailable (private mode, very old browser) — store stays at 0.
    }
  },

  async enqueue({ body, userJwt }) {
    const row = await enqueueOrder({ body, userJwt });
    set({ count: get().count + 1 });
    return { tempId: row.tempId, tempPickupCode: row.tempPickupCode };
  },

  async flushNow(send) {
    if (get().isFlushing) return { flushed: 0, failed: 0 };
    set({ isFlushing: true });
    let flushed = 0;
    let failed = 0;
    try {
      const rows = await peekAll();
      for (const row of rows) {
        try {
          await send(row);
          await removeOrder(row.tempId);
          flushed += 1;
        } catch (e) {
          await recordFailure(
            row.tempId,
            e instanceof Error ? e.message : String(e),
          );
          failed += 1;
          // Stop on first failure — if the network is down again we don't
          // want to torch every entry's retry counter on the same dead net.
          break;
        }
      }
      const c = await pendingCount();
      set({ count: c });
    } finally {
      set({ isFlushing: false });
    }
    return { flushed, failed };
  },
}));

/**
 * Mount once at the kiosk root. Reads the initial count, listens for
 * `online` events, and runs a 30s flush poll. Pass the real network
 * sender (typically a closure around `api.placeOrder` resolving the
 * QueuedOrderBody back into kwargs).
 */
export function useOfflineQueueAutoFlush(
  send: (row: QueuedOrder) => Promise<void>,
): void {
  const init = useOfflineQueue((s) => s.init);
  const flushNow = useOfflineQueue((s) => s.flushNow);
  // Hold `send` in a ref so we can attach the interval + listener once
  // and not reattach when the consumer rebinds (typical when send closes
  // over router/store state).
  const sendRef = useRef(send);
  useEffect(() => {
    sendRef.current = send;
  }, [send]);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let cancelled = false;
    const tryFlush = async () => {
      if (cancelled) return;
      if (typeof navigator !== 'undefined' && !navigator.onLine) return;
      if (useOfflineQueue.getState().count === 0) return;
      try {
        await flushNow((row) => sendRef.current(row));
      } catch {
        // flushNow already absorbs per-row errors; this catch is for
        // unexpected store-level failures. Swallow — next tick will retry.
      }
    };

    const onOnline = () => void tryFlush();
    window.addEventListener('online', onOnline);
    const interval = window.setInterval(() => void tryFlush(), FLUSH_INTERVAL_MS);
    // Immediate kick on mount in case we already have a pending queue
    // and we're online — common after a PWA cold start.
    void tryFlush();

    return () => {
      cancelled = true;
      window.removeEventListener('online', onOnline);
      window.clearInterval(interval);
    };
  }, [flushNow]);
}
