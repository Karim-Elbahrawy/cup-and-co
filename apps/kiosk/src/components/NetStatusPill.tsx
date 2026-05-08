'use client';

import { Wifi, WifiOff } from 'lucide-react';
import { useApiHealth } from '@/lib/useApiHealth';
import { useLang } from '@/lib/useLang';

/**
 * Online/offline indicator (K1.10).
 *
 * Refactored in K5.2 to consume the shared `useApiHealth` store instead
 * of running its own /health poll. The store is driven once-globally by
 * `useApiHealthAutoPoll()` mounted in `AppShell`, so:
 *   - Only one ping fires every 30s for the entire kiosk
 *   - The pill, the unavailable banner, and any future health-aware
 *     surface all read from the same source of truth
 *
 * The pill never blocks UI — even when offline the customer can still
 * browse cached catalog data. Cart submission shows its own message if
 * the network is actually down (offline-queue UX from K5.1).
 *
 * Hidden until the first ping completes (`online === null`) so we don't
 * flash a misleading "Live" or "Reconnecting" before we actually know.
 */
export function NetStatusPill() {
  const lang = useLang((s) => s.lang);
  const online = useApiHealth((s) => s.online);

  if (online === null) return null;

  return (
    <div
      className="pointer-events-none fixed start-6 top-6 z-30 select-none"
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
