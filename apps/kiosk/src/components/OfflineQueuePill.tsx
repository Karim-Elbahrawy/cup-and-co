'use client';

import { CloudOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOfflineQueue } from '@/lib/useOfflineQueue';
import { useLang } from '@/lib/useLang';

/**
 * K5.1 — small pill that surfaces how many orders are waiting to sync
 * to the server. Hidden when the queue is empty (most of the time).
 *
 * Renders top-right (the LanguageToggle is also there but on each
 * surface, while this pill is global from AppShell). They don't clash
 * because the toggle hugs the right edge inside the page header chrome
 * and this pill floats slightly inside-and-below at z-index 25 — close
 * enough to read together, far enough to not overlap.
 */
export function OfflineQueuePill() {
  const lang = useLang((s) => s.lang);
  const count = useOfflineQueue((s) => s.count);
  const isFlushing = useOfflineQueue((s) => s.isFlushing);

  return (
    <div
      className="pointer-events-none fixed left-6 top-16 z-30 select-none"
      aria-live="polite"
    >
      <AnimatePresence>
        {count > 0 ? (
          <motion.span
            key="queue-pill"
            initial={{ opacity: 0, y: -6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.95 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="inline-flex items-center gap-2 rounded-pill bg-[var(--cup-warning)]/15 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[var(--cup-warning)] shadow-subtle"
            role="status"
          >
            <CloudOff className="h-3.5 w-3.5" aria-hidden="true" />
            {isFlushing
              ? lang === 'ar'
                ? `بنزامن… ${count}`
                : `Syncing… ${count}`
              : lang === 'ar'
                ? `${count} في الانتظار`
                : `${count} queued`}
          </motion.span>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
