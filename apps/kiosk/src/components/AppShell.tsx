'use client';

import { useLangDocSync } from '@/lib/useLang';
import { NetStatusPill } from './NetStatusPill';

/**
 * Thin client wrapper mounted from the root layout. Owns two cross-page
 * effects:
 *   - syncs the current language to <html lang/dir>
 *   - renders the online/offline pill on every page
 *
 * Kept outside the route segments so it doesn't unmount/remount on
 * navigation, which would re-run the health-ping interval each time and
 * miss real outages.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  useLangDocSync();
  return (
    <>
      <NetStatusPill />
      {children}
    </>
  );
}
