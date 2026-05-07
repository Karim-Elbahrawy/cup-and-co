'use client';

/**
 * Active-order banner rendered at the top of the customer home page.
 *
 * Renders only when `useActiveOrder()` returns a non-terminal order.
 * Tapping the banner deep-links to the order tracking page. The
 * headline copy is keyed off `order.status` (and `order.prepEta` when
 * the API provides it) so the customer sees the right state at a
 * glance:
 *
 *   received / accepted  → "Order placed — in queue."
 *   preparing            → "Brewing now — ready in ~N min."
 *   ready / out_for_delivery → "Ready! Pickup code 4192."
 *
 * Self-contained EN/AR copy. When the API returns a `prepEta` (PR #28
 * onward) the headline switches to the live countdown; on older builds
 * we fall back to the status-based copy.
 */

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Coffee, ChevronRight, CheckCircle2, Clock } from 'lucide-react';
import type { ApiOrder } from '@/lib/types';

interface ActiveOrderBannerProps {
  order: ApiOrder;
  language: 'en' | 'ar';
}

function totalQty(order: ApiOrder): number {
  return order.items.reduce((s, it) => s + it.quantity, 0);
}

function headlineFor(order: ApiOrder, language: 'en' | 'ar'): {
  headline: string;
  detail: string;
  Icon: typeof Coffee;
  ready: boolean;
} {
  const isAr = language === 'ar';
  const eta = order.prepEta;

  if (order.status === 'ready' || order.status === 'out_for_delivery') {
    return {
      headline: isAr
        ? `جاهز! كود الاستلام ${order.pickupCode ?? '—'}`
        : `Ready! Pickup code ${order.pickupCode ?? '—'}`,
      detail: isAr ? 'تعالى عند الكاشير.' : 'Pop by the counter.',
      Icon: CheckCircle2,
      ready: true,
    };
  }

  if (order.status === 'preparing') {
    if (eta && eta.basis === 'in_prep') {
      const min = Math.max(1, eta.etaMinutes);
      return {
        headline: isAr ? `بنحضر طلبك — ~${min} دقيقة` : `Brewing now — ~${min} min`,
        detail: isAr ? 'بنتولى طلبك دلوقتي.' : 'Barista is on your order.',
        Icon: Coffee,
        ready: false,
      };
    }
    return {
      headline: isAr ? 'بنحضر طلبك دلوقتي' : 'Brewing your order now',
      detail: isAr ? 'بنتولى طلبك دلوقتي.' : 'Barista is on your order.',
      Icon: Coffee,
      ready: false,
    };
  }

  // received / accepted — queue
  if (eta && (eta.basis === 'queue' || eta.basis === 'scheduled')) {
    const min = Math.max(1, eta.etaMinutes);
    const label =
      eta.basis === 'scheduled'
        ? isAr
          ? `جدولة بعد ~${min} دقيقة`
          : `Scheduled — ~${min} min`
        : isAr
          ? `في الطابور — ~${min} دقيقة`
          : `In queue — ~${min} min`;
    return {
      headline: label,
      detail: isAr ? 'هنبدأ التحضير قريب.' : 'Brewing starts soon.',
      Icon: Clock,
      ready: false,
    };
  }
  return {
    headline: isAr ? 'تم استلام الطلب' : 'Order placed',
    detail: isAr ? 'هنبدأ التحضير قريب.' : 'Brewing starts soon.',
    Icon: Clock,
    ready: false,
  };
}

export function ActiveOrderBanner({ order, language }: ActiveOrderBannerProps) {
  const { headline, detail, Icon, ready } = headlineFor(order, language);
  const itemCount = totalQty(order);
  const isAr = language === 'ar';

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <Link
        href={`/orders/${order.id}`}
        aria-label={isAr ? 'تتبع طلبك' : 'Track your order'}
        data-testid="active-order-banner"
        className={[
          'group flex items-center gap-3 rounded-card border px-4 py-3 shadow-card transition-all',
          ready
            ? 'border-cup-success/30 bg-gradient-to-br from-[var(--cup-accent-tint)] to-white text-cup-brown-900'
            : 'border-cup-orange-600/20 bg-gradient-to-br from-[var(--cup-cream)] to-white text-cup-brown-900',
          'hover:shadow-lg active:scale-[0.99]',
        ].join(' ')}
      >
        <span
          className={[
            'grid h-11 w-11 shrink-0 place-items-center rounded-full text-white',
            ready ? 'bg-cup-success' : 'bg-cup-primary',
          ].join(' ')}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="font-heading text-sm font-bold leading-tight text-[var(--cup-espresso)]">
            {headline}
          </p>
          <p className="mt-0.5 truncate text-xs text-[var(--cup-muted)]">
            {detail}
            <span className="mx-1.5" aria-hidden="true">·</span>
            {isAr ? `${itemCount} منتجات` : `${itemCount} ${itemCount === 1 ? 'item' : 'items'}`}
          </p>
        </div>

        <ChevronRight
          className="h-4 w-4 shrink-0 text-[var(--cup-muted)] transition-transform group-hover:translate-x-0.5 rtl:rotate-180"
          aria-hidden="true"
        />
      </Link>
    </motion.div>
  );
}
