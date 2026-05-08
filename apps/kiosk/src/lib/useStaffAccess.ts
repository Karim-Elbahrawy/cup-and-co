'use client';

import { useEffect, useRef } from 'react';
import { create } from 'zustand';

/**
 * Staff-assist access store (K5.3).
 *
 * The kiosk is normally locked to customers. Staff get a hidden path:
 *   1. Quadruple-tap a fixed corner trigger zone within 1.5 seconds.
 *   2. Numeric PIN modal opens.
 *   3. Correct PIN flips state to 'unlocked' and shows the staff overlay.
 *   4. Auto-closes after STAFF_IDLE_MS of inactivity (30s by spec).
 *   5. "Lock for cleaning" enters a 'cleaning' state that overlays the
 *      whole kiosk for 5 minutes (or until staff re-enter the PIN).
 *
 * State machine:
 *
 *     locked  ──quadrupleTap──▶  pin   ──verify(ok)──▶  unlocked
 *        ▲                        │                        │
 *        │                        ▼ verify(fail)           │
 *        │                       (stays in pin, error)     │
 *        │                                                 │
 *        ├──────────────────────  close  ◀─────────────────┘
 *        │                                                 │
 *        │                                       ──cleaning──▶  cleaning
 *        │                                                          │
 *        └────────────── auto-unlock 5min OR pin ◀──────────────────┘
 *
 * The PIN is read from NEXT_PUBLIC_KIOSK_STAFF_PIN at runtime. K6 will
 * move this to a per-kiosk config; for now the env var is good enough
 * and matches the K1.12 KIOSK_BEARER_TOKEN pattern.
 */

export type StaffPhase = 'locked' | 'pin' | 'unlocked' | 'cleaning';

export const STAFF_IDLE_MS = 30_000;
export const CLEANING_AUTO_UNLOCK_MS = 5 * 60_000;
const QUADRUPLE_TAP_WINDOW_MS = 1500;

const STAFF_PIN = process.env.NEXT_PUBLIC_KIOSK_STAFF_PIN ?? '1234';

interface StaffAccessState {
  phase: StaffPhase;
  /** ms since epoch. Used to auto-close after inactivity. */
  lastActivityAt: number;
  /** Bumps on activity to force re-render of any hooks reading it. */
  activityNonce: number;
  /** Recent tap timestamps in the trigger zone — used to detect a quadruple. */
  tapTimes: number[];
  registerTriggerTap: () => boolean;
  openPin: () => void;
  cancelPin: () => void;
  verifyPin: (input: string) => boolean;
  closeOverlay: () => void;
  enterCleaning: () => void;
  exitCleaning: () => void;
  bumpActivity: () => void;
  reset: () => void;
}

export const useStaffAccess = create<StaffAccessState>((set, get) => ({
  phase: 'locked',
  lastActivityAt: Date.now(),
  activityNonce: 0,
  tapTimes: [],

  registerTriggerTap() {
    const now = Date.now();
    const recent = [...get().tapTimes, now].filter(
      (t) => now - t <= QUADRUPLE_TAP_WINDOW_MS,
    );
    set({ tapTimes: recent });
    if (recent.length >= 4) {
      set({ tapTimes: [], phase: 'pin', lastActivityAt: now });
      return true;
    }
    return false;
  },

  openPin: () => set({ phase: 'pin', lastActivityAt: Date.now() }),
  cancelPin: () => set({ phase: 'locked', tapTimes: [] }),

  verifyPin(input) {
    if (input === STAFF_PIN) {
      set({ phase: 'unlocked', lastActivityAt: Date.now() });
      return true;
    }
    return false;
  },

  closeOverlay: () => set({ phase: 'locked', tapTimes: [] }),

  enterCleaning: () => set({ phase: 'cleaning', lastActivityAt: Date.now() }),
  exitCleaning: () => set({ phase: 'locked', tapTimes: [] }),

  bumpActivity: () =>
    set((s) => ({ lastActivityAt: Date.now(), activityNonce: s.activityNonce + 1 })),

  reset: () =>
    set({ phase: 'locked', tapTimes: [], lastActivityAt: Date.now() }),
}));

/**
 * Auto-close the staff overlay after STAFF_IDLE_MS without activity.
 * Mounted by `<StaffOverlay/>` while it's visible.
 */
export function useStaffOverlayAutoClose(): void {
  const phase = useStaffAccess((s) => s.phase);
  const lastActivityAt = useStaffAccess((s) => s.lastActivityAt);
  const closeOverlay = useStaffAccess((s) => s.closeOverlay);
  const closeRef = useRef(closeOverlay);
  useEffect(() => {
    closeRef.current = closeOverlay;
  }, [closeOverlay]);

  useEffect(() => {
    if (phase !== 'unlocked' && phase !== 'pin') return;
    const remaining = STAFF_IDLE_MS - (Date.now() - lastActivityAt);
    if (remaining <= 0) {
      closeRef.current();
      return;
    }
    const id = window.setTimeout(() => closeRef.current(), remaining);
    return () => window.clearTimeout(id);
  }, [phase, lastActivityAt]);
}

/**
 * Cleaning auto-unlock. Mounted by `<LockScreen/>` while cleaning is on.
 * After CLEANING_AUTO_UNLOCK_MS the kiosk releases itself; staff can also
 * unlock early by re-entering the PIN.
 */
export function useCleaningAutoUnlock(onUnlock: () => void): void {
  const phase = useStaffAccess((s) => s.phase);
  const lastActivityAt = useStaffAccess((s) => s.lastActivityAt);
  const onUnlockRef = useRef(onUnlock);
  useEffect(() => {
    onUnlockRef.current = onUnlock;
  }, [onUnlock]);

  useEffect(() => {
    if (phase !== 'cleaning') return;
    const fire = window.setTimeout(
      () => onUnlockRef.current(),
      CLEANING_AUTO_UNLOCK_MS,
    );
    return () => window.clearTimeout(fire);
  }, [phase, lastActivityAt]);
}
