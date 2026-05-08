'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { CloudOff, ArrowRight } from 'lucide-react';
import { useApiHealth } from '@/lib/useApiHealth';
import { useLang } from '@/lib/useLang';

/**
 * K5.2 — Kiosk-temporarily-unavailable banner.
 *
 * Renders a fullscreen overlay when the API has been unreachable for 3
 * consecutive health pings (~90s of sustained outage). Tells the customer
 * to skip the iPad and order at the counter; auto-dismisses the moment
 * the next ping succeeds.
 *
 * Why a fullscreen overlay rather than a top banner: a small banner
 * suggests "still try, just slow." This is "stop, this surface is broken,
 * walk to the cashier." The banner needs to look unmistakable from
 * 3 metres away, since a customer might already be queued behind the
 * iPad in line.
 *
 * No dismiss button. The banner clears itself the moment the next health
 * ping succeeds. Letting the customer dismiss it would leak them onto
 * a half-broken kiosk where their order will queue forever (the offline
 * queue from K5.1 will keep retrying, but if the issue is a sustained
 * server outage that's just dust on the table).
 *
 * Layered above EVERYTHING (z-[80]) — above NetStatusPill, the cart
 * drawer, the still-there modal, even the offline-queue pill.
 */

export function KioskUnavailableBanner() {
  const lang = useLang((s) => s.lang);
  const unavailable = useApiHealth((s) => s.unavailable);

  return (
    <AnimatePresence>
      {unavailable ? (
        <motion.div
          key="kiosk-unavailable"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="unavail-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[80] grid place-items-center bg-[var(--cup-espresso)]/85 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.94, y: 8, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ type: 'spring', damping: 22, stiffness: 240 }}
            className="relative mx-auto w-full max-w-[760px] rounded-card bg-white p-12 text-center shadow-elevated"
          >
            {/* Amber halo behind the icon — communicates "warning, not
                broken" without feeling alarming. */}
            <div
              aria-hidden="true"
              className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-[var(--cup-warning)]/15"
            >
              <span className="grid h-16 w-16 place-items-center rounded-full bg-[var(--cup-warning)] text-white shadow-card">
                <CloudOff className="h-9 w-9" strokeWidth={2.25} />
              </span>
            </div>

            <h2
              id="unavail-title"
              className="mt-7 font-heading text-k-hero leading-tight text-[var(--cup-espresso)]"
            >
              {lang === 'ar'
                ? 'الكيوسك مش متاح دلوقتي'
                : 'Kiosk temporarily unavailable'}
            </h2>

            <p className="mx-auto mt-3 max-w-xl font-body text-k-body text-[var(--cup-cocoa)]">
              {lang === 'ar'
                ? 'اطلب من الكاشير، آسفين على التأخير. هنرجع نشتغل في ثواني.'
                : "Please order at the counter. We'll be back in a moment."}
            </p>

            {/* Counter direction cue — big arrow + simple instruction.
                The arrow flips for RTL via rtl:rotate-180. */}
            <div className="mt-8 inline-flex items-center gap-3 rounded-pill bg-[var(--cup-paper)] px-7 py-4 font-heading text-k-card font-semibold text-[var(--cup-espresso)]">
              <span>
                {lang === 'ar' ? 'روح للكاشير' : 'Head to the counter'}
              </span>
              <ArrowRight
                className="h-6 w-6 text-[var(--cup-primary)] rtl:rotate-180"
                aria-hidden="true"
              />
            </div>

            {/* Subtle reassurance — the banner clears itself, customer
                doesn't need to do anything to bring it back to life. */}
            <p className="mt-7 text-xs font-semibold uppercase tracking-[0.28em] text-[var(--cup-muted)]">
              {lang === 'ar' ? 'بنحاول نوصل تاني' : 'Reconnecting'}
              <DotsAnimation />
            </p>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

/** Three dots that fade in sequence; subtle "we're trying" cue. */
function DotsAnimation() {
  return (
    <span aria-hidden="true" className="ms-2 inline-flex gap-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="block h-1.5 w-1.5 rounded-full bg-[var(--cup-muted)]"
          initial={{ opacity: 0.3 }}
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{
            duration: 1.4,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 0.18,
          }}
        />
      ))}
    </span>
  );
}
