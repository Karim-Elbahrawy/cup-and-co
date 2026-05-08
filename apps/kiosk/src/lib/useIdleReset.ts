'use client';

import { useEffect, useRef } from 'react';

/**
 * useIdleReset — two-phase idle timer.
 *
 * Phase 1: after `warnMs` of zero input, `onWarn` fires. The K1.9 modal
 * uses this to render a "still there?" overlay with its own visible
 * countdown.
 * Phase 2: after `timeoutMs` of zero input (warnMs + grace window),
 * `onIdle` fires. The kiosk uses this to clear cart + navigate to attract.
 *
 * Single timer cleared/reset on every touch / pointer / keyboard / scroll.
 * `enabled=false` bypasses everything — used while the attract screen
 * itself is showing.
 *
 * If `onWarn` is omitted, the hook degrades to the K1.1 single-phase
 * behaviour: just `onIdle` at `timeoutMs`. Existing call sites keep
 * working unchanged.
 */
export function useIdleReset({
  onIdle,
  onWarn,
  timeoutMs = 90_000,
  warnMs,
  enabled = true,
}: {
  onIdle: () => void;
  onWarn?: () => void;
  timeoutMs?: number;
  /** Defaults to 75% of timeoutMs when onWarn is provided. */
  warnMs?: number;
  enabled?: boolean;
}): void {
  // Callbacks held in refs so listeners attach once and don't rebind on
  // every consumer re-render (onIdle / onWarn typically close over
  // router / store state).
  const onIdleRef = useRef(onIdle);
  const onWarnRef = useRef(onWarn);
  useEffect(() => {
    onIdleRef.current = onIdle;
  }, [onIdle]);
  useEffect(() => {
    onWarnRef.current = onWarn;
  }, [onWarn]);

  useEffect(() => {
    if (!enabled) return;

    // Resolve the warn delay only when a warn callback was actually
    // provided. `undefined` means single-phase mode (skip the warn timer).
    const effectiveWarn: number | undefined = onWarnRef.current
      ? (warnMs ?? Math.floor(timeoutMs * 0.75))
      : undefined;

    let warnTimer: number | null = null;
    let idleTimer: number | null = null;
    const reset = () => {
      if (warnTimer !== null) window.clearTimeout(warnTimer);
      if (idleTimer !== null) window.clearTimeout(idleTimer);
      if (effectiveWarn !== undefined) {
        warnTimer = window.setTimeout(() => onWarnRef.current?.(), effectiveWarn);
      }
      idleTimer = window.setTimeout(() => onIdleRef.current(), timeoutMs);
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
      if (warnTimer !== null) window.clearTimeout(warnTimer);
      if (idleTimer !== null) window.clearTimeout(idleTimer);
      for (const ev of events) {
        window.removeEventListener(ev, reset);
      }
    };
  }, [enabled, timeoutMs, warnMs]);
}
