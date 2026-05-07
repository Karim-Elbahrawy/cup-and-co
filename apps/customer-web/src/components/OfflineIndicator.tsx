'use client';

import { WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOnlineStatus } from '@/lib/useOnlineStatus';
import { useT } from '@/lib/i18n';

/**
 * Phase 8.1 — banner that surfaces when the browser reports offline.
 * The actual offline-survivability comes from the service worker
 * (`/public/sw.js`); this just tells the user what's happening so a
 * stale catalog doesn't feel like a bug.
 */
export function OfflineIndicator() {
  const isOnline = useOnlineStatus();
  const { language } = useT();

  const message = language === 'ar'
    ? 'أنت غير متصل بالإنترنت — القائمة من النسخة المحفوظة'
    : 'You’re offline — showing your cached menu';

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -40 }}
          className="fixed inset-x-0 top-0 z-[100] flex items-center justify-center gap-2 bg-[var(--cup-error)] px-4 py-2 text-sm font-semibold text-white shadow-lg"
          role="alert"
          aria-live="polite"
        >
          <WifiOff className="h-4 w-4" aria-hidden="true" />
          <span>{message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
