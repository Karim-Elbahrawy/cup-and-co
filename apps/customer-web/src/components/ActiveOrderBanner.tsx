'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Coffee } from 'lucide-react';
import { api } from '@/lib/api';
import { useSession } from '@/lib/session';
import type { ApiOrder } from '@/lib/types';

const TERMINAL = new Set(['completed', 'cancelled', 'refunded']);
const POLL_MS = 6000;

const STATUS_LABEL: Record<string, { en: string; ar: string }> = {
  received:         { en: 'Order received',     ar: 'تم استلام الطلب'  },
  accepted:         { en: 'Order accepted',     ar: 'تم قبول الطلب'    },
  preparing:        { en: 'Preparing your order', ar: 'جاري التحضير'   },
  ready:            { en: 'Ready for pickup!',  ar: 'جاهز للاستلام!'   },
  out_for_delivery: { en: 'On its way!',        ar: 'في الطريق!'       },
};

export function ActiveOrderBanner() {
  const token    = useSession((s) => s.token);
  const language = useSession((s) => s.language);
  const pathname = usePathname() ?? '';

  const [order, setOrder]       = useState<ApiOrder | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const lastId = useRef<string | null>(null);

  const poll = useCallback(async () => {
    if (!token) return;
    try {
      const { orders } = await api.listOrders();
      const active = orders.find((o) => !TERMINAL.has(o.status)) ?? null;
      // New order surfaced — reset dismiss so user sees it
      if (active?.id !== lastId.current) {
        lastId.current = active?.id ?? null;
        setDismissed(false);
      }
      setOrder(active);
    } catch {
      // Banner is non-critical; swallow errors silently
    }
  }, [token]);

  // Fetch on mount
  useEffect(() => { poll(); }, [poll]);

  // Keep polling while an active order is visible
  useEffect(() => {
    if (!order || dismissed) return;
    const id = setInterval(poll, POLL_MS);
    return () => clearInterval(id);
  }, [order, dismissed, poll]);

  // Hide on order-detail and history pages (redundant there)
  const suppress = pathname.startsWith('/orders');
  const visible  = !!order && !dismissed && !suppress;

  const label = order
    ? (STATUS_LABEL[order.status]?.[language] ?? order.status)
    : '';
  const isRtl = language === 'ar';

  return (
    <AnimatePresence>
      {visible && order && (
        <motion.div
          key={order.id}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="overflow-hidden"
        >
          <div className="relative flex items-stretch bg-cup-orange-600">
            {/* Tap area → order tracking */}
            <Link
              href={`/orders/${order.id}`}
              className="flex flex-1 items-center gap-3 px-4 py-3 text-white"
            >
              {/* Live pulse dot */}
              <span className="relative flex h-2.5 w-2.5 shrink-0" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
              </span>

              <Coffee size={14} className="shrink-0 opacity-80" aria-hidden="true" />

              <span className="flex min-w-0 flex-1 items-center gap-2">
                <span className="truncate text-sm font-semibold">{label}</span>
                {order.pickupCode && (
                  <span className="shrink-0 rounded bg-white/20 px-1.5 py-0.5 font-mono text-xs font-bold tracking-widest">
                    {order.pickupCode}
                  </span>
                )}
              </span>

              <span className="shrink-0 text-xs font-semibold opacity-70">
                {isRtl ? '←' : '→'}
              </span>
            </Link>

            {/* Dismiss */}
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => setDismissed(true)}
              className="flex shrink-0 items-center px-4 text-white/60 transition hover:text-white"
            >
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
                <path
                  d="M1 1l9 9M10 1L1 10"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
