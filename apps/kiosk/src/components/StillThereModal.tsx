'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BigButton } from './BigButton';
import { useLang } from '@/lib/useLang';

/**
 * "Still there?" overlay (K1.9).
 *
 * Driven externally — the parent calls `onWarn()` on the idle hook, then
 * sets `open=true` here. While open, the modal runs its own countdown
 * (default 12s); on timeout it calls `onTimeout`. "I need more time"
 * dismisses the modal AND fires `onAck` so the parent can rearm the
 * idle timer.
 *
 * The countdown is visible — a draining radial ring around the count
 * makes the urgency obvious without being aggressive. Reduced motion
 * keeps the number ticking but skips the ring animation per the
 * global CSS rule.
 */

interface StillThereModalProps {
  open: boolean;
  countdownMs?: number;
  onAck: () => void;
  onTimeout: () => void;
  /** Called when the user explicitly chooses to start over. */
  onCancel?: () => void;
}

export function StillThereModal({
  open,
  countdownMs = 12_000,
  onAck,
  onTimeout,
  onCancel,
}: StillThereModalProps) {
  const lang = useLang((s) => s.lang);
  const [, force] = useState(0);
  const startedAt = useRef<number>(Date.now());

  // Reset the start clock whenever the modal opens.
  useEffect(() => {
    if (open) startedAt.current = Date.now();
  }, [open]);

  // Countdown driver — re-render every 100ms while open.
  useEffect(() => {
    if (!open) return;
    const tick = window.setInterval(() => force((n) => n + 1), 100);
    const fire = window.setTimeout(() => onTimeout(), countdownMs);
    return () => {
      window.clearInterval(tick);
      window.clearTimeout(fire);
    };
    // onTimeout is a stable ref-style callback; deliberately omitted from
    // deps so we don't reset the timer on every parent render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, countdownMs]);

  const elapsed = Date.now() - startedAt.current;
  const fractionLeft = Math.max(0, 1 - elapsed / countdownMs);
  const secondsLeft = Math.max(0, Math.ceil((countdownMs - elapsed) / 1000));

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="still-there-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          // Accessibility: role=dialog gives VoiceOver the right semantics;
          // aria-modal hints to assistive tech that the rest of the page
          // is currently inert. We don't focus-trap because the kiosk
          // ships keyboardless — when a Bluetooth keyboard is connected
          // for diagnostics, default Tab order is fine.
          role="dialog"
          aria-modal="true"
          aria-labelledby="still-there-title"
          className="fixed inset-0 z-[60] grid place-items-center bg-[var(--cup-espresso)]/55"
        >
          <motion.div
            key="still-there-card"
            initial={{ scale: 0.94, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ type: 'spring', damping: 22, stiffness: 240 }}
            className="relative mx-auto max-w-xl rounded-card bg-white p-10 text-center shadow-elevated"
          >
            <Ring fraction={fractionLeft} secondsLeft={secondsLeft} />

            <h2
              id="still-there-title"
              className="mt-8 font-heading text-k-hero leading-tight text-[var(--cup-espresso)]"
            >
              {lang === 'ar' ? 'لسه هنا؟' : 'Still there?'}
            </h2>
            <p className="mt-3 font-body text-k-body text-[var(--cup-cocoa)]">
              {lang === 'ar'
                ? 'مفيش تفاعل، هنرجع للبداية تلقائياً'
                : "We'll return to the start screen if there's no response."}
            </p>

            <div className="mt-8 flex flex-col gap-3">
              <BigButton size="xl" onClick={onAck} className="w-full">
                {lang === 'ar' ? 'محتاج وقت أكتر' : 'I need more time'}
              </BigButton>
              <BigButton
                variant="secondary"
                onClick={onCancel ?? onTimeout}
                className="w-full"
              >
                {lang === 'ar' ? 'ابدأ من جديد' : 'Start over'}
              </BigButton>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function Ring({
  fraction,
  secondsLeft,
}: {
  fraction: number;
  secondsLeft: number;
}) {
  const r = 56;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative mx-auto inline-grid h-[136px] w-[136px] place-items-center">
      <svg
        aria-hidden="true"
        width={2 * r + 16}
        height={2 * r + 16}
        viewBox={`0 0 ${2 * r + 16} ${2 * r + 16}`}
        className="absolute"
      >
        <circle
          cx={r + 8}
          cy={r + 8}
          r={r}
          stroke="var(--cup-stroke)"
          strokeWidth="6"
          fill="none"
        />
        <circle
          cx={r + 8}
          cy={r + 8}
          r={r}
          stroke="var(--cup-primary)"
          strokeWidth="6"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - fraction)}
          strokeLinecap="round"
          transform={`rotate(-90 ${r + 8} ${r + 8})`}
        />
      </svg>
      <span
        className="font-heading text-[44px] font-extrabold tabular-nums text-[var(--cup-primary)]"
        aria-live="polite"
      >
        {secondsLeft}
      </span>
    </div>
  );
}
