'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, ChevronLeft, Coffee, History, RotateCcw, ShoppingBag, Sparkles } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { PageTransition } from '@/components/PageTransition';
import { api } from '@/lib/api';
import { useCart, type CartItem } from '@/lib/cart';
import { useT, formatPrice } from '@/lib/i18n';
import type { ApiOrder, ApiOrderItem } from '@/lib/types';

type RankedLine = ApiOrderItem & { frequency: number; lastOrderedAt: string };

function signatureForLine(item: ApiOrderItem): string {
  const options = Object.entries(item.options)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}:${value}`)
    .join('|');
  return `${item.productId}::${options}`;
}

function signatureForOrder(order: ApiOrder): string {
  return order.items
    .map((item) => `${signatureForLine(item)}::${item.quantity}`)
    .sort()
    .join('||');
}

function itemToCartInput(item: ApiOrderItem): Omit<CartItem, 'quantity'> & { quantity?: number } {
  return {
    productId: item.productId,
    productNameEn: item.productNameEn,
    productNameAr: item.productNameAr,
    imageUrl: item.imageUrl,
    options: item.options,
    unitPriceEgp: item.unitPriceEgp,
    quantity: item.quantity,
  };
}

export default function UsualPage() {
  const router = useRouter();
  const { t, language } = useT();
  const reduce = useReducedMotion();
  const addToCart = useCart((state) => state.add);

  const [orders, setOrders] = useState<ApiOrder[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .listOrders()
      .then((response) => {
        if (!cancelled) setOrders(response.orders);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const ranked = useMemo(() => {
    if (!orders || orders.length === 0) {
      return {
        usualOrder: null as ApiOrder | null,
        quickLines: [] as RankedLine[],
      };
    }

    const sortedOrders = [...orders].sort(
      (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    );

    const orderMap = new Map<string, { count: number; order: ApiOrder; lastAt: string }>();
    const lineMap = new Map<string, RankedLine>();

    for (const order of sortedOrders) {
      const orderKey = signatureForOrder(order);
      const currentOrder = orderMap.get(orderKey);
      if (currentOrder) {
        currentOrder.count += 1;
      } else {
        orderMap.set(orderKey, { count: 1, order, lastAt: order.createdAt });
      }

      for (const item of order.items) {
        const itemKey = signatureForLine(item);
        const currentItem = lineMap.get(itemKey);
        if (currentItem) {
          currentItem.frequency += 1;
        } else {
          lineMap.set(itemKey, {
            ...item,
            frequency: 1,
            lastOrderedAt: order.createdAt,
          });
        }
      }
    }

    const usualOrder =
      [...orderMap.values()]
        .sort((left, right) => {
          if (right.count !== left.count) return right.count - left.count;
          return new Date(right.lastAt).getTime() - new Date(left.lastAt).getTime();
        })[0]?.order ?? sortedOrders[0];

    const quickLines = [...lineMap.values()]
      .sort((left, right) => {
        if (right.frequency !== left.frequency) return right.frequency - left.frequency;
        return new Date(right.lastOrderedAt).getTime() - new Date(left.lastOrderedAt).getTime();
      })
      .slice(0, 4);

    return { usualOrder, quickLines };
  }, [orders]);

  const copy = useMemo(
    () =>
      language === 'ar'
        ? {
            title: 'طلبك المعتاد',
            heroEyebrow: 'الاسرع لعادتك اليومية',
            heroHeadline: 'نفس الطلب، بلمسة واحدة',
            heroSubtitle: 'رجع طلبك المتكرر بسرعة وخلي عادة القهوة اسهل كل يوم.',
            reorderAll: 'اطلب نفس السلة',
            quickTitle: 'الاسرع لك',
            quickSubtitle: 'اكتر اختيارات انت بترجع لها',
            ordered: 'تم طلبه',
            times: 'مرات',
            add: 'اضف بسرعة',
            habit: 'معتاد',
            oneTap: 'ضغطة واحدة',
            items: 'عناصر',
            emptyTitle: 'اول طلب لك يبتدي من هنا',
            emptyBody: 'لما تطلب كام مرة، هنحط اقرب اختصارات لعادتك اليومية في المكان ده.',
            browse: 'شوف المنيو',
            added: 'اتضاف',
          }
        : {
            title: 'Your usual',
            heroEyebrow: 'fast lane for daily habits',
            heroHeadline: 'Same order, one quick move',
            heroSubtitle: 'Bring back your regular in seconds and make the daily coffee run easier to repeat.',
            reorderAll: 'Reorder this basket',
            quickTitle: 'Fastest for you',
            quickSubtitle: 'The combos you keep coming back to',
            ordered: 'Ordered',
            times: 'times',
            add: 'Quick add',
            habit: 'Habit',
            oneTap: '1 tap',
            items: 'items',
            emptyTitle: 'Your daily shortcut starts here',
            emptyBody: 'Once you order a few times, we will pin the fastest way back to your regular right here.',
            browse: 'Browse the menu',
            added: 'Added',
          },
    [language],
  );

  function addWholeOrder(order: ApiOrder) {
    setBusyKey(`order:${order.id}`);
    for (const item of order.items) {
      addToCart(itemToCartInput(item));
    }
    setTimeout(() => {
      setBusyKey(null);
      router.push('/cart');
    }, 220);
  }

  function addSingleLine(item: RankedLine) {
    const key = `item:${signatureForLine(item)}`;
    setBusyKey(key);
    addToCart(itemToCartInput(item));
    setTimeout(() => {
      setBusyKey(null);
      router.push('/cart');
    }, 220);
  }

  return (
    <PageTransition>
      <main className="min-h-screen bg-cup-paper pb-24">
        <header className="sticky top-0 z-20 flex items-center justify-between bg-cup-paper/85 px-5 py-4 backdrop-blur-sm">
          <Link
            href="/"
            aria-label={t('common.back')}
            className="grid h-10 w-10 place-items-center rounded-full border border-cup-stroke bg-white shadow-subtle"
          >
            <ChevronLeft className="h-5 w-5 text-cup-brown-900" />
          </Link>
          <p className="font-heading text-base font-semibold text-cup-brown-900">{copy.title}</p>
          <span className="w-10" aria-hidden="true" />
        </header>

        <div className="mx-auto flex max-w-5xl flex-col gap-5 px-5 pt-3">
          {error ? (
            <div className="rounded-card border border-cup-error bg-white p-4 text-sm text-cup-error">
              {error}
            </div>
          ) : null}

          {orders === null ? (
            <div className="space-y-3">
              <div className="h-40 animate-pulse rounded-card bg-cup-stroke" />
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="h-36 animate-pulse rounded-card bg-cup-stroke" />
                <div className="h-36 animate-pulse rounded-card bg-cup-stroke" />
              </div>
            </div>
          ) : ranked.usualOrder ? (
            <>
              <section className="relative overflow-hidden rounded-card bg-[linear-gradient(135deg,rgba(244,162,97,0.96),rgba(194,65,12,0.98))] p-6 text-white shadow-[0_14px_40px_rgba(194,65,12,0.24)]">
                <div className="pointer-events-none absolute -right-10 -top-8 h-32 w-32 rounded-full bg-white/14 blur-2xl" />
                <div className="pointer-events-none absolute bottom-0 right-16 h-20 w-20 rounded-full border border-white/16" />

                <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                  <div className="max-w-xl">
                    <div className="inline-flex items-center gap-2 rounded-full bg-white/14 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] backdrop-blur-sm">
                      <History className="h-3.5 w-3.5" />
                      {copy.heroEyebrow}
                    </div>
                    <h1 className="mt-3 font-heading text-3xl font-bold leading-tight sm:text-4xl">
                      {copy.heroHeadline}
                    </h1>
                    <p className="mt-2 max-w-lg text-sm text-white/92">{copy.heroSubtitle}</p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {ranked.usualOrder.items.slice(0, 3).map((item) => (
                        <span
                          key={`${ranked.usualOrder?.id}-${item.productId}-${item.quantity}`}
                          className="rounded-full bg-white/14 px-3 py-1 text-xs font-medium backdrop-blur-sm"
                        >
                          {language === 'ar' ? item.productNameAr : item.productNameEn}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[24px] bg-white/12 p-4 backdrop-blur-sm">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-white/80">
                      {ranked.usualOrder.items.length} {copy.items}
                    </p>
                    <p className="mt-1 font-heading text-3xl font-bold">
                      {formatPrice(ranked.usualOrder.totalEgp, language)}
                    </p>
                    <button
                      type="button"
                      onClick={() => addWholeOrder(ranked.usualOrder!)}
                      className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[var(--cup-primary)] shadow-[0_6px_18px_rgba(28,25,23,0.16)] transition active:scale-[0.98]"
                    >
                      {busyKey === `order:${ranked.usualOrder.id}` ? copy.added : copy.reorderAll}
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </section>

              <section>
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <h2 className="font-heading text-xl font-bold text-cup-brown-900">{copy.quickTitle}</h2>
                    <p className="mt-1 text-sm text-cup-muted">{copy.quickSubtitle}</p>
                  </div>
                  <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cup-orange-700 shadow-subtle">
                    <Sparkles className="h-3.5 w-3.5" />
                    {copy.oneTap}
                  </span>
                </div>

                <motion.div
                  className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4"
                  initial={reduce ? false : 'hidden'}
                  animate="visible"
                  variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
                >
                  {ranked.quickLines.map((item) => {
                    const itemKey = `item:${signatureForLine(item)}`;
                    return (
                      <motion.div
                        key={itemKey}
                        variants={{
                          hidden: { opacity: 0, y: 14 },
                          visible: { opacity: 1, y: 0 },
                        }}
                        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden rounded-card border border-cup-stroke bg-white p-3 shadow-subtle"
                      >
                        <div className="relative aspect-square overflow-hidden rounded-[18px] bg-white">
                          <Image
                            src={item.imageUrl}
                            alt=""
                            fill
                            sizes="220px"
                            className="rounded-[18px] object-cover"
                          />
                        </div>

                        <div className="mt-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-heading text-sm font-semibold text-cup-brown-900">
                                {language === 'ar' ? item.productNameAr : item.productNameEn}
                              </p>
                              <p className="mt-1 text-xs text-cup-muted">
                                {copy.ordered} {item.frequency} {copy.times}
                              </p>
                            </div>
                            <span className="rounded-full bg-cup-cream-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-cup-orange-700">
                              {copy.habit}
                            </span>
                          </div>

                          {Object.keys(item.options).length > 0 ? (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {Object.entries(item.options).map(([key, value]) => (
                                <span
                                  key={`${itemKey}-${key}`}
                                  className="rounded-full bg-cup-paper px-2 py-1 text-[10px] font-medium text-cup-cocoa"
                                >
                                  {value}
                                </span>
                              ))}
                            </div>
                          ) : null}

                          <div className="mt-3 flex items-center justify-between gap-3">
                            <p className="font-heading text-sm font-bold text-cup-orange-700">
                              {formatPrice(item.unitPriceEgp, language)}
                            </p>
                            <button
                              type="button"
                              onClick={() => addSingleLine(item)}
                              className="inline-flex items-center gap-2 rounded-full bg-cup-brown-900 px-4 py-2 text-xs font-semibold text-white transition active:scale-[0.98]"
                            >
                              {busyKey === itemKey ? copy.added : copy.add}
                              <ShoppingBag className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              </section>
            </>
          ) : (
            <section className="rounded-card border border-cup-stroke bg-white p-8 text-center shadow-card">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-cup-cream-100 text-cup-orange-700">
                <Coffee className="h-7 w-7" />
              </div>
              <h1 className="mt-4 font-heading text-2xl font-bold text-cup-brown-900">
                {copy.emptyTitle}
              </h1>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-cup-muted">
                {copy.emptyBody}
              </p>
              <Link
                href="/"
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-cup-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow-subtle"
              >
                {copy.browse}
                <RotateCcw className="h-4 w-4" />
              </Link>
            </section>
          )}
        </div>
      </main>
    </PageTransition>
  );
}
