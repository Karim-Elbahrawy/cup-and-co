'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useStaffAccess } from './useStaffAccess';
import { useKioskActive } from './useKioskActive';

/**
 * K6.3 — kiosk → API heartbeat (every 60s).
 *
 * Lets the admin see at a glance which iPads are alive, what screen
 * each is showing, and which build is running. Auto-creates the kiosk
 * record on first contact (server side, see kiosksStore.recordHeartbeat).
 *
 * Implementation notes:
 *   - One global timer, mounted from AppShell so it survives navigation.
 *   - State is derived from `usePathname()` + the staff store. The kiosk
 *     reports 'cleaning' regardless of pathname when the staff has
 *     locked it; otherwise we read the route.
 *   - Version pulled from NEXT_PUBLIC_KIOSK_VERSION (set at build time
 *     by Vercel; falls back to 'dev' locally).
 *   - Skip if KIOSK_BEARER + KIOSK_ID are not configured (dev without
 *     credentials shouldn't spam an unreachable endpoint).
 */

const HEARTBEAT_INTERVAL_MS = 60_000;

type KioskState =
  | 'attract'
  | 'browsing'
  | 'customizing'
  | 'checkout'
  | 'confirmation'
  | 'cleaning'
  | 'unknown';

function stateForPath(pathname: string | null): KioskState {
  if (!pathname || pathname === '/') return 'attract';
  if (pathname.startsWith('/catalog')) return 'browsing';
  if (pathname.startsWith('/products/')) return 'customizing';
  if (pathname.startsWith('/checkout')) return 'checkout';
  if (pathname.startsWith('/confirmation')) return 'confirmation';
  return 'unknown';
}

export function useKioskHeartbeat(): void {
  const pathname = usePathname();
  const cleaning = useStaffAccess((s) => s.phase === 'cleaning');

  // Hold the latest state in a ref so the interval body always reads
  // fresh values without re-attaching the timer on every navigation.
  const stateRef = useRef<KioskState>('unknown');
  useEffect(() => {
    stateRef.current = cleaning ? 'cleaning' : stateForPath(pathname);
  }, [pathname, cleaning]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
    const bearer = process.env.NEXT_PUBLIC_KIOSK_BEARER ?? '';
    const kioskId = process.env.NEXT_PUBLIC_KIOSK_ID ?? '';
    const version = process.env.NEXT_PUBLIC_KIOSK_VERSION ?? 'dev';
    if (!bearer || !kioskId) return; // Local dev without credentials: no-op.

    let cancelled = false;

    async function beat() {
      if (cancelled) return;
      try {
        const res = await fetch(`${apiBase}/kiosks/heartbeat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${bearer}`,
            'x-kiosk-id': kioskId,
          },
          body: JSON.stringify({ state: stateRef.current, version }),
          credentials: 'omit',
          cache: 'no-store',
        });
        // Per-heartbeat: read the kiosk record back so we know whether
        // an admin has paused us. Failure is silent — the customer
        // never sees heartbeat failures, the next tick retries.
        if (!cancelled && res.ok) {
          const body = (await res.json()) as { kiosk?: { active?: boolean } };
          if (typeof body?.kiosk?.active === 'boolean') {
            useKioskActive.getState().set(body.kiosk.active);
          }
        }
      } catch {
        // Silent — the customer never sees heartbeat failures. We
        // deliberately leave the active flag at its previous value
        // here so a brief network blip doesn't false-pause the kiosk.
      }
    }

    // Kick once on mount so the admin sees the kiosk immediately, then
    // every minute thereafter.
    void beat();
    const interval = window.setInterval(() => void beat(), HEARTBEAT_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);
}
