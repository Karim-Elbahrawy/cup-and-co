'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, X, ArrowRight, Sparkles, Star } from 'lucide-react';
import {
  useCart,
  cartTotalEgp,
  cartItemCount,
  lineSubtotalEgp,
  type CartLine,
} from '@/lib/cart';
import { useCartDrawer } from '@/lib/useCartDrawer';
import { useIdentified } from '@/lib/useIdentified';
import { BigButton } from './BigButton';
import { QuantityStepper } from './QuantityStepper';
import { IdentifyModal } from './IdentifyModal';
import { ComboSuggestions } from './ComboSuggestions';
import type { KioskLang } from '@/lib/lang';
import type { Product } from '@cup-and-co/types';

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
  /**
   * K4.9 — pre-computed combo suggestions (1–2 products). Parent owns
   * this so the drawer doesn't need access to the catalog. Empty array
   * hides the section entirely.
   */
  comboSuggestions?: Product[];
  /** Called when a combo card is tapped — parent adds with default options. */
  onAddCombo?: (product: Product) => void;
}

export function CartDrawer({
  lang = 'en' as KioskLang,
  comboSuggestions = [],
  onAddCombo,
}: CartDrawerProps) {
  const router = useRouter();
  const open = useCartDrawer((s) => s.open);
  const hide = useCartDrawer((s) => s.hide);
  const lines = useCart((s) => s.lines);
  const setQuantity = useCart((s) => s.setQuantity);
  const removeLine = useCart((s) => s.removeLine);
  const total = cartTotalEgp(lines);
  const count = cartItemCount(lines);
  const identified = useIdentified((s) => s.customer);
  const [identifyOpen, setIdentifyOpen] = useState(false);

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

            {/* Footer.
                Refine: combo + identify pill belong on a soft paper
                surface, separate from the high-contrast total + checkout
                row. The customer's eye reads (1) combo upsell, (2) tier
                badge or earn-points opt-in, then commits with (3) the
                terracotta CTA. Visual border between the two layers. */}
            <footer className="bg-white">
              {/* Upper layer — soft paper, holds the optional rows. */}
              {(onAddCombo && comboSuggestions.length > 0) ||
              identified ||
              lines.length > 0 ? (
                <div className="border-t border-[var(--cup-stroke)] bg-[var(--cup-paper)] px-12 pt-5 pb-2">
                  {onAddCombo ? (
                    <ComboSuggestions
                      products={comboSuggestions}
                      lang={lang}
                      onAdd={onAddCombo}
                    />
                  ) : null}

                  {identified ? (
                    <IdentifiedRow customer={identified} lang={lang} />
                  ) : lines.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => setIdentifyOpen(true)}
                      className="mb-4 flex w-full items-center justify-between gap-3 rounded-pill border-2 border-dashed border-cup-primary/40 bg-white px-5 py-3 text-start transition active:scale-[0.99]"
                    >
                      <span className="flex items-center gap-3">
                        <span className="grid h-10 w-10 place-items-center rounded-full bg-cup-primary text-white">
                          <Sparkles className="h-5 w-5" />
                        </span>
                        <span>
                          <span className="block font-heading text-[20px] font-bold text-[var(--cup-espresso)]">
                            {lang === 'ar' ? 'جمّع نقاط؟' : 'Earn points?'}
                          </span>
                          <span className="block text-sm text-[var(--cup-muted)]">
                            {lang === 'ar'
                              ? 'دوس وأكّد رقمك في ٣٠ ثانية'
                              : 'Tap to identify in 30 seconds'}
                          </span>
                        </span>
                      </span>
                      <ArrowRight className="h-6 w-6 text-cup-primary rtl:rotate-180" />
                    </button>
                  ) : null}
                </div>
              ) : null}

              {/* Lower layer — total + checkout, the commit row. */}
              <div className="border-t border-[var(--cup-stroke)] px-12 pb-8 pt-5">
                <div className="mb-4 flex items-baseline justify-between gap-4">
                  <span className="font-heading text-[18px] font-bold uppercase tracking-[0.18em] text-[var(--cup-muted)]">
                    {lang === 'ar' ? 'الإجمالي' : 'Total'}
                  </span>
                  <span className="font-heading text-[44px] font-extrabold leading-none tabular-nums text-[var(--cup-espresso)]">
                    {total}
                    <span className="ms-1 text-[18px] font-bold tracking-wider text-[var(--cup-muted)]">EGP</span>
                  </span>
                </div>
                <BigButton
                  size="xl"
                  onClick={handleCheckout}
                  disabled={lines.length === 0}
                  trailingIcon={<ArrowRight className="h-7 w-7 rtl:rotate-180" />}
                  className="w-full"
                >
                  {lang === 'ar' ? 'إتمام الطلب' : 'Checkout'}
                </BigButton>
              </div>
            </footer>
          </motion.section>

          <IdentifyModal
            open={identifyOpen}
            onClose={() => setIdentifyOpen(false)}
          />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

// ── helpers ─────────────────────────────────────────────────────────────

const TIER_LABEL = {
  bronze: { en: 'Bronze', ar: 'برونزي', from: '#C58A50', to: '#7A5028' },
  silver: { en: 'Silver', ar: 'فضي', from: '#C0C5CC', to: '#7B838C' },
  gold: { en: 'Gold', ar: 'ذهبي', from: '#F0C75A', to: '#A37A1A' },
} as const;

function IdentifiedRow({
  customer,
  lang,
}: {
  customer: { name: string | null; tier: 'bronze' | 'silver' | 'gold' | null; pointsBalance: number };
  lang: KioskLang;
}) {
  const tier = customer.tier ?? 'bronze';
  const tierStyle = TIER_LABEL[tier];
  return (
    <div className="mb-4 flex items-center gap-3 rounded-pill bg-[var(--cup-accent-tint)] px-5 py-3">
      <span
        className="grid h-10 w-10 place-items-center rounded-full text-white shadow-subtle"
        style={{
          background: `linear-gradient(135deg, ${tierStyle.from}, ${tierStyle.to})`,
        }}
        aria-hidden="true"
      >
        <Star className="h-5 w-5" />
      </span>
      <span className="flex-1">
        <span className="block font-heading text-[18px] font-bold text-[var(--cup-espresso)]">
          {customer.name
            ? lang === 'ar' ? `أهلاً ${customer.name}` : `Hi, ${customer.name}`
            : lang === 'ar' ? 'أهلاً بيك' : 'You are signed in'}
        </span>
        <span className="block text-sm text-[var(--cup-cocoa)]">
          {lang === 'ar' ? tierStyle.ar : tierStyle.en} ·{' '}
          {customer.pointsBalance}{' '}
          {lang === 'ar' ? 'نقطة' : 'pts'}
        </span>
      </span>
    </div>
  );
}

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
