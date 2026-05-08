'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RotateCcw } from 'lucide-react';
import { api } from '@/lib/api';
import { useCart } from '@/lib/cart';
import { useT, formatPrice } from '@/lib/i18n';
import type { ApiOrder } from '@/lib/types';

const TERMINAL_STATUSES = new Set(['completed', 'picked_up', 'cancelled', 'rejected', 'failed']);
const COMPLETED_STATUSES = new Set(['completed', 'picked_up']);

/**
 * Horizontal strip of the user's 3 most-recent terminal orders. Sits on the
 * home page right under the active-order banner so a returning customer sees
 * "what you had last" before browsing the menu.
 *
 * Each card links to /orders/[id] and has a one-tap Reorder button that
 * clones the order's items into the cart and routes to /cart.
 *
 * Renders nothing if the user has no past orders.
 */
export function RecentOrdersStrip() {
  const { t, language } = useT();
  const router = useRouter();
  const addToCart = useCart((s) => s.add);
  const clearCart = useCart((s) => s.clear);

  const [orders, setOrders] = useState<ApiOrder[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .listOrders()
      .then((r) => {
        if (cancelled) return;
        const terminal = r.orders.filter((o) => TERMINAL_STATUSES.has(o.status));
        setOrders(terminal.slice(0, 3));
      })
      .catch(() => {
        if (!cancelled) setOrders([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (orders === null || orders.length === 0) return null;

  function handleReorder(order: ApiOrder) {
    clearCart();
    for (const item of order.items) {
      addToCart({
        productId: item.productId,
        productNameEn: item.productNameEn,
        productNameAr: item.productNameAr,
        imageUrl: item.imageUrl,
        options: item.options,
        unitPriceEgp: item.unitPriceEgp,
        quantity: item.quantity,
      });
    }
    router.push('/cart');
  }

  return (
    <section aria-labelledby="recent-orders-heading">
      <div className="flex items-end justify-between">
        <h2
          id="recent-orders-heading"
          className="font-heading text-base font-bold text-[var(--cup-espresso)]"
        >
          {t('home.recentOrders')}
        </h2>
        <Link
          href="/orders"
          className="text-sm font-semibold text-[var(--cup-primary)] hover:text-[var(--cup-primary-hover)]"
        >
          {t('common.seeAll')} →
        </Link>
      </div>

      <div className="mt-3 -mx-5 overflow-x-auto px-5 pb-1 scrollbar-hide">
        <div className="flex gap-3">
          {orders.map((o) => (
            <article
              key={o.id}
              className="flex w-[260px] shrink-0 flex-col rounded-card border border-[var(--cup-stroke)] bg-white p-3 shadow-subtle"
            >
              <Link href={`/orders/${o.id}`} className="block flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-[var(--cup-muted)]">
                    #{o.pickupCode ?? o.id.slice(0, 6)}
                  </span>
                  <StatusPill status={o.status} t={t} />
                </div>
                <p className="mt-2 line-clamp-2 text-sm font-semibold text-[var(--cup-espresso)]">
                  {o.items
                    .map(
                      (i) =>
                        `${i.quantity}× ${language === 'ar' ? i.productNameAr : i.productNameEn}`,
                    )
                    .join(' · ')}
                </p>
                <p className="mt-1 text-xs text-[var(--cup-muted)]">
                  {formatRelativeDate(o.createdAt, language)}
                </p>
                <p className="mt-2 font-heading text-sm font-bold text-[var(--cup-primary)]">
                  {formatPrice(o.totalEgp, language)}
                </p>
              </Link>
              <button
                type="button"
                onClick={() => handleReorder(o)}
                className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-pill bg-[var(--cup-cream)] px-3 py-2 text-xs font-bold text-[var(--cup-primary)] transition hover:bg-[var(--cup-primary)] hover:text-white"
              >
                <RotateCcw size={12} aria-hidden="true" />
                {t('orders.reorder')}
              </button>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function StatusPill({ status, t }: { status: string; t: (key: string) => string }) {
  const completed = COMPLETED_STATUSES.has(status);
  const cls = completed
    ? 'bg-emerald-100 text-emerald-700'
    : 'bg-rose-100 text-rose-700';
  const labelKey = `orders.${camelize(status)}`;
  return (
    <span
      className={`rounded-pill px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${cls}`}
    >
      {t(labelKey)}
    </span>
  );
}

function formatRelativeDate(iso: string, language: string): string {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

  if (diffDays === 0) return language === 'ar' ? 'اليوم' : 'Today';
  if (diffDays === 1) return language === 'ar' ? 'أمس' : 'Yesterday';
  if (diffDays < 7) {
    return language === 'ar' ? `قبل ${diffDays} أيام` : `${diffDays} days ago`;
  }
  return d.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function camelize(s: string): string {
  return s.replace(/_([a-z])/g, (_m, c: string) => c.toUpperCase());
}
