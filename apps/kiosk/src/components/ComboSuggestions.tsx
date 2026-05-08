'use client';

import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus } from 'lucide-react';
import type { Product } from '@cup-and-co/types';
import type { KioskLang } from '@/lib/lang';

/**
 * K4.9 "Complete the combo" — bottom-of-drawer suggestions.
 *
 * The parent computes which products to show (union of pairs_well_with
 * across in-cart lines, minus anything already in cart, capped at 2)
 * and passes them as `products`. We render a compact horizontally-
 * laid-out card per suggestion. Tap → onAdd(product) which the parent
 * uses to drop the product into the cart with default options (no
 * customize step — speed > precision for upsells).
 *
 * Hidden when the input list is empty so the cart's totals don't
 * jump unnecessarily.
 */

interface ComboSuggestionsProps {
  products: Product[];
  lang: KioskLang;
  onAdd: (product: Product) => void;
}

export function ComboSuggestions({ products, lang, onAdd }: ComboSuggestionsProps) {
  if (products.length === 0) return null;

  return (
    <section
      aria-label={lang === 'ar' ? 'كمّل الكومبو' : 'Complete the combo'}
      className="mb-5 rounded-2xl bg-[var(--cup-paper)] p-4"
    >
      <p className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-[var(--cup-cocoa)]">
        {lang === 'ar' ? 'كمّل الكومبو' : 'Complete the combo'}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <AnimatePresence initial={false}>
          {products.map((product) => (
            <motion.button
              key={product.id}
              type="button"
              onClick={() => onAdd(product)}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="group flex items-center gap-3 rounded-2xl bg-white p-3 text-left shadow-subtle transition active:scale-[0.98] hover:shadow-card"
            >
              <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-[var(--cup-paper)]">
                <Image
                  src={product.image_url}
                  alt=""
                  fill
                  sizes="64px"
                  className="object-contain p-1.5"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-heading text-[18px] font-bold text-[var(--cup-espresso)] truncate">
                  {lang === 'ar' ? product.name_ar : product.name_en}
                </p>
                <p className="text-sm font-semibold text-[var(--cup-primary)]">
                  +{product.base_price_egp} EGP
                </p>
              </div>
              <span
                className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-full bg-cup-primary text-white transition group-hover:bg-cup-primary-hover"
                aria-hidden="true"
              >
                <Plus className="h-6 w-6" strokeWidth={2.5} />
              </span>
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}
