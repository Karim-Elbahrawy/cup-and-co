'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Minus, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCart, lineKey, cartSubtotal, type CartItem } from '@/lib/cart';
import { api } from '@/lib/api';
import { useT } from '@/lib/i18n';

export default function CartPage() {
  const router = useRouter();
  const { t, language } = useT();
  const items = useCart((s) => s.items);
  const redeemPoints = useCart((s) => s.redeemPoints);
  const updateQuantity = useCart((s) => s.updateQuantity);
  const remove = useCart((s) => s.remove);
  const setRedeemPoints = useCart((s) => s.setRedeemPoints);

  const [pointsBalance, setPointsBalance] = useState(0);
  const [discountAvailable, setDiscountAvailable] = useState(0);

  useEffect(() => {
    let cancelled = false;
    api
      .loyalty()
      .then((r) => {
        if (cancelled) return;
        setPointsBalance(r.balance);
        setDiscountAvailable(r.discountAvailableEgp);
      })
      .catch(() => {
        // Silent — cart still works without loyalty data.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const subtotal = cartSubtotal(items);
  // 100 points = 5 EGP per the loyalty rules
  const pointsToEgp = (p: number) => Math.floor(p / 100) * 5;
  const discount = Math.min(pointsToEgp(redeemPoints), subtotal);
  const total = Math.max(0, subtotal - discount);

  const maxRedeemPoints = Math.min(pointsBalance, Math.floor(subtotal / 5) * 100);
  const showRedeem = pointsBalance >= 100 && subtotal >= 5;

  if (items.length === 0) {
    return (
      <main className="min-h-screen bg-cup-paper px-6 pt-6 pb-24">
        <CartHeader t={t} />
        <div className="mx-auto mt-16 max-w-sm rounded-card border border-cup-stroke bg-white p-8 text-center shadow-card">
          <Image
            src="/brand/empty-cart.svg"
            alt=""
            width={140}
            height={140}
            className="mx-auto"
          />
          <h2 className="mt-4 font-heading text-xl font-bold text-cup-brown-900">
            {t('cart.emptyCart')}
          </h2>
          <p className="mt-1 text-sm text-cup-muted">{t('cart.emptyCartMessage')}</p>
          <Link
            href="/"
            className="mt-5 inline-block rounded-pill bg-cup-orange-600 px-6 py-2.5 text-sm font-semibold text-white shadow-subtle"
          >
            {t('cart.browseMenu')}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-cup-paper pb-32">
      <CartHeader t={t} />

      <ul className="mx-auto max-w-7xl space-y-3 px-4">
        <AnimatePresence initial={false}>
          {items.map((item) => (
            <motion.li
              key={lineKey(item)}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -120 }}
              transition={{ type: 'spring', stiffness: 280, damping: 26 }}
              className="flex gap-3 rounded-card border border-cup-stroke bg-white p-3 shadow-subtle"
            >
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-card bg-white">
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt={item.productNameEn}
                    fill
                    sizes="80px"
                    className="rounded-card object-cover"
                  />
                ) : null}
              </div>
              <div className="flex flex-1 flex-col">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-heading text-sm font-semibold text-cup-brown-900">
                    {language === 'ar' ? item.productNameAr : item.productNameEn}
                  </p>
                  <button
                    type="button"
                    onClick={() => remove(lineKey(item))}
                    aria-label="Remove from cart"
                    className="text-cup-muted hover:text-cup-error"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {Object.keys(item.options).length > 0 && (
                  <p className="mt-0.5 text-xs text-cup-muted">
                    {formatOptions(item.options, language)}
                  </p>
                )}
                <div className="mt-auto flex items-center justify-between pt-2">
                  <CartQuantityStepper
                    quantity={item.quantity}
                    onChange={(q) => updateQuantity(lineKey(item), q)}
                  />
                  <p className="font-heading text-sm font-semibold text-cup-orange-700">
                    EGP {item.unitPriceEgp * item.quantity}
                  </p>
                </div>
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      {showRedeem && (
        <section className="mx-auto mt-5 max-w-7xl rounded-card border border-cup-stroke bg-white p-5 shadow-subtle">
          <div className="flex items-baseline justify-between">
            <p className="text-sm font-semibold text-cup-brown-900">
              {t('cart.redeemPoints')}
            </p>
            <p className="text-xs text-cup-muted">
              {pointsBalance.toLocaleString()} {t('cart.pointsAvailable')}
            </p>
          </div>
          <input
            type="range"
            min={0}
            max={maxRedeemPoints}
            step={100}
            value={redeemPoints}
            onChange={(e) => setRedeemPoints(Number(e.target.value))}
            className="mt-3 w-full accent-[var(--cup-primary)]"
            aria-label="Points to redeem"
          />
          <div className="mt-2 flex items-baseline justify-between text-xs">
            <span className="text-cup-muted">
              {redeemPoints} pts → {pointsToEgp(redeemPoints)} EGP off
            </span>
            <button
              type="button"
              onClick={() => setRedeemPoints(0)}
              className="text-cup-muted underline"
            >
              {t('common.cancel')}
            </button>
          </div>
          <p className="mt-2 text-[10px] text-cup-muted">
            (Max usable for this order: {maxRedeemPoints} pts = {pointsToEgp(maxRedeemPoints)} EGP)
          </p>
          <div className="mt-3 flex items-center gap-2 rounded-card bg-cup-paper px-3 py-2 text-[11px] font-medium text-cup-muted">
            <span aria-hidden="true">💡</span>
            <span>Discount cap: {discountAvailable} EGP available across all orders today.</span>
          </div>
        </section>
      )}

      {/* Totals */}
      <section className="mx-auto mt-5 max-w-7xl rounded-card border border-cup-stroke bg-white p-5 shadow-subtle">
        <Row label={t('cart.subtotal')} value={`EGP ${subtotal}`} />
        {discount > 0 && (
          <Row
            label={t('cart.discount')}
            value={`- EGP ${discount}`}
            color="text-cup-success"
          />
        )}
        <hr className="my-2 border-cup-stroke" />
        <Row label={t('cart.total')} value={`EGP ${total}`} bold />
      </section>

      {/* Sticky checkout bar */}
      <div
        className="fixed inset-x-0 bottom-0 z-50 border-t border-cup-stroke bg-white/95 px-6 py-4 backdrop-blur"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        <button
          type="button"
          onClick={() => router.push('/checkout')}
          className="mx-auto flex w-full max-w-3xl items-center justify-between rounded-pill bg-cup-orange-600 px-6 py-4 font-heading text-base font-semibold text-white shadow-[0_8px_24px_rgba(194,65,12,0.28)] transition active:scale-[0.98]"
        >
          <span>{t('common.checkout')}</span>
          <span>EGP {total}</span>
        </button>
      </div>
    </main>
  );
}

function CartHeader({ t }: { t: (k: string) => string }) {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between bg-cup-paper/85 px-5 py-4 backdrop-blur-sm">
      <Link
        href="/"
        aria-label={t('common.back')}
        className="grid h-10 w-10 place-items-center rounded-full border border-cup-stroke bg-white shadow-subtle"
      >
        <ChevronLeft className="h-5 w-5 text-cup-brown-900" />
      </Link>
      <h1 className="font-heading text-base font-semibold text-cup-brown-900">
        {t('cart.myCart')}
      </h1>
      <span className="w-10" aria-hidden="true" />
    </header>
  );
}

const OPTION_LABELS_AR: Record<string, string> = {
  small: 'صغير', medium: 'وسط', large: 'كبير',
  none: 'بدون', less: 'أقل', normal: 'عادي', extra: 'إضافي',
};

function formatOptions(options: Record<string, string>, language: 'en' | 'ar'): string {
  const order = ['size', 'sugar', 'ice', 'milk', 'extras'];
  const sorted = Object.entries(options).sort(
    ([a], [b]) => (order.indexOf(a) === -1 ? 99 : order.indexOf(a)) - (order.indexOf(b) === -1 ? 99 : order.indexOf(b)),
  );
  return sorted
    .map(([, v]) => (language === 'ar' ? OPTION_LABELS_AR[v.toLowerCase()] ?? v : v))
    .join(' · ');
}

function CartQuantityStepper({
  quantity,
  onChange,
}: {
  quantity: number;
  onChange: (q: number) => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-pill bg-cup-paper p-1">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, quantity - 1))}
        aria-label="Decrease"
        className="grid h-7 w-7 place-items-center rounded-full bg-white text-cup-brown-900 shadow-subtle"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className="w-5 text-center text-sm font-semibold tabular-nums">{quantity}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(20, quantity + 1))}
        aria-label="Increase"
        className="grid h-7 w-7 place-items-center rounded-full bg-cup-orange-600 text-white shadow-subtle"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function Row({
  label,
  value,
  bold,
  color,
}: {
  label: string;
  value: string;
  bold?: boolean;
  color?: string;
}) {
  return (
    <div className="flex items-baseline justify-between">
      <span className={`text-sm ${bold ? 'font-heading font-bold text-cup-brown-900' : 'text-cup-muted'}`}>
        {label}
      </span>
      <span
        className={`${bold ? 'font-heading text-lg font-bold text-cup-orange-700' : 'text-sm font-semibold text-cup-brown-900'} ${color ?? ''}`}
      >
        {value}
      </span>
    </div>
  );
}

// CartItem import is required so TS doesn't tree-shake it (used implicitly via store type).
void ({} as CartItem);
