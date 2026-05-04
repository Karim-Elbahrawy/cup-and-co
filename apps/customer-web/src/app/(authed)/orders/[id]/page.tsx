'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ChevronLeft, Check } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useT } from '@/lib/i18n';
import type { ApiOrder, TimelineStep } from '@/lib/types';

const POLL_MS = 5000;

export default function OrderTrackingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { t, language } = useT();
  const [order, setOrder] = useState<ApiOrder | null>(null);
  const [timeline, setTimeline] = useState<TimelineStep[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showItems, setShowItems] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await api.getOrder(id);
      setOrder(res.order);
      setTimeline(res.timeline);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load order');
    }
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Poll while non-terminal
  useEffect(() => {
    if (!order) return;
    if (['completed', 'cancelled', 'refunded'].includes(order.status)) return;
    const interval = setInterval(refresh, POLL_MS);
    return () => clearInterval(interval);
  }, [order, refresh]);

  if (error && !order) {
    return (
      <main className="min-h-screen bg-cup-paper px-6 py-10">
        <div className="mx-auto max-w-md rounded-card border border-cup-error bg-white p-6 text-cup-error">
          <p className="font-semibold">{t('common.error')}</p>
          <p className="mt-1 text-sm">{error}</p>
          <Link href="/" className="mt-3 inline-block text-sm underline">
            {t('common.back')}
          </Link>
        </div>
      </main>
    );
  }

  if (!order) {
    return (
      <main className="min-h-screen bg-cup-paper px-6 pt-6">
        <div className="mx-auto max-w-md animate-pulse space-y-4">
          <div className="h-12 rounded-card bg-cup-stroke" />
          <div className="h-32 rounded-card bg-cup-stroke" />
          <div className="h-64 rounded-card bg-cup-stroke" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-cup-paper pb-16">
      <header className="sticky top-0 z-20 flex items-center justify-between bg-cup-paper/85 px-5 py-4 backdrop-blur-sm">
        <Link
          href="/"
          aria-label={t('common.back')}
          className="grid h-10 w-10 place-items-center rounded-full border border-cup-stroke bg-white shadow-subtle"
        >
          <ChevronLeft className="h-5 w-5 text-cup-brown-900" />
        </Link>
        <p className="font-heading text-base font-semibold text-cup-brown-900">
          {t('orders.orderTracking')}
        </p>
        <span className="w-10" aria-hidden="true" />
      </header>

      {/* Pickup code hero */}
      <section className="mx-auto mt-2 max-w-md px-5">
        <div className="rounded-card border border-cup-stroke bg-white p-6 shadow-card">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cup-muted">
            {t('orders.pickupCode')}
          </p>
          <p className="mt-1 font-heading text-[64px] font-bold leading-none text-cup-orange-600">
            {order.pickupCode ?? '—'}
          </p>
          <p className="mt-2 text-sm text-cup-muted">
            {order.fulfillmentType === 'pickup'
              ? 'Show this at the counter when you arrive.'
              : 'Confirm with the courier on delivery.'}
          </p>
        </div>
      </section>

      {/* Vertical timeline */}
      <section className="mx-auto mt-5 max-w-md px-5">
        <div className="rounded-card border border-cup-stroke bg-white p-6 shadow-card">
          <ol className="relative space-y-6 pl-2" aria-label="Order status">
            {timeline.map((step, idx) => {
              const isLast = idx === timeline.length - 1;
              return (
                <li key={`${step.status}-${idx}`} className="relative flex gap-4">
                  {/* connector */}
                  {!isLast && (
                    <span
                      aria-hidden="true"
                      className={`absolute left-[18px] top-9 h-[calc(100%+8px)] w-0.5 ${
                        step.done ? 'bg-cup-orange-600' : 'bg-cup-stroke'
                      }`}
                    />
                  )}
                  <StepDot done={step.done} active={step.active} />
                  <div className="flex-1 pt-1">
                    <p
                      className={`font-heading text-sm font-semibold ${
                        step.active ? 'text-cup-orange-700' : step.done ? 'text-cup-brown-900' : 'text-cup-muted'
                      }`}
                    >
                      {step.label}
                    </p>
                    {step.at && (
                      <p className="mt-0.5 text-xs text-cup-muted">
                        {new Date(step.at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* Items */}
      <section className="mx-auto mt-5 max-w-md px-5">
        <button
          type="button"
          onClick={() => setShowItems((v) => !v)}
          className="flex w-full items-center justify-between rounded-card border border-cup-stroke bg-white px-5 py-4 text-left text-sm font-semibold text-cup-brown-900 shadow-subtle"
        >
          {showItems ? 'Hide items' : `View items (${order.items.length})`}
          <span className="text-cup-muted">{showItems ? '▲' : '▼'}</span>
        </button>
        {showItems && (
          <div className="mt-2 rounded-card border border-cup-stroke bg-white p-4 shadow-subtle">
            <ul className="divide-y divide-cup-stroke">
              {order.items.map((it, i) => (
                <li key={`${it.productId}-${i}`} className="flex gap-3 py-3">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-card bg-cup-cream-100">
                    {it.imageUrl ? (
                      <Image src={it.imageUrl} alt={it.productNameEn} fill sizes="48px" className="object-cover" />
                    ) : null}
                  </div>
                  <div className="flex flex-1 flex-col">
                    <p className="text-sm font-semibold">
                      {language === 'ar' ? it.productNameAr : it.productNameEn}
                      <span className="ml-2 text-xs text-cup-muted">×{it.quantity}</span>
                    </p>
                    {Object.keys(it.options).length > 0 && (
                      <p className="mt-0.5 text-[11px] text-cup-muted">
                        {Object.entries(it.options)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(' · ')}
                      </p>
                    )}
                  </div>
                  <p className="self-center text-sm font-semibold text-cup-orange-700">
                    EGP {it.lineTotalEgp}
                  </p>
                </li>
              ))}
            </ul>
            <hr className="my-2 border-cup-stroke" />
            <div className="flex justify-between text-sm">
              <span className="text-cup-muted">{t('cart.total')}</span>
              <span className="font-heading text-base font-bold text-cup-orange-700">
                EGP {order.totalEgp}
              </span>
            </div>
          </div>
        )}
      </section>

      <p className="mt-6 text-center text-xs text-cup-muted">
        {`Status: ${t(`orders.${camelize(order.status)}`)} · ${order.paymentStatus}`}
      </p>
    </main>
  );
}

function StepDot({ done, active }: { done: boolean; active: boolean }) {
  if (done) {
    return (
      <span className="z-10 grid h-9 w-9 place-items-center rounded-full bg-cup-orange-600 text-white shadow-subtle">
        <Check className="h-4 w-4" />
      </span>
    );
  }
  if (active) {
    return (
      <span className="relative z-10 grid h-9 w-9 place-items-center" aria-current="step">
        <motion.span
          aria-hidden="true"
          className="absolute inset-0 rounded-full bg-cup-teal-700/30"
          animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 1.6, repeat: Infinity }}
        />
        <span className="absolute inset-0 rounded-full border-2 border-cup-orange-600 bg-cup-cream-100" />
        <span className="relative h-2 w-2 rounded-full bg-cup-orange-600" />
      </span>
    );
  }
  return (
    <span className="z-10 grid h-9 w-9 place-items-center rounded-full border-2 border-cup-stroke bg-white" />
  );
}

function camelize(s: string): string {
  return s.replace(/_([a-z])/g, (_m, c: string) => c.toUpperCase());
}
