'use client';

/**
 * Slim Coffee Pass banner for the home page. Renders only when the user
 * is subscribed AND has a credit available right now (eligible: true).
 * Otherwise hides entirely — silence is better than another widget
 * cluttering the home for non-subscribers.
 *
 * The banner is a one-line nudge ("Your free drink is ready") that links
 * to the menu. It's intentionally not a full pass card — that lives on
 * /rewards. This is just the "use it" reminder.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Coffee, ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';
import type { MySubscriptionResponse } from '@/lib/api';

export function CoffeePassBanner() {
  const [data, setData] = useState<MySubscriptionResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .mySubscription()
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch(() => {
        // Banner is non-critical — swallow errors silently.
      });
    return () => { cancelled = true; };
  }, []);

  const visible = data?.eligibility.eligible === true;

  return (
    <AnimatePresence>
      {visible && data && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="overflow-hidden"
        >
          <Link
            href="/"
            className="group flex items-center gap-3 rounded-2xl bg-gradient-to-r from-amber-100 via-orange-50 to-white px-4 py-3 ring-1 ring-cup-orange-200/60 transition hover:ring-cup-orange-300"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-cup-orange-600 text-white shadow-warm-glow">
              <Coffee className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="flex-1">
              <span className="block text-sm font-semibold text-cup-brown-900">
                {data.eligibility.creditsRemainingToday === 1
                  ? 'Your free drink is waiting today'
                  : `${data.eligibility.creditsRemainingToday} free drinks left today`}
              </span>
              <span className="text-[11px] text-cup-muted">
                Coffee Pass — automatically applied at checkout
              </span>
            </span>
            <ArrowRight className="h-4 w-4 text-cup-orange-700 transition group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
