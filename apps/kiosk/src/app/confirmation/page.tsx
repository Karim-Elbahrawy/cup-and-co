'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Wallet, RotateCw, CloudOff } from 'lucide-react';
import { BigButton } from '@/components/BigButton';
import { PostOrderRating } from '@/components/PostOrderRating';
import { useLastOrder } from '@/lib/useLastOrder';
import { useLang } from '@/lib/useLang';
import { useIdentified } from '@/lib/useIdentified';

/**
 * /confirmation — K1.8 confirmation screen + auto-reset.
 *
 * Layout:
 *   - Huge pickup code (text-9xl-ish, primary colour)
 *   - "Show this at the counter" instruction with a wallet icon
 *   - "Ready in ~N min" using prepEta from the order response
 *   - Decorative coffee-bean confetti rising on first paint (Framer Motion,
 *     respects reduced-motion via the global CSS rule in globals.css)
 *   - 'Place another order' big button — restarts immediately
 *   - 8-second auto-reset back to the attract loop. Long enough for the
 *     customer to read + remember the code, short enough that the next
 *     customer doesn't wait. The countdown ring around the button
 *     visualises the timer.
 *
 * Cold-load guard: if there's no order in the store (refresh, deep link),
 * we redirect to / immediately. Sharing a confirmation URL would also
 * leak someone else's pickup code — the redirect is a privacy stop too.
 */

const AUTO_RESET_MS = 8_000;

export default function ConfirmationPage() {
  const router = useRouter();
  const order = useLastOrder((s) => s.order);
  const clearLastOrder = useLastOrder((s) => s.clear);
  const [, forceRender] = useState(0);
  const startedAt = useRef<number>(Date.now());
  const lang = useLang((s) => s.lang);
  const resetLang = useLang((s) => s.reset);
  const clearIdentified = useIdentified((s) => s.clear);

  // Cold-load guard.
  useEffect(() => {
    if (!order) router.replace('/');
  }, [order, router]);

  // Auto-reset countdown — single timer, single setState. We re-render at
  // 100ms cadence so the ring animation looks smooth without binding to
  // requestAnimationFrame (which would overdraw on a stationary page).
  useEffect(() => {
    if (!order) return;
    const tick = window.setInterval(() => forceRender((n) => n + 1), 100);
    const reset = window.setTimeout(() => {
      clearLastOrder();
      resetLang();
      clearIdentified();
      router.replace('/');
    }, AUTO_RESET_MS);
    return () => {
      window.clearInterval(tick);
      window.clearTimeout(reset);
    };
  }, [order, clearLastOrder, resetLang, clearIdentified, router]);

  if (!order) return null;

  const elapsed = Date.now() - startedAt.current;
  const fractionLeft = Math.max(0, 1 - elapsed / AUTO_RESET_MS);
  const secondsLeft = Math.max(0, Math.ceil((AUTO_RESET_MS - elapsed) / 1000));

  const code = order.order.pickupCode ?? '0000';
  const minutes = order.prepEta?.minutes ?? 0;

  function handleRestart() {
    clearLastOrder();
    resetLang();
    clearIdentified();
    router.replace('/');
  }

  return (
    <main className="relative grid h-dvh w-dvw place-items-center overflow-hidden bg-[var(--cup-paper)]">
      {/* Confetti / coffee-bean rise — cosmetic only, hidden from
          assistive tech, hidden under reduced-motion via globals.css. */}
      <BeanConfetti />

      <div className="relative z-10 mx-auto max-w-3xl px-12 text-center">
        <p
          className={[
            'text-sm font-bold uppercase tracking-[0.4em]',
            order.queued ? 'text-[var(--cup-warning)]' : 'text-[var(--cup-success)]',
          ].join(' ')}
        >
          {order.queued
            ? lang === 'ar' ? 'في الانتظار' : 'Order queued'
            : lang === 'ar' ? 'تم الطلب' : 'Order placed'}
        </p>
        <h1 className="mt-3 font-heading text-k-card font-bold text-[var(--cup-cocoa)]">
          {lang === 'ar' ? 'رقم الاستلام' : 'Your pickup code'}
        </h1>

        {/* The headline number. Tracking-tight + tabular-nums so 4-digit
            codes don't wobble between renders. */}
        <motion.p
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 14, stiffness: 200, delay: 0.05 }}
          className="my-6 font-heading text-[160px] font-black leading-none tracking-tight text-[var(--cup-primary)] tabular-nums"
        >
          {code}
        </motion.p>

        <p className="mb-2 inline-flex items-center gap-3 rounded-pill bg-white px-6 py-3 font-heading text-k-card font-semibold text-[var(--cup-espresso)] shadow-card">
          <Wallet className="h-7 w-7 text-[var(--cup-primary)]" aria-hidden="true" />
          {lang === 'ar'
            ? 'هات الكود للكاشير وادفع كاش'
            : 'Show this at the counter & pay cash'}
        </p>

        {/* K5.1 — extra context when the order is sitting in the offline
            queue. The cashier still recognizes the temp pickup code, and
            the kitchen will see the order pop up automatically when the
            iPad reconnects. */}
        {order.queued ? (
          <p className="mt-4 inline-flex items-center gap-2 rounded-pill bg-[var(--cup-warning)]/15 px-4 py-2 font-body text-base font-semibold text-[var(--cup-warning)]">
            <CloudOff className="h-5 w-5" aria-hidden="true" />
            {lang === 'ar'
              ? 'مفيش نت — هيتزامن لما يرجع'
              : "Offline — we'll sync when the network's back"}
          </p>
        ) : minutes > 0 ? (
          <p className="mt-6 font-body text-k-body text-[var(--cup-cocoa)]">
            {lang === 'ar'
              ? `جاهز خلال حوالي ${minutes} دقيقة`
              : `Ready in ~${minutes} min`}
          </p>
        ) : null}

        {/* K7.3 — quick post-order rating. Hidden when the order is
            still queued offline (the temp id has nothing the server
            can attach a rating to until sync). */}
        <PostOrderRating
          orderId={order.order.id}
          queued={order.queued ?? false}
        />

        {/* Restart button with a countdown ring */}
        <div className="mt-12 inline-flex flex-col items-center gap-4">
          <CountdownRing fraction={fractionLeft}>
            <BigButton
              size="lg"
              variant="secondary"
              leadingIcon={<RotateCw className="h-6 w-6" />}
              onClick={handleRestart}
            >
              {lang === 'ar' ? 'طلب جديد' : 'Place another order'}
            </BigButton>
          </CountdownRing>
          <p
            className="text-sm font-semibold text-[var(--cup-muted)]"
            aria-live="polite"
          >
            {lang === 'ar'
              ? `هنرجع تلقائياً خلال ${secondsLeft} ثانية`
              : `Resetting in ${secondsLeft}s…`}
          </p>
        </div>
      </div>
    </main>
  );
}

// ── helpers ─────────────────────────────────────────────────────────────

/**
 * Decorative SVG ring that drains as `fraction` goes from 1 → 0. Wraps the
 * children so the ring sits behind the button without forcing the parent
 * to compute the geometry. Reduced-motion observers don't actually animate
 * — but the ring still drains since we re-render the strokeDashoffset on
 * each tick (it's not a CSS transition).
 */
function CountdownRing({
  fraction,
  children,
}: {
  fraction: number;
  children: React.ReactNode;
}) {
  const r = 110;
  const c = 2 * Math.PI * r;
  const dashOffset = c * (1 - fraction);
  return (
    <div className="relative inline-flex items-center justify-center p-3">
      <svg
        aria-hidden="true"
        width={2 * r + 24}
        height={2 * r + 24}
        viewBox={`0 0 ${2 * r + 24} ${2 * r + 24}`}
        className="absolute"
      >
        <circle
          cx={r + 12}
          cy={r + 12}
          r={r}
          stroke="var(--cup-stroke)"
          strokeWidth="4"
          fill="none"
        />
        <circle
          cx={r + 12}
          cy={r + 12}
          r={r}
          stroke="var(--cup-primary)"
          strokeWidth="4"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${r + 12} ${r + 12})`}
        />
      </svg>
      <div className="relative z-10">{children}</div>
    </div>
  );
}

/**
 * Coffee beans drifting up from the bottom of the screen on first paint.
 * Decorative — aria-hidden, position fixed, low opacity, doesn't capture
 * pointer events. 12 beans is the sweet spot for "festive but calm".
 */
function BeanConfetti() {
  const beans = Array.from({ length: 12 }, (_, i) => i);
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 overflow-hidden"
    >
      {beans.map((i) => {
        const left = (i * 8.3 + (i % 3) * 4) % 100;
        const delay = (i % 5) * 0.18;
        const duration = 4.5 + (i % 3) * 0.6;
        return (
          <motion.span
            key={i}
            initial={{ y: '110vh', opacity: 0, rotate: 0 }}
            animate={{ y: '-10vh', opacity: [0, 0.85, 0.85, 0], rotate: 220 }}
            transition={{ duration, delay, ease: 'easeOut' }}
            className="absolute h-3 w-2 rounded-full bg-[var(--cup-cocoa)]"
            style={{ left: `${left}%`, willChange: 'transform' }}
          />
        );
      })}
    </div>
  );
}
