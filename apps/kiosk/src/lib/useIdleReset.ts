'use client';

import { useEffect, useRef } from 'react';

/**
 * useIdleReset — fires `onIdle` after `timeoutMs` of zero touch / pointer /
 * keyboard / scroll input anywhere in the page.
 *
 * Used by the kiosk to fall back to the attract loop after 90s of
 * inactivity per docs/KIOSK-PLAN.md K1.1 / K1.9. K1.9 layers a "still there?"
 * confirmation overlay on top of this hook; for the attract→catalog
 * transition in K1.1 we simply navigate straight back to `/`.
 *
 * Implementation notes:
 *   - Listeners attached to `window` so the timer resets regardless of
 *     which subtree is focused.
 *   - `pointerdown` covers tap + click + stylus on iPad; we don't need
 *     `touchstart` separately and stacking both would double-reset the
 *     timer on every tap (harmless but wasteful).
 *   - `enabled=false` bypasses everything — used to disable the timer
 *     while the attract screen itself is showing.
 */
export function useIdleReset({
  onIdle,
  timeoutMs = 90_000,
  enabled = true,
}: {
  onIdle: () => void;
  timeoutMs?: number;
  enabled?: boolean;
}): void {
  // The idle callback is held in a ref so we can attach listeners once
  // and not reattach when the consumer rebinds onIdle (which is common
  // when onIdle closes over router or store state).
  const onIdleRef = useRef(onIdle);
  useEffect(() => {
    onIdleRef.current = onIdle;
  }, [onIdle]);

  useEffect(() => {
    if (!enabled) return;

    let timer: number | null = null;
    const reset = () => {
      if (timer !== null) window.clearTimeout(timer);
      timer = window.setTimeout(() => onIdleRef.current(), timeoutMs);
    };

    const events: Array<keyof WindowEventMap> = [
      'pointerdown',
      'keydown',
      'scroll',
      'touchstart',
      'touchmove',
    ];

    for (const ev of events) {
      window.addEventListener(ev, reset, { passive: true });
    }
    reset();

    return () => {
      if (timer !== null) window.clearTimeout(timer);
      for (const ev of events) {
        window.removeEventListener(ev, reset);
      }
    };
  }, [enabled, timeoutMs]);
}
