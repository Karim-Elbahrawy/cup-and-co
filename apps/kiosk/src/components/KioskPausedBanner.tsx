'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { PauseCircle, ArrowRight } from 'lucide-react';
import { useKioskActive } from '@/lib/useKioskActive';
import { useLang } from '@/lib/useLang';

/**
 * Admin-paused fullscreen overlay.
 *
 * The owner can flip a kiosk's `active` flag from /admin/kiosks. The
 * heartbeat hook reads that flag back on every poll and stamps it into
 * `useKioskActive`. When `active === false` we fade in this overlay
 * over everything: the customer sees a calm "kiosk paused" message and
 * is directed to the counter. Clears the moment the admin flips
 * back to active.
 *
 * This is a SOFT pause — distinct from K5.2's API-down banner:
 *   - K5.2 (UnavailableBanner) — server unreachable, technical outage,
 *     amber/warning tone, "we'll be back".
 *   - This component — admin-controlled pause (cleaning, end of shift,
 *     temporarily out of supplies), softer cocoa tone, "ordering
 *     paused right now".
 *
 * Layered above the cart drawer + still-there modal but BELOW the
 * cleaning lockscreen (z-90) so a barista cleaning the iPad is still
 * the dominant intent.
 */

export function KioskPausedBanner() {
  const lang = useLang((s) => s.lang);
  const active = useKioskActive((s) => s.active);

  return (
    <AnimatePresence>
      {!active ? (
        <motion.div
          key="kiosk-paused"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="kiosk-paused-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[75] grid place-items-center bg-[var(--cup-espresso)]/85 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.94, y: 8, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ type: 'spring', damping: 22, stiffness: 240 }}
            className="relative mx-auto w-full max-w-[760px] overflow-hidden rounded-card bg-white p-12 text-center shadow-elevated"
          >
            {/* Cocoa-tinted halo behind the icon — communicates "it's
                fine, just paused", not "something is broken". */}
            <div
              aria-hidden="true"
              className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-[var(--cup-cocoa)]/12"
            >
              <span className="grid h-16 w-16 place-items-center rounded-full bg-[var(--cup-cocoa)] text-white shadow-card">
                <PauseCircle className="h-9 w-9" strokeWidth={2.25} />
              </span>
            </div>

            <h2
              id="kiosk-paused-title"
              className="mt-7 font-heading text-k-hero leading-tight text-[var(--cup-espresso)]"
            >
              {lang === 'ar' ? 'الكيوسك متوقف' : 'Ordering paused'}
            </h2>

            <p className="mx-auto mt-3 max-w-xl font-body text-k-body text-[var(--cup-cocoa)]">
              {lang === 'ar'
                ? 'الكيوسك متوقف مؤقتاً. اطلب من الكاشير، وهنرجع نشتغل قريب.'
                : "We've paused this kiosk for a moment. Please order at the counter and we'll be back soon."}
            </p>

            <div className="mt-8 inline-flex items-center gap-3 rounded-pill bg-[var(--cup-paper)] px-7 py-4 font-heading text-k-card font-semibold text-[var(--cup-espresso)]">
              <span>
                {lang === 'ar' ? 'روح للكاشير' : 'Order at the counter'}
              </span>
              <ArrowRight
                className="h-6 w-6 text-[var(--cup-primary)] rtl:rotate-180"
                aria-hidden="true"
              />
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
