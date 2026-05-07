'use client';

import { use, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Check, XCircle, MapPin, Clock } from 'lucide-react';
import { api, ApiError, BASE_URL } from '@/lib/api';
import { getToken } from '@/lib/session';
import { useT } from '@/lib/i18n';
import type { ApiOrder, TimelineStep } from '@/lib/types';

const POLL_MS = 5000;
const TERMINAL_STATUSES = ['completed', 'cancelled', 'refunded'];
const CANCELLABLE_STATUSES = ['received', 'accepted', 'preparing'];

export default function OrderTrackingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { t, language } = useT();
  const [order, setOrder] = useState<ApiOrder | null>(null);
  const [timeline, setTimeline] = useState<TimelineStep[]>([]);
  const [prepMinutesEst, setPrepMinutesEst] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showItems, setShowItems] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const sseActive = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const res = await api.getOrder(id);
      setOrder(res.order);
      setTimeline(res.timeline);
      if (res.prepMinutesEst != null) setPrepMinutesEst(res.prepMinutesEst);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load order');
    }
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // SSE real-time updates with fetch-based stream, falling back to polling
  useEffect(() => {
    if (!order) return;
    if (TERMINAL_STATUSES.includes(order.status)) return;

    let cancelled = false;
    const controller = new AbortController();

    async function connectSSE() {
      const token = getToken();
      if (!token) return;

      try {
        const response = await fetch(`${BASE_URL}/orders/${id}/events`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          // SSE endpoint not available, fall back to polling
          return false;
        }

        sseActive.current = true;
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (!cancelled) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          // Keep the last (potentially incomplete) line in the buffer
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (line.startsWith('data:')) {
              const jsonStr = line.slice(5).trim();
              if (!jsonStr) continue;
              try {
                const evt = JSON.parse(jsonStr);
                if (evt.order) setOrder(evt.order);
                if (evt.timeline) setTimeline(evt.timeline);
              } catch {
                // Malformed SSE data, skip
              }
            }
          }
        }

        return true;
      } catch {
        // SSE failed (network, abort, not supported)
        return false;
      } finally {
        sseActive.current = false;
      }
    }

    // Try SSE, fall back to polling
    let pollInterval: ReturnType<typeof setInterval> | null = null;
    connectSSE().then((sseWorked) => {
      if (cancelled) return;
      if (!sseWorked) {
        // Fall back to polling
        pollInterval = setInterval(refresh, POLL_MS);
      }
    });

    return () => {
      cancelled = true;
      controller.abort();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [order?.id, id, refresh]);

  // Cancel order handler
  async function handleCancel() {
    if (cancelling) return;
    setCancelling(true);
    setCancelError(null);
    try {
      const res = await api.cancelOrder(id);
      setOrder(res.order);
      setTimeline(res.timeline);
    } catch (e) {
      setCancelError(e instanceof ApiError ? e.message : 'Failed to cancel order');
    } finally {
      setCancelling(false);
    }
  }

  if (error && !order) {
    return (
      <main className="min-h-screen bg-cup-paper px-6 py-10">
        <div className="mx-auto max-w-3xl rounded-card border border-cup-error bg-white p-6 text-cup-error">
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
        <div className="mx-auto max-w-3xl animate-pulse space-y-4">
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

      {/* Pickup code hero / Delivery details hero */}
      <section className="mx-auto mt-2 max-w-3xl px-5">
        {order.fulfillmentType === 'pickup' ? (
          <div className="rounded-card border border-cup-stroke bg-white p-6 shadow-card">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cup-muted">
              {t('orders.pickupCode')}
            </p>
            <p className="mt-1 font-heading text-[64px] font-bold leading-none text-cup-orange-600">
              {order.pickupCode ?? '—'}
            </p>
            <p className="mt-2 text-sm text-cup-muted">
              {t('orders.pickupInstruction')}
            </p>
          </div>
        ) : (
          <div className="rounded-card border border-cup-stroke bg-white p-6 shadow-card">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-cup-orange-600/10">
                <MapPin className="h-4 w-4 text-cup-orange-600" />
              </span>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cup-muted">
                {t('orders.deliveryAddress')}
              </p>
            </div>
            <p className="mt-3 font-heading text-lg font-bold leading-snug text-cup-brown-900">
              {order.notes
                ? order.notes.split(' — ')[0]
                : (language === 'ar' ? 'عنوان غير محدد' : 'No address provided')}
            </p>
            {order.notes?.includes(' — ') && (
              <p className="mt-1 text-sm text-cup-muted">
                {order.notes.split(' — ').slice(1).join(' — ')}
              </p>
            )}
            <p className="mt-3 text-sm text-cup-muted">
              {t('orders.deliveryInstruction')}
            </p>
          </div>
        )}
      </section>

      {/* Prep time estimate — shown only while order is still in progress */}
      {prepMinutesEst != null && !TERMINAL_STATUSES.includes(order.status) && (
        <section className="mx-auto mt-4 max-w-3xl px-5">
          <div className="flex items-center gap-3 rounded-2xl border border-cup-orange-500/30 bg-cup-orange-50 px-5 py-3.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-cup-orange-500/15">
              <Clock className="h-5 w-5 text-cup-orange-600" aria-hidden="true" />
            </span>
            <div>
              <p className="font-heading text-sm font-bold text-cup-orange-700">
                {language === 'ar' ? `جاهز خلال ~${prepMinutesEst} دقيقة` : `Ready in ~${prepMinutesEst} min`}
              </p>
              <p className="text-xs text-cup-orange-600/70">
                {language === 'ar' ? 'وقت تحضير تقريبي' : 'Estimated prep time'}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Cancel order */}
      <AnimatePresence>
        {order && CANCELLABLE_STATUSES.includes(order.status) && (
          <motion.section
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mx-auto mt-4 max-w-3xl px-5"
          >
            <button
              type="button"
              onClick={handleCancel}
              disabled={cancelling}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-cup-error/30 bg-white px-5 py-3 font-heading text-sm font-semibold text-cup-error shadow-subtle transition active:scale-[0.98] disabled:opacity-60"
            >
              <XCircle className="h-4 w-4" />
              {cancelling ? t('orders.cancelling') : t('orders.cancelOrder')}
            </button>
            {cancelError && (
              <p className="mt-2 text-center text-xs text-cup-error">{cancelError}</p>
            )}
          </motion.section>
        )}
      </AnimatePresence>

      {/* Vertical timeline */}
      <section className="mx-auto mt-5 max-w-3xl px-5">
        <div className="rounded-card border border-cup-stroke bg-white p-6 shadow-card">
          <ol className="relative space-y-6 ps-2" aria-label="Order status">
            {timeline.map((step, idx) => {
              const isLast = idx === timeline.length - 1;
              const { solid, soft } = stepColor(idx, timeline.length, step.status);
              return (
                <li key={`${step.status}-${idx}`} className="relative flex gap-4">
                  {/* connector line — colored when done, stroke when pending */}
                  {!isLast && (
                    <span
                      aria-hidden="true"
                      className="absolute left-[18px] top-9 h-[calc(100%+8px)] w-0.5 transition-colors duration-500"
                      style={{ backgroundColor: step.done ? solid : 'var(--cup-stroke)' }}
                    />
                  )}
                  <StepDot done={step.done} active={step.active} solid={solid} soft={soft} />
                  <div className="flex-1 pt-1">
                    <p
                      className="font-heading text-sm font-semibold transition-colors duration-300"
                      style={{
                        color: step.active
                          ? solid
                          : step.done
                          ? 'var(--cup-espresso)'
                          : 'var(--cup-muted)',
                      }}
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
      <section className="mx-auto mt-5 max-w-3xl px-5">
        <button
          type="button"
          onClick={() => setShowItems((v) => !v)}
          className="flex w-full items-center justify-between rounded-card border border-cup-stroke bg-white px-5 py-4 text-start text-sm font-semibold text-cup-brown-900 shadow-subtle"
        >
          {showItems ? t('orders.hideItems') : `${t('orders.viewItems')} (${order.items.length})`}
          <span className="text-cup-muted">{showItems ? '▲' : '▼'}</span>
        </button>
        {showItems && (
          <div className="mt-2 rounded-card border border-cup-stroke bg-white p-4 shadow-subtle">
            <ul className="divide-y divide-cup-stroke">
              {order.items.map((it, i) => (
                <li key={`${it.productId}-${i}`} className="flex gap-3 py-3">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-card bg-white">
                    {it.imageUrl ? (
                      <Image
                        src={it.imageUrl}
                        alt={it.productNameEn}
                        fill
                        sizes="48px"
                        className="rounded-card object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="flex flex-1 flex-col">
                    <p className="text-sm font-semibold">
                      {language === 'ar' ? it.productNameAr : it.productNameEn}
                      <span className="ms-2 text-xs text-cup-muted">×{it.quantity}</span>
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

function StepDot({
  done,
  active,
  solid,
  soft,
}: {
  done: boolean;
  active: boolean;
  solid: string;
  soft: string;
}) {
  if (done) {
    return (
      <span
        className="z-10 grid h-9 w-9 shrink-0 place-items-center rounded-full text-white shadow-subtle transition-colors duration-500"
        style={{ backgroundColor: solid }}
      >
        <Check className="h-4 w-4" />
      </span>
    );
  }
  if (active) {
    return (
      <span className="relative z-10 grid h-9 w-9 shrink-0 place-items-center" aria-current="step">
        {/* pulsing halo */}
        <motion.span
          aria-hidden="true"
          className="absolute inset-0 rounded-full"
          style={{ backgroundColor: soft }}
          animate={{ scale: [1, 1.35, 1], opacity: [0.8, 0, 0.8] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        />
        {/* ring */}
        <span
          className="absolute inset-0 rounded-full border-2 bg-white"
          style={{ borderColor: solid }}
        />
        {/* inner dot */}
        <span
          className="relative h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: solid }}
        />
      </span>
    );
  }
  // future step
  return (
    <span className="z-10 grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-cup-stroke bg-white" />
  );
}

/**
 * Returns a color for a timeline step. 'preparing' is always yellow; every
 * other step interpolates from terracotta-orange (first) to emerald-green (last).
 */
function stepColor(idx: number, total: number, status?: string): { solid: string; soft: string } {
  if (status === 'preparing') {
    return { solid: 'rgb(234, 179, 8)', soft: 'rgba(234, 179, 8, 0.18)' };
  }
  const t = total <= 1 ? 1 : idx / (total - 1);

  // Four anchor colors: orange → amber → lime → green
  const stops: [number, number, number][] = [
    [194,  65,  12],   // #C2410C  terracotta (brand primary)
    [217, 119,   6],   // #D97706  amber
    [101, 163,  13],   // #65A30D  lime-600
    [ 21, 128,  61],   // #15803D  emerald (cup-success)
  ];

  const seg = t * (stops.length - 1);
  const lo  = Math.floor(seg);
  const hi  = Math.min(lo + 1, stops.length - 1);
  const f   = seg - lo;

  const r = Math.round(stops[lo][0] + (stops[hi][0] - stops[lo][0]) * f);
  const g = Math.round(stops[lo][1] + (stops[hi][1] - stops[lo][1]) * f);
  const b = Math.round(stops[lo][2] + (stops[hi][2] - stops[lo][2]) * f);

  return {
    solid: `rgb(${r}, ${g}, ${b})`,
    soft:  `rgba(${r}, ${g}, ${b}, 0.18)`,
  };
}

function camelize(s: string): string {
  return s.replace(/_([a-z])/g, (_m, c: string) => c.toUpperCase());
}
