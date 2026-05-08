'use client';

import { useEffect, useRef } from 'react';
import { create } from 'zustand';

/**
 * API health store + auto-poller (K5.2).
 *
 * Tracks the live reachability of the API in three layers, ordered by
 * how strongly each implies "the kiosk should refuse new orders":
 *
 *   - `online` (boolean) — last ping result. Drives the small green/amber
 *     pill in the corner. Flips on every success/failure.
 *   - `consecutiveFailures` (number) — bumps on every failure, resets to 0
 *     on every success. Used to gate the louder UI.
 *   - `unavailable` (boolean) — true once consecutiveFailures crosses
 *     UNAVAILABLE_THRESHOLD, false again after the next success. The
 *     fullscreen "order at counter" banner reads from this.
 *
 * One ping every 30s, one timeout per ping at 4s. Three consecutive
 * failures = ~90s of sustained outage before the kiosk goes dark on
 * the customer. That's tight enough that a momentary captive-portal
 * blip won't trigger the banner, but loose enough that a real outage
 * (Render redeploy mid-day, wifi cable yanked) gets the customer
 * directed to the counter inside two minutes.
 *
 * Decoupled from the offline-queue (K5.1) on purpose — that store
 * captures the *transient* case (one POST failed, queue and retry).
 * This store captures the *sustained* case (the API has been wholly
 * absent for 90s+, stop accepting orders the queue will just choke on).
 */

const HEALTH_PATH = '/health';
const PING_INTERVAL_MS = 30_000;
const PING_TIMEOUT_MS = 4_000;
const UNAVAILABLE_THRESHOLD = 3;

interface ApiHealthState {
  /** Last ping verdict. null before the first ping completes. */
  online: boolean | null;
  /** Number of consecutive failed pings. Resets to 0 on any success. */
  consecutiveFailures: number;
  /** Sustained-outage flag — true once threshold is crossed. */
  unavailable: boolean;
  /** Last ping timestamp (ms since epoch). 0 before any ping. */
  lastPingAt: number;
  recordSuccess: () => void;
  recordFailure: () => void;
  /** Test-only — wipe state between describe blocks. */
  reset: () => void;
}

export const useApiHealth = create<ApiHealthState>((set) => ({
  online: null,
  consecutiveFailures: 0,
  unavailable: false,
  lastPingAt: 0,
  recordSuccess: () =>
    set({
      online: true,
      consecutiveFailures: 0,
      unavailable: false,
      lastPingAt: Date.now(),
    }),
  recordFailure: () =>
    set((s) => {
      const next = s.consecutiveFailures + 1;
      return {
        online: false,
        consecutiveFailures: next,
        unavailable: next >= UNAVAILABLE_THRESHOLD,
        lastPingAt: Date.now(),
      };
    }),
  reset: () =>
    set({ online: null, consecutiveFailures: 0, unavailable: false, lastPingAt: 0 }),
}));

/**
 * Mount once at the page root. Polls /health every PING_INTERVAL_MS,
 * stamping success/failure into the store. Exposes nothing — consumers
 * read the store directly.
 *
 * Why kick once on mount + then on the interval: a customer that walks
 * up after the kiosk has been idle gets fresh status within seconds, not
 * after a full 30s. The window 'online' / 'offline' events also trigger
 * an immediate re-ping — if the OS thinks we just regained connectivity,
 * verify by reaching the API rather than trusting `navigator.onLine`.
 */
export function useApiHealthAutoPoll(): void {
  const recordSuccess = useApiHealth((s) => s.recordSuccess);
  const recordFailure = useApiHealth((s) => s.recordFailure);

  // Hold callbacks in refs so the listener+interval attach exactly once
  // — store-action references are stable but TypeScript doesn't enforce
  // it, and React strict-mode mounts twice in dev which would otherwise
  // double the polling rate.
  const recordSuccessRef = useRef(recordSuccess);
  const recordFailureRef = useRef(recordFailure);
  useEffect(() => {
    recordSuccessRef.current = recordSuccess;
  }, [recordSuccess]);
  useEffect(() => {
    recordFailureRef.current = recordFailure;
  }, [recordFailure]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
    let cancelled = false;

    async function ping() {
      if (cancelled) return;
      const ctrl = new AbortController();
      const timer = window.setTimeout(() => ctrl.abort(), PING_TIMEOUT_MS);
      try {
        const res = await fetch(`${apiBase}${HEALTH_PATH}`, {
          method: 'GET',
          signal: ctrl.signal,
          cache: 'no-store',
          credentials: 'omit',
        });
        if (cancelled) return;
        if (res.ok) recordSuccessRef.current();
        else recordFailureRef.current();
      } catch {
        if (!cancelled) recordFailureRef.current();
      } finally {
        window.clearTimeout(timer);
      }
    }

    // Kick once on mount.
    void ping();

    const interval = window.setInterval(() => void ping(), PING_INTERVAL_MS);
    const onOnline = () => void ping();
    const onOffline = () => recordFailureRef.current();
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);
}
