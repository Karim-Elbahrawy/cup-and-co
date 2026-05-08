'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, X } from 'lucide-react';
import { BigButton } from './BigButton';
import { useStaffAccess } from '@/lib/useStaffAccess';

/**
 * K5.3 — Staff PIN entry.
 *
 * Renders when `phase === 'pin'`. Same numeric-keypad pattern as the K4.4
 * customer identify modal but visually colder (espresso-on-white instead
 * of terracotta-on-cream) so staff know they're in a different surface.
 *
 * On verify success the store flips to 'unlocked' and the StaffOverlay
 * takes over. On failure we shake the dot row and reset the input
 * — three failures in a row could lock for 60s in a future hardening
 * pass; for now we just keep accepting attempts. The kiosk is
 * physically supervised.
 */
export function StaffPinModal() {
  const phase = useStaffAccess((s) => s.phase);
  const cancel = useStaffAccess((s) => s.cancelPin);
  const verify = useStaffAccess((s) => s.verifyPin);
  const [digits, setDigits] = useState('');
  const [error, setError] = useState(false);

  // Reset on open/close.
  useEffect(() => {
    if (phase !== 'pin') {
      setDigits('');
      setError(false);
    }
  }, [phase]);

  function press(d: string) {
    setError(false);
    setDigits((cur) => (cur.length < 4 ? cur + d : cur));
  }

  function backspace() {
    setError(false);
    setDigits((cur) => cur.slice(0, -1));
  }

  // Submit automatically when the 4th digit lands. Staff don't want to
  // hunt for a "submit" button after 4 taps.
  useEffect(() => {
    if (phase !== 'pin' || digits.length !== 4) return;
    const ok = verify(digits);
    if (!ok) {
      setError(true);
      setDigits('');
    }
  }, [digits, phase, verify]);

  return (
    <AnimatePresence>
      {phase === 'pin' ? (
        <motion.div
          key="staff-pin-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="staff-pin-title"
          className="fixed inset-0 z-[70] grid place-items-center bg-[var(--cup-espresso)]/70"
          onClick={cancel}
        >
          <motion.div
            initial={{ scale: 0.94, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ type: 'spring', damping: 22, stiffness: 240 }}
            onClick={(e) => e.stopPropagation()}
            className="relative mx-auto w-full max-w-md rounded-card bg-white p-9 shadow-elevated"
          >
            <button
              type="button"
              onClick={cancel}
              aria-label="Cancel staff access"
              className="absolute end-5 top-5 grid h-12 w-12 place-items-center rounded-full bg-[var(--cup-paper)] text-[var(--cup-espresso)] transition active:scale-[0.94]"
            >
              <X className="h-6 w-6" strokeWidth={2.25} />
            </button>

            <span className="grid h-12 w-12 place-items-center rounded-full bg-[var(--cup-espresso)] text-white">
              <Lock className="h-6 w-6" strokeWidth={2} />
            </span>
            <h2
              id="staff-pin-title"
              className="mt-5 font-heading text-[36px] font-extrabold leading-tight text-[var(--cup-espresso)]"
            >
              Staff access
            </h2>
            <p className="mt-1 font-body text-base text-[var(--cup-cocoa)]">
              Enter the 4-digit PIN.
            </p>

            <DotRow digits={digits} error={error} />

            <Keypad onPress={press} onBackspace={backspace} className="mt-6" />

            {error ? (
              <p
                role="alert"
                className="mt-4 rounded-pill bg-[var(--cup-error)]/10 px-4 py-2 text-center text-sm font-bold text-[var(--cup-error)]"
              >
                Incorrect PIN.
              </p>
            ) : null}

            <BigButton variant="ghost" onClick={cancel} className="mt-5 w-full">
              Cancel
            </BigButton>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function DotRow({ digits, error }: { digits: string; error: boolean }) {
  return (
    <motion.div
      key={error ? 'err' : 'ok'}
      animate={error ? { x: [-6, 6, -4, 4, 0] } : { x: 0 }}
      transition={{ duration: 0.3 }}
      className="mt-6 flex items-center justify-center gap-3"
    >
      {Array.from({ length: 4 }).map((_, i) => {
        const filled = i < digits.length;
        return (
          <span
            key={i}
            className={[
              'grid h-14 w-14 place-items-center rounded-2xl border-2 font-heading text-[28px] font-extrabold tabular-nums',
              filled
                ? 'border-[var(--cup-espresso)] bg-white text-[var(--cup-espresso)]'
                : 'border-[var(--cup-stroke)] bg-[var(--cup-paper)] text-[var(--cup-muted)]',
            ].join(' ')}
          >
            {filled ? '•' : ''}
          </span>
        );
      })}
    </motion.div>
  );
}

function Keypad({
  onPress,
  onBackspace,
  className,
}: {
  onPress: (d: string) => void;
  onBackspace: () => void;
  className?: string;
}) {
  const rows: (string | 'back' | '')[][] = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['', '0', 'back'],
  ];
  return (
    <div className={['grid grid-cols-3 gap-2.5', className ?? ''].join(' ')}>
      {rows.flat().map((cell, i) =>
        cell === '' ? (
          <span key={`empty-${i}`} aria-hidden="true" />
        ) : cell === 'back' ? (
          <button
            key="back"
            type="button"
            onClick={onBackspace}
            aria-label="Backspace"
            className="grid h-14 place-items-center rounded-2xl bg-[var(--cup-paper)] font-heading text-[24px] font-bold text-[var(--cup-cocoa)] transition active:scale-[0.96]"
          >
            ⌫
          </button>
        ) : (
          <button
            key={cell}
            type="button"
            onClick={() => onPress(cell)}
            className="grid h-14 place-items-center rounded-2xl bg-white font-heading text-[24px] font-bold text-[var(--cup-espresso)] shadow-subtle transition active:scale-[0.96]"
          >
            {cell}
          </button>
        ),
      )}
    </div>
  );
}
