'use client';

import { useEffect, useState } from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { useLang } from '@/lib/useLang';

/**
 * Online/offline indicator (K1.10).
 *
 * Renders a tiny pill in the top-left corner. Green "Live" when the
 * device thinks it's online; amber "Reconnecting" when offline.
 *
 * Detection layers:
 *   1. navigator.onLine — instant, but unreliable on iPad Safari (it
 *      reports true on captive-portal redirects). Use as the primary
 *      signal.
 *   2. window 'online' / 'offline' events — fired by the browser when
 *      the connectivity actually changes.
 *   3. Periodic /health ping — every 30s, fetches the API's health
 *      endpoint with a 4s timeout. Catches the captive-portal case
 *      where navigator.onLine lies.
 *
 * The pill never blocks UI — even when offline, the customer can still
 * browse cached catalog data. Cart submission shows its own clear error
 * if the network is actually down (handled at the checkout layer).
 */

const HEALTH_PATH = '/health';
const PING_INTERVAL_MS = 30_000;
const PING_TIMEOUT_MS = 4_000;

export function NetStatusPill() {
  const lang = useLang((s) => s.lang);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    setOnline(navigator.onLine);

    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
    let cancelled = false;
    const ping = async () => {
      const ctrl = new AbortController();
      const t = window.setTimeout(() => ctrl.abort(), PING_TIMEOUT_MS);
      try {
        const res = await fetch(`${apiBase}${HEALTH_PATH}`, {
          method: 'GET',
          signal: ctrl.signal,
          cache: 'no-store',
          credentials: 'omit',
        });
        if (!cancelled) setOnline(res.ok);
      } catch {
        if (!cancelled) setOnline(false);
      } finally {
        window.clearTimeout(t);
      }
    };
    const interval = window.setInterval(ping, PING_INTERVAL_MS);
    // Don't fire an immediate ping on mount — every page mount would do
    // it, and the iPad would chatter on every nav. The 30s cadence catches
    // real outages quickly enough for cafe ops.

    return () => {
      cancelled = true;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.clearInterval(interval);
    };
  }, []);

  return (
    <div
      className="pointer-events-none fixed left-6 top-6 z-30 select-none"
      aria-live="polite"
    >
      <span
        className={[
          'inline-flex items-center gap-2 rounded-pill px-3 py-1.5 text-xs font-bold uppercase tracking-wider shadow-subtle',
          online
            ? 'bg-[var(--cup-success)]/15 text-[var(--cup-success)]'
            : 'bg-[var(--cup-warning)]/15 text-[var(--cup-warning)]',
        ].join(' ')}
        role="status"
      >
        {online ? (
          <Wifi className="h-3.5 w-3.5" aria-hidden="true" />
        ) : (
          <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        {online
          ? lang === 'ar' ? 'متصل' : 'Live'
          : lang === 'ar' ? 'جاري الاتصال' : 'Reconnecting'}
      </span>
    </div>
  );
}
