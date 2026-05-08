'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ChevronLeft, Wallet, CreditCard, ArrowRight } from 'lucide-react';
import { BigButton } from '@/components/BigButton';
import {
  useCart,
  cartTotalEgp,
  cartItemCount,
  lineSubtotalEgp,
  type CartLine,
} from '@/lib/cart';
import { useLastOrder } from '@/lib/useLastOrder';
import { useIdleReset } from '@/lib/useIdleReset';
import { api, ApiError } from '@/lib/api';
import type { KioskLang } from '@/lib/lang';

/**
 * /checkout — K1.7 cash-flow checkout.
 *
 * Two columns on landscape:
 *   - Left: order summary (one row per cart line) + grand total
 *   - Right: payment-method selection — two big cards. "Pay at counter
 *     (cash)" is the only enabled option for K1.7. "Pay by card" is
 *     disabled with a "Coming soon" pill (replaced in K3 by Paymob terminal
 *     integration).
 *
 * On cash submit: POST /orders with paymentMethod: 'cash' + placement_source:
 * 'kiosk'. On 201 we stash the response in useLastOrder + navigate to
 * /confirmation. Errors stay on this screen with a retry-able message.
 *
 * Empty-cart guard preserved from the placeholder.
 */
export default function CheckoutPage() {
  const router = useRouter();
  const lines = useCart((s) => s.lines);
  const clearCart = useCart((s) => s.clear);
  const setLastOrder = useLastOrder((s) => s.set);
  const total = cartTotalEgp(lines);
  const itemCount = cartItemCount(lines);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lang = 'en' as KioskLang;

  useIdleReset({
    onIdle: () => {
      clearCart();
      router.replace('/');
    },
    timeoutMs: 90_000,
    enabled: !submitting, // Don't bounce mid-submit.
  });

  useEffect(() => {
    if (lines.length === 0) router.replace('/catalog');
  }, [lines.length, router]);

  if (lines.length === 0) return null;

  async function handleCash() {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await api.placeOrder({
        lines,
        paymentMethod: 'cash',
      });
      setLastOrder(response);
      // Empty the cart only AFTER the response is stashed — if we
      // cleared first and somehow the store write lost, the customer
      // would land on /confirmation with no order to render.
      clearCart();
      router.replace('/confirmation');
    } catch (e: unknown) {
      setError(
        e instanceof ApiError
          ? e.message
          : 'Could not place your order. Try again.',
      );
      setSubmitting(false);
    }
  }

  return (
    <main className="relative h-dvh w-dvw overflow-y-auto bg-[var(--cup-paper)] pb-12">
      {/* Header chrome */}
      <header className="flex items-center justify-between px-12 pt-8">
        <BigButton
          variant="secondary"
          leadingIcon={<ChevronLeft className="h-7 w-7" />}
          onClick={() => router.replace('/catalog')}
          disabled={submitting}
        >
          {lang === 'ar' ? 'العودة' : 'Back'}
        </BigButton>
        <div className="text-right">
          <p className="text-sm font-bold uppercase tracking-[0.4em] text-[var(--cup-muted)]">
            {lang === 'ar' ? 'إتمام الطلب' : 'Checkout'}
          </p>
          <h1 className="font-heading text-k-hero text-[var(--cup-espresso)]">
            {lang === 'ar' ? 'كيف تحب تدفع؟' : 'How will you pay?'}
          </h1>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-10 px-12 pt-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* ── Order summary ─────────────────────────────────────────── */}
        <section
          aria-label={lang === 'ar' ? 'ملخص الطلب' : 'Order summary'}
          className="rounded-card bg-white p-8 shadow-card"
        >
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-[var(--cup-muted)]">
            {lang === 'ar' ? 'الطلب' : 'Your order'}
          </p>
          <h2 className="mt-1 font-heading text-k-card text-[var(--cup-espresso)]">
            {itemCount} {itemCount === 1 ? 'item' : 'items'}
          </h2>

          <ul className="mt-6 divide-y divide-[var(--cup-stroke)]">
            {lines.map((line) => (
              <SummaryRow key={line.lineId} line={line} lang={lang} />
            ))}
          </ul>

          <div className="mt-6 flex items-baseline justify-between border-t border-[var(--cup-stroke)] pt-6">
            <span className="font-heading text-k-card text-[var(--cup-cocoa)]">
              {lang === 'ar' ? 'الإجمالي' : 'Total'}
            </span>
            <span className="font-heading text-[44px] font-extrabold text-[var(--cup-espresso)]">
              {total} EGP
            </span>
          </div>
        </section>

        {/* ── Payment method ────────────────────────────────────────── */}
        <section
          aria-label={lang === 'ar' ? 'طريقة الدفع' : 'Payment method'}
          className="space-y-4"
        >
          <PaymentCard
            icon={<Wallet className="h-10 w-10" />}
            title={lang === 'ar' ? 'الدفع عند الكاشير' : 'Pay at counter'}
            description={
              lang === 'ar'
                ? 'كاش — هات الإيصال للكاشير'
                : 'Cash — show the pickup code at the counter'
            }
            primary
            disabled={submitting}
            loading={submitting}
            onClick={handleCash}
          />

          <PaymentCard
            icon={<CreditCard className="h-10 w-10" />}
            title={lang === 'ar' ? 'الدفع بالكارت' : 'Pay by card'}
            description={
              lang === 'ar'
                ? 'تاب أو إدخال البطاقة'
                : 'Tap-to-pay or insert your card'
            }
            disabled
            badge={lang === 'ar' ? 'قريباً' : 'Coming soon'}
          />

          {error ? (
            <div
              role="alert"
              className="rounded-card bg-[var(--cup-error)]/10 p-5 text-base font-semibold text-[var(--cup-error)]"
            >
              {error}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}

// ── helpers ─────────────────────────────────────────────────────────────

function SummaryRow({ line, lang }: { line: CartLine; lang: KioskLang }) {
  const name = lang === 'ar' ? line.product.name_ar : line.product.name_en;
  const optsLine = line.options
    .map((o) => (lang === 'ar' ? o.nameAr : o.nameEn))
    .join(' · ');
  const subtotal = lineSubtotalEgp(line);
  return (
    <li className="flex items-center gap-5 py-4">
      <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-2xl bg-[var(--cup-paper)]">
        <Image
          src={line.product.image_url}
          alt=""
          fill
          sizes="64px"
          className="object-contain p-1.5"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-heading text-[20px] font-bold text-[var(--cup-espresso)] truncate">
          {line.quantity}× {name}
        </p>
        {optsLine ? (
          <p className="text-base text-[var(--cup-muted)] truncate">{optsLine}</p>
        ) : null}
      </div>
      <span className="font-heading text-[22px] font-extrabold text-[var(--cup-espresso)]">
        {subtotal} EGP
      </span>
    </li>
  );
}

function PaymentCard({
  icon,
  title,
  description,
  primary = false,
  disabled = false,
  loading = false,
  badge,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  primary?: boolean;
  disabled?: boolean;
  loading?: boolean;
  badge?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        'group relative flex min-h-[140px] w-full items-center gap-6 rounded-card p-6 text-left shadow-card transition',
        'active:scale-[0.99]',
        disabled
          ? 'opacity-60 pointer-events-none bg-white border border-[var(--cup-stroke)]'
          : primary
            ? 'bg-cup-primary text-white hover:bg-cup-primary-hover'
            : 'bg-white text-[var(--cup-espresso)] border border-[var(--cup-stroke)] hover:bg-[var(--cup-paper)]',
      ].join(' ')}
    >
      <span
        className={[
          'grid h-20 w-20 flex-shrink-0 place-items-center rounded-full',
          primary ? 'bg-white/15' : 'bg-[var(--cup-paper)]',
        ].join(' ')}
        aria-hidden="true"
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-heading text-k-card font-extrabold">
          {title}
        </span>
        <span
          className={[
            'block font-body text-base',
            primary ? 'text-white/85' : 'text-[var(--cup-muted)]',
          ].join(' ')}
        >
          {description}
        </span>
      </span>
      {badge ? (
        <span className="rounded-pill bg-[var(--cup-paper)] px-4 py-1.5 text-sm font-bold uppercase tracking-wider text-[var(--cup-muted)]">
          {badge}
        </span>
      ) : primary ? (
        <ArrowRight
          className={[
            'h-9 w-9 transition-transform',
            loading ? 'animate-pulse' : 'group-hover:translate-x-1',
          ].join(' ')}
          aria-hidden="true"
        />
      ) : null}
    </button>
  );
}
