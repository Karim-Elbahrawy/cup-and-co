'use client';

import { useLangDocSync } from '@/lib/useLang';
import { useOfflineQueueAutoFlush } from '@/lib/useOfflineQueue';
import { api } from '@/lib/api';
import { NetStatusPill } from './NetStatusPill';
import { OfflineQueuePill } from './OfflineQueuePill';

/**
 * Thin client wrapper mounted from the root layout. Owns three cross-page
 * effects:
 *   - syncs the current language to <html lang/dir>
 *   - renders the online/offline + offline-queue pills on every page
 *   - drives the K5.1 offline-queue auto-flush (30s tick + online events)
 *
 * Kept outside the route segments so it doesn't unmount/remount on
 * navigation, which would re-run the health-ping interval and reset the
 * flush timer each time.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  useLangDocSync();
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
    </>
  );
}
