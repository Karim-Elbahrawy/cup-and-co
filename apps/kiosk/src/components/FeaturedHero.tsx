'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight } from 'lucide-react';
import type { Product } from '@cup-and-co/types';
import type { KioskLang } from '@/lib/lang';

/**
 * K4.7 featured-today hero card.
 *
 * Wide 2-column card pinned to the top of the catalog grid when an admin
 * has flagged a product as "feature today". Visually distinct from the
 * regular product tiles: sunrise gradient frame, larger photo, pulsing
 * spark icon, "Feature today" tag.
 *
 * Tap behaviour mirrors a regular product tile — opens the customize
 * detail screen with the same product. We deliberately don't add the
 * product to cart on tap (would skip the customize step).
 */

interface FeaturedHeroProps {
  product: Product;
  lang: KioskLang;
  onTap: () => void;
}

export function FeaturedHero({ product, lang, onTap }: FeaturedHeroProps) {
  const name = lang === 'ar' ? product.name_ar : product.name_en;
  const description = lang === 'ar' ? product.description_ar : product.description_en;

  return (
    <motion.button
      type="button"
      onClick={onTap}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="group relative col-span-2 overflow-hidden rounded-card text-left shadow-elevated transition active:scale-[0.99] md:col-span-3 xl:col-span-4"
    >
      {/* Sunrise frame */}
      <div className="cup-sunrise relative flex min-h-[280px] items-stretch p-1.5">
        <div className="grid w-full grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-6 rounded-card bg-white p-8">
          {/* Left: copy + CTA */}
          <div className="flex min-w-0 flex-col justify-between">
            <div>
              <span className="inline-flex items-center gap-2 rounded-pill bg-cup-primary/10 px-4 py-1.5 text-sm font-bold uppercase tracking-[0.18em] text-cup-primary">
                <motion.span
                  animate={{ rotate: [0, 14, -8, 0] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                  aria-hidden="true"
                >
                  <Sparkles className="h-4 w-4" />
                </motion.span>
                {lang === 'ar' ? 'مميّز اليوم' : 'Featured today'}
              </span>
              <h2 className="mt-3 font-heading text-k-hero leading-tight text-[var(--cup-espresso)]">
                {name}
              </h2>
              {description ? (
                <p className="mt-3 max-w-md font-body text-k-body text-[var(--cup-cocoa)] line-clamp-2">
                  {description}
                </p>
              ) : null}
            </div>
            <div className="mt-6 flex items-center justify-between gap-4">
              <span className="font-heading text-[44px] font-extrabold text-[var(--cup-primary)]">
                {product.base_price_egp} EGP
              </span>
              <span className="inline-flex items-center gap-2 rounded-pill bg-cup-primary px-6 py-3 font-heading text-k-card font-bold text-white transition group-hover:bg-cup-primary-hover">
                {lang === 'ar' ? 'اطلب' : 'Order'}
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </span>
            </div>
          </div>

          {/* Right: hero image */}
          <div className="relative grid place-items-center overflow-hidden rounded-2xl bg-[var(--cup-paper)]">
            <Image
              src={product.image_url}
              alt=""
              fill
              sizes="(min-width: 1280px) 28vw, 40vw"
              className="object-contain p-4"
              priority
            />
          </div>
        </div>
      </div>
    </motion.button>
  );
}
