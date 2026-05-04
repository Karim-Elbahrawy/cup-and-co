'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { AdminOrder, AdminTimelineStep } from './api';
import { getSession } from './session';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/** Max reconnect backoff in ms. */
const MAX_BACKOFF_MS = 30_000;

export type SSEConnectionState = 'connecting' | 'open' | 'reconnecting' | 'fallback';

/**
 * Hook that subscribes to the admin orders SSE stream.
 *
 * - First message from the server delivers the full order list.
 * - Subsequent messages deliver individual order updates (upsert by id).
 * - Falls back to 5 s polling if SSE fails repeatedly.
 * - Reconnects with exponential backoff (1 s → 2 s → 4 s → … → 30 s).
 */
export function useOrdersSSE() {
  const [orders, setOrders] = useState<AdminOrder[] | null>(null);
  const [connectionState, setConnectionState] = useState<SSEConnectionState>('connecting');
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // Mutable refs so the SSE loop can read latest values without re-running the effect.
  const backoffRef = useRef(1000);
  const retriesRef = useRef(0);
  /** After this many consecutive SSE failures we fall back to polling. */
  const MAX_SSE_RETRIES = 5;

  const connect = useCallback((controller: AbortController) => {
    const session = getSession();
    if (!session) return;

    const authHeaders: Record<string, string> = {
      'x-user-id': session.userId,
      'x-user-role': session.role,
      'x-user-phone': session.phone,
      'x-verification-status': 'approved',
    };

    (async () => {
      try {
        const res = await fetch(`${BASE_URL}/admin/orders/events`, {
          headers: {
            ...authHeaders,
            Accept: 'text/event-stream',
          },
          signal: controller.signal,
          cache: 'no-store',
        });

        if (!res.ok || !res.body) {
          throw new Error(`SSE connection failed (${res.status})`);
        }

        // Connection succeeded — reset backoff.
        backoffRef.current = 1000;
        retriesRef.current = 0;
        setConnectionState('open');

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // SSE messages are separated by double newlines.
          const parts = buffer.split('\n\n');
          // Keep the last (possibly incomplete) chunk in the buffer.
          buffer = parts.pop() ?? '';

          for (const part of parts) {
            const dataLine = part
              .split('\n')
              .find((line) => line.startsWith('data:'));
            if (!dataLine) continue;

            const json = dataLine.slice('data:'.length).trim();
            if (!json) continue;

            try {
              const parsed = JSON.parse(json);

              if (Array.isArray(parsed.orders)) {
                // Initial full list.
                setOrders(parsed.orders as AdminOrder[]);
              } else if (parsed.order) {
                // Individual order update — upsert by id.
                const updated = parsed.order as AdminOrder;
                setOrders((prev) => {
                  if (!prev) return [updated];
                  const idx = prev.findIndex((o) => o.id === updated.id);
                  if (idx === -1) return [updated, ...prev];
                  const next = [...prev];
                  next[idx] = updated;
                  return next;
                });
              }

              setLastRefresh(new Date());
            } catch {
              // Ignore malformed JSON frames.
            }
          }
        }

        // Stream ended normally (server closed) — reconnect.
        if (!controller.signal.aborted) {
          scheduleReconnect(controller);
        }
      } catch (err) {
        if (controller.signal.aborted) return;

        retriesRef.current += 1;

        if (retriesRef.current >= MAX_SSE_RETRIES) {
          // Fall back to polling.
          setConnectionState('fallback');
          startPolling(controller);
          return;
        }

        scheduleReconnect(controller);
      }
    })();
  }, []);

  /** Reconnect after exponential backoff. */
  function scheduleReconnect(controller: AbortController) {
    if (controller.signal.aborted) return;
    setConnectionState('reconnecting');
    const delay = backoffRef.current;
    backoffRef.current = Math.min(backoffRef.current * 2, MAX_BACKOFF_MS);
    setTimeout(() => {
      if (!controller.signal.aborted) {
        connect(controller);
      }
    }, delay);
  }

  /** Fallback: plain 5 s polling via the REST endpoint. */
  function startPolling(controller: AbortController) {
    const poll = async () => {
      if (controller.signal.aborted) return;
      const session = getSession();
      if (!session) return;

      try {
        const res = await fetch(`${BASE_URL}/admin/orders`, {
          headers: {
            'content-type': 'application/json',
            'x-user-id': session.userId,
            'x-user-role': session.role,
            'x-user-phone': session.phone,
            'x-verification-status': 'approved',
          },
          signal: controller.signal,
          cache: 'no-store',
        });
        if (res.ok) {
          const data = (await res.json()) as { orders: AdminOrder[] };
          setOrders(data.orders);
          setLastRefresh(new Date());
        }
      } catch {
        // Ignore — will retry next interval.
      }
    };

    // Immediate first poll.
    poll();
    const intervalId = setInterval(poll, 5000);
    // Clean up polling when the controller aborts.
    controller.signal.addEventListener('abort', () => clearInterval(intervalId));
  }

  useEffect(() => {
    const controller = new AbortController();
    connect(controller);
    return () => controller.abort();
  }, [connect]);

  return { orders, setOrders, connectionState, lastRefresh };
}

// ---------------------------------------------------------------------------
// Single-order SSE hook for the detail page
// ---------------------------------------------------------------------------

/**
 * Subscribes to the admin orders SSE stream and filters for a single order id.
 * Returns the order + timeline, falling back to REST polling on failure.
 */
export function useOrderSSE(orderId: string) {
  const [order, setOrder] = useState<AdminOrder | null>(null);
  const [timeline, setTimeline] = useState<AdminTimelineStep[]>([]);
  const [connectionState, setConnectionState] = useState<SSEConnectionState>('connecting');

  const backoffRef = useRef(1000);
  const retriesRef = useRef(0);
  const MAX_SSE_RETRIES = 5;

  const connect = useCallback(
    (controller: AbortController) => {
      const session = getSession();
      if (!session) return;

      const authHeaders: Record<string, string> = {
        'x-user-id': session.userId,
        'x-user-role': session.role,
        'x-user-phone': session.phone,
        'x-verification-status': 'approved',
      };

      (async () => {
        try {
          const res = await fetch(`${BASE_URL}/admin/orders/events`, {
            headers: {
              ...authHeaders,
              Accept: 'text/event-stream',
            },
            signal: controller.signal,
            cache: 'no-store',
          });

          if (!res.ok || !res.body) {
            throw new Error(`SSE connection failed (${res.status})`);
          }

          backoffRef.current = 1000;
          retriesRef.current = 0;
          setConnectionState('open');

          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          // eslint-disable-next-line no-constant-condition
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const parts = buffer.split('\n\n');
            buffer = parts.pop() ?? '';

            for (const part of parts) {
              const dataLine = part
                .split('\n')
                .find((line) => line.startsWith('data:'));
              if (!dataLine) continue;

              const json = dataLine.slice('data:'.length).trim();
              if (!json) continue;

              try {
                const parsed = JSON.parse(json);

                if (Array.isArray(parsed.orders)) {
                  // Initial full list — find our order.
                  const match = (parsed.orders as AdminOrder[]).find(
                    (o) => o.id === orderId,
                  );
                  if (match) setOrder(match);
                } else if (parsed.order && (parsed.order as AdminOrder).id === orderId) {
                  setOrder(parsed.order as AdminOrder);
                  if (Array.isArray(parsed.timeline)) {
                    setTimeline(parsed.timeline as AdminTimelineStep[]);
                  }
                }
              } catch {
                // Ignore malformed JSON frames.
              }
            }
          }

          if (!controller.signal.aborted) {
            scheduleReconnect(controller);
          }
        } catch (err) {
          if (controller.signal.aborted) return;

          retriesRef.current += 1;

          if (retriesRef.current >= MAX_SSE_RETRIES) {
            setConnectionState('fallback');
            startPolling(controller);
            return;
          }

          scheduleReconnect(controller);
        }
      })();
    },
    [orderId],
  );

  function scheduleReconnect(controller: AbortController) {
    if (controller.signal.aborted) return;
    setConnectionState('reconnecting');
    const delay = backoffRef.current;
    backoffRef.current = Math.min(backoffRef.current * 2, MAX_BACKOFF_MS);
    setTimeout(() => {
      if (!controller.signal.aborted) {
        connect(controller);
      }
    }, delay);
  }

  function startPolling(controller: AbortController) {
    const poll = async () => {
      if (controller.signal.aborted) return;
      const session = getSession();
      if (!session) return;

      try {
        const res = await fetch(`${BASE_URL}/admin/orders/${orderId}`, {
          headers: {
            'content-type': 'application/json',
            'x-user-id': session.userId,
            'x-user-role': session.role,
            'x-user-phone': session.phone,
            'x-verification-status': 'approved',
          },
          signal: controller.signal,
          cache: 'no-store',
        });
        if (res.ok) {
          const data = (await res.json()) as {
            order: AdminOrder;
            timeline: AdminTimelineStep[];
          };
          setOrder(data.order);
          setTimeline(data.timeline);
        }
      } catch {
        // Ignore — will retry next interval.
      }
    };

    poll();
    const intervalId = setInterval(poll, 5000);
    controller.signal.addEventListener('abort', () => clearInterval(intervalId));
  }

  useEffect(() => {
    const controller = new AbortController();
    connect(controller);
    return () => controller.abort();
  }, [connect]);

  // If the SSE stream only gave us the order from the initial list (no timeline),
  // fetch the full detail once to get the timeline.
  useEffect(() => {
    if (order && timeline.length === 0) {
      const session = getSession();
      if (!session) return;
      const controller = new AbortController();
      (async () => {
        try {
          const res = await fetch(`${BASE_URL}/admin/orders/${orderId}`, {
            headers: {
              'content-type': 'application/json',
              'x-user-id': session.userId,
              'x-user-role': session.role,
              'x-user-phone': session.phone,
              'x-verification-status': 'approved',
            },
            signal: controller.signal,
            cache: 'no-store',
          });
          if (res.ok) {
            const data = (await res.json()) as {
              order: AdminOrder;
              timeline: AdminTimelineStep[];
            };
            setOrder(data.order);
            setTimeline(data.timeline);
          }
        } catch {
          // Non-critical — timeline will arrive via SSE on next update.
        }
      })();
      return () => controller.abort();
    }
    // Only run once when we first get the order but have no timeline.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order !== null && timeline.length === 0]);

  return { order, setOrder, timeline, setTimeline, connectionState };
}
