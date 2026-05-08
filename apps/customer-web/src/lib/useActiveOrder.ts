'use client';

/**
 * Surfaces the customer's most-recent in-flight order so the home page
 * can show "Your order is brewing — ready in ~3 min" without forcing
 * the user to navigate to /orders.
 *
 * Strategy:
 *   - Fetches `/orders?limit=5` on mount.
 *   - Returns the newest order whose status is NOT terminal
 *     (received / accepted / preparing / ready / out_for_delivery).
 *   - Polls every POLL_MS while there's an active order; stops polling
 *     once the order goes terminal so we don't keep hitting the API.
 *   - Restarts polling when the page regains focus, so a returning
 *     user sees a fresh ETA immediately.
 *
 * Why polling instead of SSE: the customer SSE endpoint is per-order
 * and we don't know which order to subscribe to until we've fetched
 * the list at least once. The list response is small and the home page
 * is loaded infrequently — polling is the simpler, cheaper choice for
 * this surface. The order detail page already uses SSE for sub-second
 * updates while the customer is actively watching.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError } from './api';
import type { ApiOrder } from './types';

const POLL_MS = 30_000;

const TERMINAL_STATUSES: ReadonlyArray<ApiOrder['status']> = [
  'completed',
  'cancelled',
  'refunded',
];

function isActive(order: ApiOrder): boolean {
  return !TERMINAL_STATUSES.includes(order.status);
}

export function useActiveOrder(): {
  order: ApiOrder | null;
  loading: boolean;
  refresh: () => Promise<void>;
} {
  const [order, setOrder] = useState<ApiOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await api.listOrders();
      const candidate = (res.orders ?? []).find(isActive) ?? null;
      setOrder(candidate);
    } catch (err) {
      // 401 means the user signed out mid-poll — clear and stop quietly.
      if (err instanceof ApiError && err.status === 401) {
        setOrder(null);
      }
      // For other errors keep the stale value so the banner doesn't
      // flicker; the next poll may succeed.
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch.
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Poll while we have an active order. Tear down when the order goes
  // terminal OR is no longer present.
  useEffect(() => {
    if (!order) return;
    intervalRef.current = setInterval(refresh, POLL_MS);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [order?.id, order?.status, refresh, order]);

  // Re-fetch when the tab regains focus — covers the user backgrounding
  // the app for a few minutes and coming back wanting a fresh ETA.
  useEffect(() => {
    function onFocus() {
      void refresh();
    }
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') void refresh();
    });
    return () => {
      window.removeEventListener('focus', onFocus);
    };
  }, [refresh]);

  return { order, loading, refresh };
}
