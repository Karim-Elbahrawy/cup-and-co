'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ChevronLeft, CreditCard, Wallet, Banknote } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useCart, cartSubtotal } from '@/lib/cart';
import { useT } from '@/lib/i18n';

type Fulfillment = 'pickup' | 'delivery';
type PaymentMethod = 'paymob_card' | 'paymob_wallet' | 'cash';

export default function CheckoutPage() {
  const router = useRouter();
  const { t, language } = useT();

  const items = useCart((s) => s.items);
  const redeemPoints = useCart((s) => s.redeemPoints);
  const clear = useCart((s) => s.clear);

  const [fulfillment, setFulfillment] = useState<Fulfillment>('pickup');
  const [scheduled, setScheduled] = useState<string>(''); // empty = ASAP
  const [payment, setPayment] = useState<PaymentMethod>('cash');
  const [notes, setNotes] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate next 4 quarter-hour slots
  const slots = useMemo(() => generateSlots(), []);

  useEffect(() => {
    if (items.length === 0) router.replace('/cart');
  }, [items.length, router]);

  const subtotal = cartSubtotal(items);
  const pointsDiscount = Math.min(Math.floor(redeemPoints / 100) * 5, subtotal);
  const total = Math.max(0, subtotal - pointsDiscount - couponDiscount);

  async function placeOrder() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.createOrder({
        fulfillmentType: fulfillment,
        paymentMethod: payment,
        scheduledFor: scheduled ? scheduled : null,
        redeemPoints,
        notes: notes || undefined,
        items: items.map((it) => ({
          productId: it.productId,
          quantity: it.quantity,
          options: it.options,
        })),
      });

      if (payment === 'cash') {
        clear();
        router.push(`/orders/${res.order.id}`);
        return;
      }

      // Card / Wallet — fetch Paymob intention then open checkout
      const intention = await api.paymobIntention(res.order.id, payment);
      clear();
      // Open in same window; on return the webhook will mark it paid.
      window.location.href = intention.checkoutUrl;
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to place order');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-cup-paper pb-32">
      <header className="sticky top-0 z-20 flex items-center justify-between bg-cup-paper/85 px-5 py-4 backdrop-blur-sm">
        <Link
          href="/cart"
          aria-label={t('common.back')}
          className="grid h-10 w-10 place-items-center rounded-full border border-cup-stroke bg-white shadow-subtle"
        >
          <ChevronLeft className="h-5 w-5 text-cup-brown-900" />
        </Link>
        <p className="font-heading text-base font-semibold text-cup-brown-900">
          {t('common.checkout')}
        </p>
        <span className="w-10" aria-hidden="true" />
      </header>

      <div className="mx-auto max-w-3xl space-y-5 px-5 pt-2">
        {/* Fulfillment */}
        <Section label={t('checkout.fulfillment')}>
          <Segmented
            value={fulfillment}
            onChange={(v) => setFulfillment(v as Fulfillment)}
            options={[
              { value: 'pickup', label: t('checkout.pickup') },
              { value: 'delivery', label: t('checkout.delivery') },
            ]}
          />
        </Section>

        {/* Time slot */}
        <Section label={t('checkout.pickupTime')}>
          <div className="flex flex-wrap gap-2">
            <SlotChip
              label={t('checkout.asap')}
              selected={scheduled === ''}
              onClick={() => setScheduled('')}
            />
            {slots.map((s) => (
              <SlotChip
                key={s.iso}
                label={s.label}
                selected={scheduled === s.iso}
                onClick={() => setScheduled(s.iso)}
              />
            ))}
          </div>
        </Section>

        {/* Payment method */}
        <Section label={t('checkout.paymentMethod')}>
          <div className="space-y-2">
            <PaymentCard
              icon={<CreditCard className="h-5 w-5" />}
              label={t('checkout.payWithCard')}
              selected={payment === 'paymob_card'}
              onClick={() => setPayment('paymob_card')}
            />
            <PaymentCard
              icon={<Wallet className="h-5 w-5" />}
              label={t('checkout.payWithWallet')}
              selected={payment === 'paymob_wallet'}
              onClick={() => setPayment('paymob_wallet')}
            />
            <PaymentCard
              icon={<Banknote className="h-5 w-5" />}
              label={t('checkout.payWithCash')}
              selected={payment === 'cash'}
              onClick={() => setPayment('cash')}
            />
          </div>
        </Section>

        {/* Notes */}
        <Section label={language === 'ar' ? 'ملاحظات' : 'Notes'}>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={language === 'ar' ? 'حساسية، طلبات خاصة…' : 'Allergies, special requests…'}
            rows={3}
            maxLength={500}
            className="w-full rounded-card border border-cup-stroke bg-white p-3 text-sm placeholder:text-cup-muted focus:border-cup-orange-600 focus:outline-none"
          />
        </Section>

        {/* Coupon */}
        <Section label={t('checkout.couponCode')}>
          <div className="flex gap-2">
            <input
              value={couponCode}
              onChange={(e) => {
                setCouponCode(e.target.value);
                setCouponDiscount(0);
              }}
              placeholder={t('checkout.enterCode')}
              className="flex-1 rounded-lg border border-cup-stroke bg-white px-3 py-2 text-sm placeholder:text-cup-muted focus:border-cup-orange-600 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => {
                // Phase 5 MVP: client-side placeholder. Wire to /coupons/validate in Phase 6.
                if (couponCode.trim().toUpperCase() === 'STUDENT15') {
                  setCouponDiscount(Math.floor(subtotal * 0.15));
                } else {
                  setCouponDiscount(0);
                  setError(language === 'ar' ? 'كود غير صالح' : 'Invalid coupon code');
                }
              }}
              className="rounded-pill bg-cup-orange-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-cup-orange-700"
            >
              {t('checkout.apply')}
            </button>
          </div>
        </Section>

        {/* Summary */}
        <section className="rounded-card border border-cup-stroke bg-white p-5 shadow-subtle">
          <Row label={t('cart.subtotal')} value={`EGP ${subtotal}`} />
          {pointsDiscount > 0 && (
            <Row label={t('cart.discount')} value={`- EGP ${pointsDiscount}`} color="text-cup-success" />
          )}
          {couponDiscount > 0 && (
            <Row label={t('checkout.couponDiscount')} value={`- EGP ${couponDiscount}`} color="text-cup-success" />
          )}
          <hr className="my-2 border-cup-stroke" />
          <Row label={t('cart.total')} value={`EGP ${total}`} bold />
        </section>

        {error && (
          <div role="alert" className="rounded-card border border-cup-error bg-white p-3 text-sm text-cup-error">
            {error}
          </div>
        )}
      </div>

      {/* Sticky place-order */}
      <div
        className="fixed inset-x-0 bottom-0 z-30 border-t border-cup-stroke bg-white/95 px-6 py-4 backdrop-blur"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        <button
          type="button"
          onClick={placeOrder}
          disabled={submitting}
          className="mx-auto flex w-full max-w-3xl items-center justify-center rounded-pill bg-cup-orange-600 px-6 py-4 font-heading text-base font-semibold text-white shadow-[0_8px_24px_rgba(194,65,12,0.28)] transition active:scale-[0.98] disabled:opacity-70"
        >
          {submitting ? 'Placing order…' : `${t('checkout.placeOrder')} — EGP ${total}`}
        </button>
      </div>
    </main>
  );
}

function generateSlots(): { iso: string; label: string }[] {
  const out: { iso: string; label: string }[] = [];
  const now = new Date();
  // Round up to next quarter hour
  const minute = now.getMinutes();
  const offset = 15 - (minute % 15);
  now.setMinutes(minute + offset, 0, 0);
  for (let i = 0; i < 4; i++) {
    const slot = new Date(now.getTime() + i * 15 * 60 * 1000);
    out.push({
      iso: slot.toISOString(),
      label: slot.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });
  }
  return out;
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-cup-muted">
        {label}
      </p>
      {children}
    </section>
  );
}

function Segmented({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex rounded-pill border border-cup-stroke bg-white p-1 shadow-subtle">
      {options.map((opt) => {
        const isSelected = opt.value === value;
        return (
          <motion.button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            whileTap={{ scale: 0.96 }}
            animate={{
              backgroundColor: isSelected ? '#C2410C' : 'transparent',
              color: isSelected ? '#FFFFFF' : '#1C1917',
            }}
            transition={{ type: 'spring', stiffness: 360, damping: 24 }}
            className="flex-1 rounded-pill px-4 py-2 text-sm font-semibold"
          >
            {opt.label}
          </motion.button>
        );
      })}
    </div>
  );
}

function SlotChip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.95 }}
      animate={{
        backgroundColor: selected ? '#C2410C' : '#FEF3C7',
        color: selected ? '#FFFFFF' : '#1C1917',
      }}
      className="rounded-pill px-4 py-2 text-sm font-semibold shadow-subtle"
    >
      {label}
    </motion.button>
  );
}

function PaymentCard({
  icon,
  label,
  selected,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.99 }}
      className={`flex w-full items-center gap-3 rounded-card border-2 p-4 text-left text-sm font-semibold transition ${
        selected
          ? 'border-cup-orange-600 bg-[var(--cup-cream)] text-cup-brown-900 shadow-card'
          : 'border-cup-stroke bg-white text-cup-brown-700 hover:border-cup-orange-600/40'
      }`}
      aria-pressed={selected}
    >
      <span className={`grid h-9 w-9 place-items-center rounded-full ${selected ? 'bg-cup-orange-600 text-white' : 'bg-cup-paper text-cup-brown-900'}`}>
        {icon}
      </span>
      <span>{label}</span>
    </motion.button>
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
