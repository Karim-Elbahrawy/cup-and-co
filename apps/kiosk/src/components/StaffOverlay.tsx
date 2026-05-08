'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCw, Sparkles, X } from 'lucide-react';
import {
  useStaffAccess,
  useStaffOverlayAutoClose,
} from '@/lib/useStaffAccess';
import { useCart } from '@/lib/cart';
import { useCartDrawer } from '@/lib/useCartDrawer';
import { useLang } from '@/lib/useLang';
import { useIdentified } from '@/lib/useIdentified';
import { useLastOrder } from '@/lib/useLastOrder';

/**
 * K5.3 Staff overlay — slide-up sheet that lets a barista do the
 * common operational gestures without leaving the kiosk:
 *
 *   - Reset device       drops cart + lang + identity, returns to /
 *   - Lock for cleaning  enters the 5-min "Be right back" lockdown
 *
 * "Mark item out of stock" + "Today's stats" are a separate PR (they
 * need admin auth threading + new API surface). Keeping this slice
 * tight means baristas can use the two highest-leverage gestures
 * today, without waiting for the multi-kiosk admin work.
 *
 * 30s auto-close per spec — `useStaffOverlayAutoClose` watches
 * lastActivityAt and bumps when the staff hits a button.
 */
export function StaffOverlay() {
  const phase = useStaffAccess((s) => s.phase);
  const closeOverlay = useStaffAccess((s) => s.closeOverlay);
  const enterCleaning = useStaffAccess((s) => s.enterCleaning);
  const bumpActivity = useStaffAccess((s) => s.bumpActivity);
  const router = useRouter();
  const lang = useLang((s) => s.lang);

  // 30s auto-close while unlocked.
  useStaffOverlayAutoClose();

  function handleResetDevice() {
    bumpActivity();
    useCart.getState().clear();
    useCartDrawer.getState().hide();
    useIdentified.getState().clear();
    useLastOrder.getState().clear();
    useLang.getState().reset();
    closeOverlay();
    router.replace('/');
  }

  function handleLockCleaning() {
    bumpActivity();
    // Drop any in-progress customer state before locking — staff using
    // 'cleaning' implies the kiosk is unattended for 5 minutes; we don't
    // want a stale cart visible when the next customer walks up post-lock.
    useCart.getState().clear();
    useCartDrawer.getState().hide();
    useIdentified.getState().clear();
    enterCleaning();
  }

  // Bump activity on any pointer movement inside the overlay so the
  // 30s auto-close doesn't fire while staff are scanning options.
  useEffect(() => {
    if (phase !== 'unlocked') return;
    const onMove = () => bumpActivity();
    window.addEventListener('pointerdown', onMove, { passive: true });
    return () => window.removeEventListener('pointerdown', onMove);
  }, [phase, bumpActivity]);

  return (
    <AnimatePresence>
      {phase === 'unlocked' ? (
        <motion.div
          key="staff-overlay-bg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[70] bg-[var(--cup-espresso)]/55"
          onClick={closeOverlay}
          aria-hidden="true"
        >
          <motion.section
            key="staff-overlay-sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 280 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={lang === 'ar' ? 'وضع الموظفين' : 'Staff assist'}
            className="absolute inset-x-0 bottom-0 z-[71] mx-auto w-full max-w-[1100px] rounded-t-[40px] bg-white p-10 shadow-elevated"
          >
            <header className="mb-7 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.28em] text-[var(--cup-muted)]">
                  Staff
                </p>
                <h2 className="mt-0.5 font-heading text-[36px] font-extrabold leading-tight text-[var(--cup-espresso)]">
                  Quick actions
                </h2>
                <p className="mt-1 text-sm font-semibold text-[var(--cup-muted)]">
                  Auto-closes after 30 seconds.
                </p>
              </div>
              <button
                type="button"
                onClick={closeOverlay}
                aria-label="Close staff overlay"
                className="grid h-14 w-14 place-items-center rounded-full bg-[var(--cup-paper)] text-[var(--cup-espresso)] transition active:scale-[0.94]"
              >
                <X className="h-7 w-7" strokeWidth={2.25} />
              </button>
            </header>

            <div className="grid gap-4 sm:grid-cols-2">
              <ActionTile
                icon={<RotateCw className="h-7 w-7" strokeWidth={2} />}
                title="Reset device"
                description="Drop the cart, sign out, return to the start screen."
                onClick={handleResetDevice}
                tone="neutral"
              />
              <ActionTile
                icon={<Sparkles className="h-7 w-7" strokeWidth={2} />}
                title="Lock for cleaning"
                description="Show a 'Be right back' splash for 5 minutes. PIN to unlock early."
                onClick={handleLockCleaning}
                tone="warning"
              />
            </div>

            {/* Surface stats + 'Mark out-of-stock' would land here next.
                Empty-state for now keeps the overlay short, predictable,
                and 30-second-friendly. */}
          </motion.section>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function ActionTile({
  icon,
  title,
  description,
  onClick,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  tone: 'neutral' | 'warning';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'group flex min-h-[140px] flex-col items-start gap-3 rounded-card p-6 text-left shadow-card transition',
        'active:scale-[0.99]',
        tone === 'warning'
          ? 'bg-[var(--cup-warning)]/10 border-2 border-[var(--cup-warning)]/30 hover:bg-[var(--cup-warning)]/15'
          : 'bg-white border border-[var(--cup-stroke)] hover:bg-[var(--cup-paper)]',
      ].join(' ')}
    >
      <span
        className={[
          'grid h-12 w-12 place-items-center rounded-2xl',
          tone === 'warning'
            ? 'bg-[var(--cup-warning)] text-white'
            : 'bg-[var(--cup-espresso)] text-white',
        ].join(' ')}
        aria-hidden="true"
      >
        {icon}
      </span>
      <span className="font-heading text-[22px] font-extrabold text-[var(--cup-espresso)]">
        {title}
      </span>
      <span className="font-body text-base font-medium text-[var(--cup-cocoa)]">
        {description}
      </span>
    </button>
  );
}
