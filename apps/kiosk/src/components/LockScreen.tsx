'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import {
  useStaffAccess,
  useCleaningAutoUnlock,
  CLEANING_AUTO_UNLOCK_MS,
} from '@/lib/useStaffAccess';

/**
 * K5.3 — "Lock for cleaning" splash.
 *
 * Fullscreen z-[90] (above even the unavailable banner — staff want this
 * to dominate everything when they're wiping down the iPad). Renders
 * "Be right back" with a 5-minute countdown ring.
 *
 * Staff can unlock early by tapping the splash → PIN modal slides in via
 * the existing StaffPinModal. Auto-unlock fires after CLEANING_AUTO_UNLOCK_MS.
 *
 * No customer-facing copy. The kiosk is unmistakably "in maintenance" so
 * customers walk to the counter without confusion.
 */
export function LockScreen() {
  const phase = useStaffAccess((s) => s.phase);
  const exitCleaning = useStaffAccess((s) => s.exitCleaning);
  const openPin = useStaffAccess((s) => s.openPin);
  const [, force] = useState(0);
  const startedAt = useRef<number>(Date.now());

  // Reset the start clock whenever cleaning begins.
  useEffect(() => {
    if (phase === 'cleaning') startedAt.current = Date.now();
  }, [phase]);

  // Re-render every second so the countdown clock + ring update.
  useEffect(() => {
    if (phase !== 'cleaning') return;
    const id = window.setInterval(() => force((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  // 5-minute hard auto-unlock.
  useCleaningAutoUnlock(exitCleaning);

  if (phase !== 'cleaning') return null;

  const elapsed = Date.now() - startedAt.current;
  const fractionLeft = Math.max(0, 1 - elapsed / CLEANING_AUTO_UNLOCK_MS);
  const minutesLeft = Math.max(
    0,
    Math.ceil((CLEANING_AUTO_UNLOCK_MS - elapsed) / 60_000),
  );

  return (
    <AnimatePresence>
      <motion.div
        key="lock-screen"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        // Tap anywhere on the splash → PIN modal so staff can unlock
        // early. We don't auto-respond to a single tap because a
        // customer wandering past + brushing the iPad would otherwise
        // unlock prematurely. Requiring the PIN keeps the lock real.
        onClick={openPin}
        className="fixed inset-0 z-[90] grid h-dvh w-dvw cursor-pointer place-items-center cup-sunrise text-white"
        role="dialog"
        aria-modal="true"
        aria-label="Kiosk locked for cleaning"
      >
        <div className="relative z-10 mx-auto max-w-2xl px-12 text-center">
          <span
            className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-white/15 backdrop-blur-sm"
            aria-hidden="true"
          >
            <Sparkles className="h-10 w-10" strokeWidth={2} />
          </span>

          <h1 className="mt-8 font-heading text-k-display leading-[0.95]">
            Be right back.
          </h1>
          <p className="mt-5 font-body text-k-hero font-medium text-white/95">
            Cleaning the kiosk.
          </p>

          {/* Countdown ring — drains over CLEANING_AUTO_UNLOCK_MS. */}
          <div className="mt-12 inline-flex items-center justify-center">
            <Ring fraction={fractionLeft} minutesLeft={minutesLeft} />
          </div>

          <p className="mt-10 text-xs font-bold uppercase tracking-[0.4em] text-white/75">
            Tap to unlock with PIN
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function Ring({
  fraction,
  minutesLeft,
}: {
  fraction: number;
  minutesLeft: number;
}) {
  const r = 80;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative inline-grid h-[200px] w-[200px] place-items-center">
      <svg
        aria-hidden="true"
        width={2 * r + 24}
        height={2 * r + 24}
        viewBox={`0 0 ${2 * r + 24} ${2 * r + 24}`}
        className="absolute"
      >
        <circle
          cx={r + 12}
          cy={r + 12}
          r={r}
          stroke="rgba(255,255,255,0.25)"
          strokeWidth="6"
          fill="none"
        />
        <circle
          cx={r + 12}
          cy={r + 12}
          r={r}
          stroke="white"
          strokeWidth="6"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - fraction)}
          strokeLinecap="round"
          transform={`rotate(-90 ${r + 12} ${r + 12})`}
        />
      </svg>
      <div className="relative z-10 text-center">
        <p className="font-heading text-[64px] font-extrabold leading-none tabular-nums">
          {minutesLeft}
        </p>
        <p className="mt-1 text-sm font-bold uppercase tracking-widest text-white/85">
          {minutesLeft === 1 ? 'min left' : 'mins left'}
        </p>
      </div>
    </div>
  );
}
