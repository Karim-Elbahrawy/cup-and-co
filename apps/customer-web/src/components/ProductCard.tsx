'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { Heart, Star } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import type { Product } from '@/lib/types';
import { useT, pickName, formatPrice } from '@/lib/i18n';
import { api } from '@/lib/api';

interface ProductCardProps {
  product: Product;
  /** Optional override for the favorited state (defaults to local toggle). */
  initiallyFavorited?: boolean;
}

/**
 * Product card for the customer-facing grid.
 *
 * Image rendering: the image container uses a padding-bottom trick
 * (`pb-[100%]`) as the most reliable cross-browser aspect-ratio enforcer.
 * A nested `absolute inset-0` div is the actual `position: relative`
 * context for Next.js `<Image fill>` — separating sizing from clipping.
 *
 * Padding inside the image is done via inline `style` on the <Image> so
 * it is never dropped by Tailwind's JIT purge pass.
 */
export function ProductCard({ product, initiallyFavorited = false }: ProductCardProps) {
  const { language } = useT();
  const reduce = useReducedMotion();
  const [favorited, setFavorited] = useState(initiallyFavorited);
  const [favPending, setFavPending] = useState(false);

  const name = pickName(product, language);
  const price = formatPrice(product.base_price_egp, language);
  const isOutOfStock = product.stock_count !== null && product.stock_count <= 0;

  return (
    <motion.div
      whileHover={reduce ? undefined : { y: -3 }}
      whileTap={reduce ? undefined : { scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      className="group relative overflow-visible rounded-[20px] bg-white shadow-card transition-shadow hover:shadow-elevated"
    >
      <Link
        href={`/products/${product.id}`}
        aria-label={`${name}, ${price}${isOutOfStock ? ', out of stock' : ''}`}
        className="block overflow-hidden rounded-[20px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cup-primary)] focus-visible:ring-offset-2"
      >
        {/* ── Image zone ───────────────────────────────────────────────────
            pb-[100%] makes the row 1:1 square regardless of the child.
            The inner absolute-positioned div is the `relative` context that
            Next.js `fill` needs — overflow-hidden clips the hover scale.    */}
        <div className="relative w-full pb-[100%] rounded-t-[20px] overflow-hidden bg-[#F7F5F2]">
          <div className="absolute inset-0">
            <Image
              src={product.image_url}
              alt=""
              fill
              sizes="(min-width: 1280px) 16vw, (min-width: 1024px) 20vw, (min-width: 768px) 33vw, 50vw"
              className={`object-contain transition-transform duration-300 group-hover:scale-[1.05]${isOutOfStock ? ' opacity-40 grayscale' : ''}`}
              style={{ padding: '12%' }}
              unoptimized={product.image_url.toLowerCase().endsWith('.svg')}
              priority={false}
            />
            {isOutOfStock && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/40">
                <span className="rounded-full bg-white/95 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-[var(--cup-muted)] shadow-subtle ring-1 ring-[var(--cup-stroke)]">
                  Sold out
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── Info zone ──────────────────────────────────────────────────── */}
        <div className="px-3 pb-3 pt-2.5">
          <p className="line-clamp-1 font-heading text-[13px] font-semibold leading-snug text-[var(--cup-espresso)]">
            {name}
          </p>
          <div className="mt-1.5 flex items-center justify-between gap-1">
            <span
              className={`text-sm font-bold tabular-nums leading-none ${
                isOutOfStock
                  ? 'text-[var(--cup-muted)] line-through'
                  : 'text-[var(--cup-primary)]'
              }`}
            >
              {price}
            </span>
            {product.review_mode !== 'hidden' && product.rating_count > 0 && (
              <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-[var(--cup-muted)]">
                <Star
                  size={10}
                  aria-hidden="true"
                  className="fill-[var(--cup-star)] stroke-[var(--cup-star)]"
                />
                {product.rating_avg.toFixed(1)}
              </span>
            )}
          </div>
        </div>
      </Link>

      {/* ── Favorite button ──────────────────────────────────────────────── */}
      <button
        type="button"
        disabled={favPending}
        onClick={async (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (favPending) return;
          const next = !favorited;
          setFavorited(next);
          setFavPending(true);
          try {
            if (next) {
              await api.addFavorite(product.id);
            } else {
              await api.removeFavorite(product.id);
            }
          } catch {
            // Revert on error
            setFavorited(!next);
          } finally {
            setFavPending(false);
          }
        }}
        aria-label={
          favorited ? `Remove ${name} from favorites` : `Add ${name} to favorites`
        }
        aria-pressed={favorited}
        className="absolute right-2.5 top-2.5 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-subtle backdrop-blur-sm transition-transform active:scale-90 hover:bg-white disabled:cursor-not-allowed"
      >
        <Heart
          size={14}
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
