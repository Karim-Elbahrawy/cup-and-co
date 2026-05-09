'use client';

import { create } from 'zustand';

/**
 * Live "is this kiosk allowed to take orders?" flag.
 *
 * The admin can flip a kiosk's `active` field from /admin/kiosks (the
 * Active/Disabled pill on each row). The kiosk's heartbeat hook reads
 * the response after every POST /kiosks/heartbeat and stamps the
 * latest value here. The `<KioskPausedBanner/>` reads from this store
 * and overlays a fullscreen "kiosk paused" message when active=false.
 *
 * Defaults to `true` until the first heartbeat completes — assume the
 * kiosk is open until told otherwise. Otherwise a fresh iPad would
 * flash a "paused" banner during boot before the first heartbeat
 * lands.
 */

interface KioskActiveState {
  active: boolean;
  /** Set by the heartbeat hook on every successful response. */
  set: (active: boolean) => void;
}

export const useKioskActive = create<KioskActiveState>((set) => ({
  active: true,
  set: (active) => set({ active }),
}));
