'use client';

import { useLangDocSync } from '@/lib/useLang';
import { useOfflineQueueAutoFlush } from '@/lib/useOfflineQueue';
import { useApiHealthAutoPoll } from '@/lib/useApiHealth';
import { api } from '@/lib/api';
import { NetStatusPill } from './NetStatusPill';
import { OfflineQueuePill } from './OfflineQueuePill';
import { KioskUnavailableBanner } from './KioskUnavailableBanner';

/**
 * Thin client wrapper mounted from the root layout. Owns four cross-page
 * effects:
 *   - syncs the current language to <html lang/dir>
 *   - drives the K5.2 API health poll (single source of truth for
 *     online/offline + sustained-outage detection)
 *   - drives the K5.1 offline-queue auto-flush (30s tick + online events)
 *   - renders the global pills (network status, offline queue) and the
 *     fullscreen "kiosk temporarily unavailable" banner
 *
 * Kept outside the route segments so it doesn't unmount/remount on
 * navigation, which would re-run the health-ping interval and reset the
 * flush timer each time.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  useLangDocSync();
  // K5.2 — single global health poller. NetStatusPill + the unavailable
  // banner both consume the resulting useApiHealth store.
  useApiHealthAutoPoll();
  // K5.1 — drain the offline order queue on a 30s tick + on `online`
  // events. The send fn replays the row's body (which is the exact body
  // that would have been sent originally) and uses the row's stashed
  // userJwt if the customer was identified at queue time.
  useOfflineQueueAutoFlush(async (row) => {
    await api.postOrder(row.body, row.userJwt);
  });

  return (
    <>
      <NetStatusPill />
      <OfflineQueuePill />
      {children}
      <KioskUnavailableBanner />
    </>
  );
}
