'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { Heart, Star } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import type { Product } from '@/lib/types';
import { useT, pickName, formatPrice } from '@/lib/i18n';
import { cdnImage } from '@/lib/cdnImage';

interface ProductCardProps {
  product: Product;
  /** Optional override for the favorited state (defaults to local toggle). */
  initiallyFavorited?: boolean;
}

/**
 * Square-image product card. Heart icon top-right toggles a local favorite
 * state (server sync lands in Phase 2). The card scales to 0.98 on press
 * via Framer Motion, and the rating + price line keeps the brand's contrast.
 */
export function ProductCard({ product, initiallyFavorited = false }: ProductCardProps) {
  const { language } = useT();
  const reduce = useReducedMotion();
  const [favorited, setFavorited] = useState(initiallyFavorited);

  const name = pickName(product, language);
  const price = formatPrice(product.base_price_egp, language);
  // Phase 3.2: out-of-stock visual treatment. Either the staff toggle
  // (`is_out_of_stock`) OR a depleted `stock_count` triggers it.
  const outOfStock =
    product.is_out_of_stock === true ||
    (product.stock_count !== null && product.stock_count !== undefined && product.stock_count <= 0);

  return (
    <motion.div
      whileTap={reduce || outOfStock ? undefined : { scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      className={[
        'group relative overflow-hidden rounded-[20px] bg-white p-3 shadow-card transition-shadow',
        outOfStock ? '' : 'hover:shadow-elevated',
      ].join(' ')}
      aria-disabled={outOfStock || undefined}
    >
      <Link
        href={`/products/${product.id}`}
        aria-label={
          outOfStock ? `${name}, ${price} — out of stock` : `${name}, ${price}`
        }
        className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cup-primary)] focus-visible:ring-offset-2 rounded-[16px]"
      >
        <div className="relative aspect-square overflow-hidden rounded-2xl bg-white">
          <Image
            src={cdnImage(product, 'card')}
            alt=""
            width={400}
            height={400}
            className={[
              'h-full w-full rounded-2xl object-contain p-2 transition-transform duration-300',
              outOfStock ? 'grayscale opacity-50' : 'group-hover:scale-105',
            ].join(' ')}
          />
          {outOfStock && (
            <span
              className="absolute bottom-2 start-2 inline-flex items-center rounded-pill bg-[var(--cup-error)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-card"
              aria-hidden="true"
            >
              {language === 'ar' ? 'نفد' : 'Out of stock'}
            </span>
          )}
        </div>
        <div className="mt-3 px-1">
          <p className="line-clamp-1 font-heading text-sm font-semibold text-[var(--cup-espresso)]">
            {name}
          </p>
          <div className="mt-1.5 flex items-center justify-between">
            <span className="text-sm font-bold text-[var(--cup-primary)]">{price}</span>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--cup-cocoa)]">
              <Star size={12} aria-hidden="true" className="fill-[var(--cup-star)] stroke-[var(--cup-star)]" />
              {product.rating_avg.toFixed(1)}
            </span>
          </div>
        </div>
      </Link>

      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setFavorited((v) => !v);
        }}
        aria-label={favorited ? `Remove ${name} from favorites` : `Add ${name} to favorites`}
        aria-pressed={favorited}
        className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm shadow-subtle transition-transform active:scale-90 hover:bg-white"
      >
        <Heart
          size={16}
          className={
            favorited
              ? 'fill-[var(--cup-primary)] stroke-[var(--cup-primary)]'
              : 'stroke-[var(--cup-cocoa)]'
          }
          aria-hidden="true"
        />
      </button>
    </motion.div>
  );
}
