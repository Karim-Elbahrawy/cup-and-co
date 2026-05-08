'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, X, ArrowRight } from 'lucide-react';
import {
  useCart,
  cartTotalEgp,
  cartItemCount,
  lineSubtotalEgp,
  type CartLine,
} from '@/lib/cart';
import { useCartDrawer } from '@/lib/useCartDrawer';
import { BigButton } from './BigButton';
import { QuantityStepper } from './QuantityStepper';
import type { KioskLang } from '@/lib/lang';

/**
 * Bottom-sheet cart drawer (K1.5).
 *
 * Behaviour:
 *   - Slides up to ~70vh from the bottom edge with Framer's spring tween
 *   - Backdrop covers the rest of the surface; tap to dismiss
 *   - Each row: image + name + line of option summary + quantity stepper +
 *     line subtotal. Trash icon removes the line outright (faster than
 *     stepping down to 0 — the kiosk values speed over ceremony).
 *   - Footer: subtotal + grand total + 'Checkout' CTA. (Tax/discount lines
 *     show only when non-zero — for K1.5 nothing populates them; K3 ships
 *     the offers + tip + tax engine.)
 *   - Empty state: replaces the rows with a friendly "Cart is empty"
 *     panel; checkout button stays disabled.
 *
 * The drawer is mounted unconditionally at the page level — the
 * AnimatePresence inside handles the actual show/hide so we keep one
 * stable React tree (avoids cart-state churn when the user reopens it).
 */

interface CartDrawerProps {
  lang?: KioskLang;
}

export function CartDrawer({ lang = 'en' as KioskLang }: CartDrawerProps) {
  const router = useRouter();
  const open = useCartDrawer((s) => s.open);
  const hide = useCartDrawer((s) => s.hide);
  const lines = useCart((s) => s.lines);
  const setQuantity = useCart((s) => s.setQuantity);
  const removeLine = useCart((s) => s.removeLine);
  const total = cartTotalEgp(lines);
  const count = cartItemCount(lines);

  // Auto-hide drawer if the cart drains to empty while it's open — better
  // UX than leaving an empty sheet hovering.
  useEffect(() => {
    if (open && lines.length === 0) {
      // Tiny delay so the customer sees the row vanish before the drawer
      // collapses (avoids a 'where did everything go?' beat).
      const id = window.setTimeout(() => hide(), 320);
      return () => window.clearTimeout(id);
    }
  }, [open, lines.length, hide]);

  function handleCheckout() {
    if (lines.length === 0) return;
    hide();
    router.push('/checkout');
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="cart-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          // role="dialog" + aria-modal would be nicer but iPad VoiceOver
          // handles a button-driven overlay well enough without focus
          // trapping; revisit in K5 (a11y polish).
          className="fixed inset-0 z-40 bg-[var(--cup-espresso)]/40"
          onClick={hide}
          aria-hidden="true"
        >
          <motion.section
            key="cart-sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 280 }}
            // Stop the click from bubbling to the overlay's dismiss handler.
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-x-0 bottom-0 z-50 mx-auto flex max-h-[78vh] w-full max-w-[1400px] flex-col rounded-t-[40px] bg-white shadow-elevated"
            aria-label={lang === 'ar' ? 'العربة' : 'Your order'}
          >
            {/* Header */}
            <header className="flex items-center justify-between border-b border-[var(--cup-stroke)] px-12 py-6">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.3em] text-[var(--cup-muted)]">
                  {lang === 'ar' ? 'طلبك' : 'Your order'}
                </p>
                <h2 className="font-heading text-k-hero text-[var(--cup-espresso)]">
                  {count} {count === 1 ? 'item' : 'items'}
                </h2>
              </div>
              <button
                type="button"
                onClick={hide}
                aria-label={lang === 'ar' ? 'أغلق' : 'Close cart'}
                className="grid h-16 w-16 place-items-center rounded-full bg-[var(--cup-paper)] text-[var(--cup-espresso)] transition active:scale-[0.94]"
              >
                <X className="h-8 w-8" strokeWidth={2.25} />
              </button>
            </header>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-12 py-6">
              {lines.length === 0 ? (
                <EmptyCart lang={lang} />
              ) : (
                <ul className="divide-y divide-[var(--cup-stroke)]">
                  {lines.map((line) => (
                    <CartLineRow
                      key={line.lineId}
                      line={line}
                      lang={lang}
                      onQuantityChange={(q) => setQuantity(line.lineId, q)}
                      onRemove={() => removeLine(line.lineId)}
                    />
                  ))}
                </ul>
              )}
            </div>

            {/* Footer */}
            <footer className="border-t border-[var(--cup-stroke)] bg-white px-12 pb-8 pt-6">
              <div className="mb-4 flex items-baseline justify-between">
                <span className="font-heading text-k-card text-[var(--cup-cocoa)]">
                  {lang === 'ar' ? 'الإجمالي' : 'Total'}
                </span>
                <span className="font-heading text-[44px] font-extrabold text-[var(--cup-espresso)]">
                  {total} EGP
                </span>
              </div>
              <BigButton
                size="xl"
                onClick={handleCheckout}
                disabled={lines.length === 0}
                trailingIcon={<ArrowRight className="h-7 w-7" />}
                className="w-full"
              >
                {lang === 'ar' ? 'إتمام الطلب' : 'CHECKOUT'}
              </BigButton>
            </footer>
          </motion.section>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

// ── helpers ─────────────────────────────────────────────────────────────

function CartLineRow({
  line,
  lang,
  onQuantityChange,
  onRemove,
}: {
  line: CartLine;
  lang: KioskLang;
  onQuantityChange: (next: number) => void;
  onRemove: () => void;
}) {
  const name = lang === 'ar' ? line.product.name_ar : line.product.name_en;
  const optionSummary = formatOptionsLine(line, lang);
  const subtotal = lineSubtotalEgp(line);

  return (
    <li className="flex items-center gap-5 py-5">
      <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-2xl bg-[var(--cup-paper)]">
        <Image
          src={line.product.image_url}
          alt=""
          fill
          sizes="96px"
          className="object-contain p-2"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-heading text-k-card font-bold text-[var(--cup-espresso)] truncate">
          {name}
        </p>
        {optionSummary ? (
          <p className="mt-1 text-base text-[var(--cup-muted)] truncate">
            {optionSummary}
          </p>
        ) : null}
        <p className="mt-2 text-base font-semibold text-[var(--cup-cocoa)]">
          {subtotal} EGP
        </p>
      </div>
      <QuantityStepper value={line.quantity} min={0} onChange={onQuantityChange} />
      <button
        type="button"
        onClick={onRemove}
        aria-label={lang === 'ar' ? 'إزالة' : 'Remove line'}
        className="grid h-12 w-12 place-items-center rounded-full text-[var(--cup-muted)] transition hover:bg-[var(--cup-paper)] hover:text-[var(--cup-error)] active:scale-[0.94]"
      >
        <Trash2 className="h-6 w-6" />
      </button>
    </li>
  );
}

function EmptyCart({ lang }: { lang: KioskLang }) {
  return (
    <div className="grid h-full place-items-center py-16 text-center">
      <div>
        <p className="font-heading text-k-card text-[var(--cup-muted)]">
          {lang === 'ar' ? 'العربة فاضية' : 'Your cart is empty'}
        </p>
        <p className="mt-2 text-base text-[var(--cup-muted)]">
          {lang === 'ar' ? 'اختر مشروب وابدأ' : 'Pick a drink to begin.'}
        </p>
      </div>
    </div>
  );
}

/**
 * Render the option summary line — "Medium · Less sugar · No ice".
 * Skips zero-delta defaults for groups that have an obvious baseline
 * (sugar/ice/milk) so the line stays readable. Size + shots always show.
 */
function formatOptionsLine(line: CartLine, lang: KioskLang): string {
  const parts = line.options
    .filter((o) => {
      // Hide the noisiest defaults — keeps the row scannable.
      if (
        (o.group === 'sugar' || o.group === 'ice' || o.group === 'milk') &&
        o.priceDeltaEgp === 0
      ) {
        // … but keep them if the option name carries info (e.g. 'Less ice'
        // is a 0-delta option that's still meaningful).
        const name = lang === 'ar' ? o.nameAr : o.nameEn;
        const lower = name.toLowerCase();
        return lower !== 'regular' && lower !== 'normal';
      }
      return true;
    })
    .map((o) => (lang === 'ar' ? o.nameAr : o.nameEn));
  return parts.join(' · ');
}
