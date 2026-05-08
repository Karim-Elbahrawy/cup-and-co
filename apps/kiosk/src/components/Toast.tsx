'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Tiny single-shot toast used by the catalog grid (and later by cart-add
 * confirmations). One instance per page, auto-dismisses after 1.8s. Not a
 * queue — the kiosk doesn't have rapid-fire notifications, and stacking
 * them would interrupt the customer's flow.
 */

export interface ToastApi {
  show: (message: string) => void;
}

interface ToastHostProps {
  /** Receives a function the parent can call to trigger toasts. */
  bind: (api: ToastApi) => void;
}

export function ToastHost({ bind }: ToastHostProps) {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    bind({
      show: (m: string) => {
        setMessage(m);
        // Auto-dismiss; the AnimatePresence below handles the exit anim.
        const id = window.setTimeout(() => setMessage(null), 1800);
        return () => window.clearTimeout(id);
      },
    });
  }, [bind]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed left-1/2 top-10 z-50 -translate-x-1/2"
    >
      <AnimatePresence>
        {message ? (
          <motion.div
            key={message}
            initial={{ y: -16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -16, opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="rounded-pill bg-[var(--cup-espresso)] px-7 py-3.5 font-heading text-k-card font-semibold text-white shadow-elevated"
          >
            {message}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
