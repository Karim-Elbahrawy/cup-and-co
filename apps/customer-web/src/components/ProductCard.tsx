'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { Heart, Star } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import type { Product } from '@/lib/types';
import { useT, pickName, formatPrice } from '@/lib/i18n';

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
  const isOutOfStock = product.stock_count !== null && product.stock_count <= 0;

  return (
    <motion.div
      whileTap={reduce ? undefined : { scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      className="group relative overflow-hidden rounded-[20px] bg-white p-3 shadow-card transition-shadow hover:shadow-elevated"
    >
      <Link
        href={`/products/${product.id}`}
        aria-label={`${name}, ${price}${isOutOfStock ? ', out of stock' : ''}`}
        className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cup-primary)] focus-visible:ring-offset-2 rounded-[16px]"
      >
        <div className="relative aspect-square overflow-hidden rounded-2xl bg-white">
          <Image
            src={product.image_url}
            alt=""
            width={300}
            height={300}
            className={`h-full w-full rounded-2xl object-contain p-2 transition-transform duration-300 group-hover:scale-105 ${isOutOfStock ? 'opacity-40' : ''}`}
          />
          {isOutOfStock && (
            <div className="absolute inset-0 flex items-end justify-center rounded-2xl pb-3">
              <span className="rounded-full bg-rose-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-rose-600 ring-1 ring-rose-200">
                Out of stock
              </span>
            </div>
          )}
        </div>
        <div className="mt-3 px-1">
          <p className="line-clamp-1 font-heading text-sm font-semibold text-[var(--cup-espresso)]">
            {name}
          </p>
          <div className="mt-1.5 flex items-center justify-between">
            <span className={`text-sm font-bold ${isOutOfStock ? 'text-cup-muted line-through' : 'text-[var(--cup-primary)]'}`}>
              {price}
            </span>
            {product.review_mode === 'full' && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--cup-cocoa)]">
                <Star size={12} aria-hidden="true" className="fill-[var(--cup-star)] stroke-[var(--cup-star)]" />
                {product.rating_avg.toFixed(1)}
              </span>
            )}
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
