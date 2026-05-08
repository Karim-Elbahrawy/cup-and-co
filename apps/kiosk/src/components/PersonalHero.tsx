'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { Repeat, Star, ArrowRight } from 'lucide-react';
import type { Product } from '@cup-and-co/types';
import type { CartLineOption } from '@/lib/cart';
import type { KioskLang } from '@/lib/lang';

/**
 * K4.8 / K4.10 — personal hero card for identified members.
 *
 * Two flavours, picked by the parent based on what the API returned:
 *   - "Your usual" (K4.10) — one-tap reorder with preferred options
 *     pre-applied. Tap the big CTA → product drops directly into cart
 *     (skips the customize screen).
 *   - "Try this" (K4.8)   — smart suggestion from /me/suggestion. Tap
 *     opens the customize screen.
 *
 * Visually distinct from FeaturedHero: teal accent gradient (the
 * "personal" color in the brand) instead of sunrise. Member-only —
 * the parent only renders this when useIdentified.customer is set.
 */

interface PersonalHeroBaseProps {
  lang: KioskLang;
  imageUrl: string;
  productNameEn: string;
  productNameAr: string;
  basePriceEgp: number;
}

interface UsualProps extends PersonalHeroBaseProps {
  variant: 'usual';
  /** How many times the customer's ordered this in the last 60 days. */
  orderCount: number;
  /** One-tap add-to-cart with preferred options pre-applied. */
  onReorder: () => void;
}

interface SuggestionProps extends PersonalHeroBaseProps {
  variant: 'suggestion';
  reason: 'history' | 'season' | 'bestseller';
  /** Tap opens the customize detail screen. */
  onTap: () => void;
}

export type PersonalHeroProps = UsualProps | SuggestionProps;

export function PersonalHero(props: PersonalHeroProps) {
  const { lang, imageUrl, productNameEn, productNameAr, basePriceEgp } = props;
  const name = lang === 'ar' ? productNameAr : productNameEn;

  const tag =
    props.variant === 'usual'
      ? lang === 'ar'
        ? 'المعتاد'
        : 'Your usual'
      : lang === 'ar'
        ? 'جرّب ده'
        : 'Try this';

  const subtitle =
    props.variant === 'usual'
      ? lang === 'ar'
        ? `طلبته ${props.orderCount} مرة`
        : `Ordered ${props.orderCount} times`
      : reasonLabel(props.reason, lang);

  return (
    <motion.button
      type="button"
      onClick={props.variant === 'usual' ? props.onReorder : props.onTap}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut', delay: 0.05 }}
      className="group relative col-span-2 overflow-hidden rounded-card text-left shadow-elevated transition active:scale-[0.99] md:col-span-3 xl:col-span-4"
    >
      {/* Teal-accent frame — personal/member color, distinct from sunrise. */}
      <div
        className="relative flex min-h-[240px] items-stretch p-1.5"
        style={{
          background:
            'linear-gradient(135deg, var(--cup-accent) 0%, #2DD4BF 100%)',
        }}
      >
        <div className="grid w-full grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-6 rounded-card bg-white p-7">
          <div className="flex min-w-0 flex-col justify-between">
            <div>
              <span className="inline-flex items-center gap-2 rounded-pill bg-cup-accent/10 px-4 py-1.5 text-sm font-bold uppercase tracking-[0.18em] text-cup-accent">
                <span aria-hidden="true">
                  {props.variant === 'usual' ? (
                    <Repeat className="h-4 w-4" />
                  ) : (
                    <Star className="h-4 w-4" />
                  )}
                </span>
                {tag}
              </span>
              <h2 className="mt-3 font-heading text-[44px] font-extrabold leading-tight text-[var(--cup-espresso)]">
                {name}
              </h2>
              <p className="mt-2 text-base font-semibold text-[var(--cup-muted)]">
                {subtitle}
              </p>
            </div>
            <div className="mt-5 flex items-center justify-between gap-4">
              <span className="font-heading text-[36px] font-extrabold text-cup-accent">
                {basePriceEgp} EGP
              </span>
              <span className="inline-flex items-center gap-2 rounded-pill bg-cup-accent px-6 py-3 font-heading text-k-card font-bold text-white transition group-hover:bg-cup-accent-hover">
                {props.variant === 'usual'
                  ? lang === 'ar' ? 'أضف للطلب' : 'Reorder'
                  : lang === 'ar' ? 'خصّص' : 'Customize'}
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </span>
            </div>
          </div>

          <div className="relative grid place-items-center overflow-hidden rounded-2xl bg-[var(--cup-paper)]">
            <Image
              src={imageUrl}
              alt=""
              fill
              sizes="(min-width: 1280px) 28vw, 40vw"
              className="object-contain p-4"
            />
          </div>
        </div>
      </div>
    </motion.button>
  );
}

function reasonLabel(
  reason: 'history' | 'season' | 'bestseller',
  lang: KioskLang,
): string {
  if (reason === 'history') {
    return lang === 'ar' ? 'بناءً على طلباتك السابقة' : 'Based on your history';
  }
  if (reason === 'season') {
    return lang === 'ar' ? 'مناسب للجو' : 'A good pick today';
  }
  return lang === 'ar' ? 'الأكثر مبيعاً' : "Today's bestseller";
}

/**
 * Resolve a "usual" payload back into cart-line options that the cart
 * store accepts. Returns null when the catalog row that backs the usual
 * is missing, the option group is unrecognized, or the preferred option
 * value can't be matched to a real ProductOption — in any of those cases
 * we'd rather skip the one-tap reorder than drop a malformed line.
 */
export function buildCartOptionsFromUsual(
  preferred: Record<string, string>,
  options: { group_name: string; id: string; name_en: string; name_ar: string; price_delta_egp: number }[],
): CartLineOption[] | null {
  const out: CartLineOption[] = [];
  for (const [group, optionName] of Object.entries(preferred)) {
    const match = options.find(
      (o) => o.group_name === group && (o.name_en === optionName || o.name_ar === optionName),
    );
    if (!match) return null;
    out.push({
      group: match.group_name as CartLineOption['group'],
      optionId: match.id,
      nameEn: match.name_en,
      nameAr: match.name_ar,
      priceDeltaEgp: match.price_delta_egp,
    });
  }
  return out;
}
