'use client';

import Image from 'next/image';
import { Star, Clock } from 'lucide-react';
import type { Product } from '@cup-and-co/types';
import type { KioskLang } from '@/lib/lang';

/**
 * Product tile for the kiosk catalog grid.
 *
 * Hierarchy after the impeccable refine:
 *   1. Image dominates ~60% of the card height — the brand sells on craft.
 *   2. Product name is k-card weight 700 (28px), one line max with truncate.
 *   3. Price stands alone in terracotta. Rating + prep are secondary,
 *      kept on a subtle metadata row above the price so they never
 *      compete with the call-to-buy.
 *   4. "Out today" pill flips the whole card to a softer amber-tinted
 *      surface (not just opacity) so the message reads at a glance.
 *
 * Press feedback is GPU-only (active:scale + active:translate-y) — Framer
 * isn't worth the per-card cost on a 24-card grid.
 */

interface ProductCardProps {
  product: Product;
  lang: KioskLang;
  onTap: () => void;
}

export function ProductCard({ product, lang, onTap }: ProductCardProps) {
  const name = lang === 'ar' ? product.name_ar : product.name_en;
  const isOut = product.is_out_of_stock || product.stock_count === 0;

  return (
    <button
      type="button"
      onClick={onTap}
      aria-label={`${name}, ${product.base_price_egp} EGP${isOut ? ', out of stock today' : ''}`}
      aria-disabled={isOut || undefined}
      className={[
        'group relative flex min-h-[360px] flex-col overflow-hidden rounded-card p-4 text-left shadow-card',
        'border transition-[transform,box-shadow,background-color] duration-150',
        'active:scale-[0.985] active:translate-y-px hover:shadow-elevated',
        isOut
          ? 'bg-[var(--cup-warning)]/5 border-[var(--cup-warning)]/20 cursor-default'
          : 'bg-white border-[var(--cup-stroke)] cursor-pointer',
      ].join(' ')}
    >
      {/* Hero image — built for the new real-photo catalog. The cream
          backdrop sits behind a soft radial halo that picks up the
          product's brand-warm tone, then a subtle drop-shadow on the
          photo itself gives it a little 'lift' without faking a 3D
          render. The image scales 1.04x on hover (slow easing) which
          reads as 'inviting' on a kiosk where everything else is still. */}
      <div
        className={[
          'relative grid aspect-square place-items-center overflow-hidden rounded-[18px]',
          isOut ? 'bg-[var(--cup-warning)]/10' : 'bg-[var(--cup-paper)]',
        ].join(' ')}
      >
        {/* Soft warm halo — radial-gradient behind the photo so a
            transparent-cutout PNG reads as 'plated', and a flat-bg
            PNG still benefits from the gentle vignette around it. */}
        {isOut ? null : (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse at 50% 60%, rgba(254,243,199,0.65) 0%, rgba(250,246,240,0) 65%)',
            }}
          />
        )}

        <Image
          src={product.image_url}
          alt=""
          fill
          sizes="(min-width: 1280px) 22vw, 30vw"
          className={[
            'object-contain p-3 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]',
            isOut
              ? 'opacity-50 saturate-50'
              : 'group-hover:scale-[1.04] drop-shadow-[0_18px_24px_rgba(28,25,23,0.18)]',
          ].join(' ')}
        />

        {isOut ? (
          <span className="absolute end-3 top-3 rounded-pill bg-[var(--cup-warning)] px-3 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-subtle">
            {lang === 'ar' ? 'نفد اليوم' : 'Out today'}
          </span>
        ) : null}
      </div>

      {/* Name + metadata + price.
          Stack pushed to mt-auto so cards with shorter names don't pull
          the price up and break the grid alignment. */}
      <div className="mt-4 flex flex-1 flex-col gap-1.5">
        <h3 className="font-heading text-k-card font-bold leading-tight text-[var(--cup-espresso)] line-clamp-2">
          {name}
        </h3>

        {/* Metadata row — tiny, mid-tone, never competes with the price. */}
        <div className="flex items-center gap-3 text-sm font-semibold text-[var(--cup-muted)]">
          <span className="inline-flex items-center gap-1">
            <Star className="h-3.5 w-3.5 fill-[var(--cup-star)] text-[var(--cup-star)]" aria-hidden="true" />
            {product.rating_avg.toFixed(1)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            {product.prep_minutes}m
          </span>
        </div>

        {/* Price stands alone in terracotta. mt-auto pins it to bottom. */}
        <div className="mt-auto pt-3">
          <span
            className={[
              'font-heading text-[30px] font-extrabold tabular-nums',
              isOut ? 'text-[var(--cup-muted)]' : 'text-[var(--cup-primary)]',
            ].join(' ')}
          >
            {product.base_price_egp}
            <span className="ms-1 text-base font-bold tracking-wider text-[var(--cup-muted)]">EGP</span>
          </span>
        </div>
      </div>
    </button>
  );
}
