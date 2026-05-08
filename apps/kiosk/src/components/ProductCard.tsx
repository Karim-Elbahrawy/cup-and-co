'use client';

import Image from 'next/image';
import type { Product } from '@cup-and-co/types';
import type { KioskLang } from '@/lib/lang';

/**
 * Product tile for the kiosk catalog grid (K1.2).
 *
 * Three states the card explicitly handles:
 *   - in-stock        → full-colour, tap to open product detail (K1.3)
 *   - out-of-stock    → 50% opacity + 'Out today' pill, tap shows toast
 *   - unavailable     → hidden upstream (the catalog filter strips
 *                        is_available=false products)
 *
 * Layout is intentionally large: 280×360 minimum at 4-up on a 12.9" landscape
 * iPad. Image-first composition because the brand sells on craft, not copy.
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
        'group relative flex min-h-[360px] flex-col overflow-hidden rounded-card bg-white p-5 text-left shadow-card',
        'border border-[var(--cup-stroke)] transition-[transform,box-shadow] duration-150',
        'active:scale-[0.99] hover:shadow-elevated',
        isOut ? 'opacity-50' : '',
      ].join(' ')}
    >
      {/* Hero image */}
      <div className="relative mb-4 grid aspect-square place-items-center overflow-hidden rounded-2xl bg-[var(--cup-paper)]">
        <Image
          src={product.image_url}
          alt=""
          fill
          sizes="(min-width: 1280px) 22vw, 30vw"
          className="object-contain p-3"
        />
        {isOut ? (
          <span className="absolute right-3 top-3 rounded-pill bg-[var(--cup-error)] px-4 py-1.5 text-sm font-bold uppercase tracking-wider text-white">
            {lang === 'ar' ? 'نفد اليوم' : 'Out today'}
          </span>
        ) : null}
      </div>

      {/* Name + price */}
      <h3 className="font-heading text-k-card font-bold text-[var(--cup-espresso)] line-clamp-2">
        {name}
      </h3>
      <div className="mt-auto flex items-end justify-between pt-4">
        <span className="font-heading text-[28px] font-extrabold text-[var(--cup-primary)]">
          {product.base_price_egp} EGP
        </span>
        <span className="text-sm font-semibold text-[var(--cup-muted)]">
          ★ {product.rating_avg.toFixed(1)} · {product.prep_minutes}m
        </span>
      </div>
    </button>
  );
}
