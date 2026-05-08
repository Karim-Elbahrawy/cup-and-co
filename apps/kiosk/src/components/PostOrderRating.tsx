'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThumbsUp, ThumbsDown, Check } from 'lucide-react';
import { api } from '@/lib/api';
import { useLang } from '@/lib/useLang';

/**
 * K7.3 — Post-order rating on /confirmation.
 *
 * Two big buttons after the pickup code. Tap either → submit, swap to
 * a small "Thanks!" pill. Skipping is fine — the customer can just
 * walk away or tap "Place another order" without rating. The auto-
 * reset still fires on the existing 8s timer.
 *
 * Only renders when the order has a real id (not a temp id from the
 * offline queue, since the server can't roll it up against an order
 * that hasn't synced yet).
 */

interface PostOrderRatingProps {
  orderId: string;
  /** True when the order is currently sitting in the offline queue. */
  queued?: boolean;
}

type Phase = 'asking' | 'submitting' | 'thanks';

export function PostOrderRating({ orderId, queued = false }: PostOrderRatingProps) {
  const lang = useLang((s) => s.lang);
  const [phase, setPhase] = useState<Phase>('asking');

  // The offline-queue case can't rate — the order id is local-only
  // until sync completes. Skip rendering rather than show buttons that
  // would 404 on the server.
  if (queued) return null;

  async function submit(rating: 'up' | 'down') {
    if (phase !== 'asking') return;
    setPhase('submitting');
    try {
      await api.rateKioskOrder(orderId, rating);
    } catch {
      // Swallow — the customer doesn't need to retry feedback. Keep the
      // 'thanks' state regardless so we don't break their confirmation
      // flow over a non-critical signal.
    }
    setPhase('thanks');
  }

  return (
    <div className="mt-10">
      <AnimatePresence mode="wait">
        {phase === 'thanks' ? (
          <motion.p
            key="thanks"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="inline-flex items-center gap-2 rounded-pill bg-cup-success/15 px-5 py-2.5 font-heading text-base font-semibold text-cup-success"
          >
            <Check className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
            {lang === 'ar' ? 'شكراً لتقييمك' : 'Thanks for the feedback'}
          </motion.p>
        ) : (
          <motion.div
            key="asking"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-[var(--cup-muted)]">
              {lang === 'ar' ? 'كيف كان طلبك؟' : 'How was your order?'}
            </p>
            <div className="mt-3 inline-flex gap-3">
              <RatingButton
                kind="up"
                label={lang === 'ar' ? 'حلو' : 'Good'}
                onClick={() => submit('up')}
                disabled={phase === 'submitting'}
              />
              <RatingButton
                kind="down"
                label={lang === 'ar' ? 'مش كويس' : 'Not great'}
                onClick={() => submit('down')}
                disabled={phase === 'submitting'}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function RatingButton({
  kind,
  label,
  onClick,
  disabled,
}: {
  kind: 'up' | 'down';
  label: string;
  onClick: () => void;
  disabled: boolean;
}) {
  const Icon = kind === 'up' ? ThumbsUp : ThumbsDown;
  const ringClass =
    kind === 'up'
      ? 'border-[var(--cup-success)]/40 hover:bg-[var(--cup-success)]/10 text-[var(--cup-success)]'
      : 'border-[var(--cup-cocoa)]/30 hover:bg-[var(--cup-cocoa)]/5 text-[var(--cup-cocoa)]';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={[
        'inline-flex h-16 min-w-[140px] items-center justify-center gap-3 rounded-pill border-2 bg-white font-heading text-base font-bold transition',
        'active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none',
        ringClass,
      ].join(' ')}
    >
      <Icon className="h-6 w-6" strokeWidth={2} aria-hidden="true" />
      {label}
    </button>
  );
}
