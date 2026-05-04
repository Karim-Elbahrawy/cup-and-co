'use client';

import { use, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Heart, Minus, Plus, Star } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useCart } from '@/lib/cart';
import { useT } from '@/lib/i18n';
import type { Product, ProductOption } from '@/lib/types';

const GROUP_ORDER = ['size', 'sugar', 'ice', 'milk', 'extras'] as const;
type Group = (typeof GROUP_ORDER)[number];

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { t, language } = useT();
  const addToCart = useCart((s) => s.add);

  const [data, setData] = useState<{
    product: Product;
    options: ProductOption[];
    is_favorited: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [favorite, setFavorite] = useState(false);
  const [adding, setAdding] = useState(false);

  // Fetch product
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const detail = await api.product(id);
        if (cancelled) return;
        setData({
          product: detail.product,
          options: detail.options,
          is_favorited: detail.is_favorited,
        });
        setFavorite(detail.is_favorited);

        // Pre-select medium size + normal sugar/ice if those groups exist.
        const initial: Record<string, string> = {};
        const groups = groupBy(detail.options);
        for (const g of GROUP_ORDER) {
          const opts = groups[g];
          if (!opts || opts.length === 0) continue;
          const medium = opts.find((o) => o.name_en === 'Medium' || o.name_en === 'Normal');
          initial[g] = (medium ?? opts[0]).name_en;
        }
        setSelected(initial);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof ApiError ? e.message : 'Failed to load product');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const groups = useMemo(
    () => (data ? groupBy(data.options) : ({} as Record<string, ProductOption[]>)),
    [data],
  );
  const optionDelta = useMemo(() => {
    if (!data) return 0;
    let delta = 0;
    for (const [group, name] of Object.entries(selected)) {
      const opt = groups[group]?.find((o) => o.name_en === name);
      if (opt) delta += opt.price_delta_egp;
    }
    return delta;
  }, [selected, groups, data]);

  const unitPrice = data ? data.product.base_price_egp + optionDelta : 0;
  const total = unitPrice * quantity;

  function bumpQuantity(delta: number) {
    setQuantity((q) => Math.max(1, Math.min(20, q + delta)));
  }

  function handleAddToCart() {
    if (!data) return;
    setAdding(true);
    addToCart({
      productId: data.product.id,
      productNameEn: data.product.name_en,
      productNameAr: data.product.name_ar,
      imageUrl: data.product.image_url,
      quantity,
      options: { ...selected },
      unitPriceEgp: unitPrice,
    });
    setTimeout(() => {
      setAdding(false);
      router.push('/cart');
    }, 320);
  }

  // ----------------------------------------------------------------- States

  if (error) {
    return (
      <main className="min-h-screen bg-cup-paper px-6 py-10">
        <div className="mx-auto max-w-md rounded-card border border-cup-error bg-white p-6 text-cup-error">
          <p className="font-semibold">{t('common.error')}</p>
          <p className="mt-1 text-sm">{error}</p>
          <Link href="/" className="mt-3 inline-block text-sm underline">
            {t('common.back')}
          </Link>
        </div>
      </main>
    );
  }

  if (!data) return <ProductDetailSkeleton />;

  const { product } = data;
  const name = language === 'ar' ? product.name_ar : product.name_en;
  const description = language === 'ar' ? product.description_ar : product.description_en;
  const groupLabel: Record<Group, string> = {
    size: t('product.size'),
    sugar: t('product.sugar'),
    ice: t('product.ice'),
    milk: 'Milk',
    extras: 'Extras',
  };

  return (
    <main className="relative min-h-screen bg-cup-paper pb-32">
      {/* Top bar */}
      <header className="sticky top-0 z-20 flex items-center justify-between bg-cup-paper/85 px-5 py-4 backdrop-blur-sm">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label={t('common.back')}
          className="grid h-10 w-10 place-items-center rounded-full border border-cup-stroke bg-white shadow-subtle transition active:scale-95"
        >
          <ChevronLeft className="h-5 w-5 text-cup-brown-900" />
        </button>
        <p className="font-heading text-base font-semibold text-cup-brown-900">
          {t('product.details')}
        </p>
        <button
          type="button"
          onClick={() => setFavorite((f) => !f)}
          aria-label={favorite ? 'Remove from favorites' : 'Add to favorites'}
          className="grid h-10 w-10 place-items-center rounded-full border border-cup-stroke bg-white shadow-subtle transition active:scale-95"
        >
          <Heart
            className={`h-5 w-5 transition-colors ${
              favorite ? 'fill-cup-orange-600 text-cup-orange-600' : 'text-cup-brown-900'
            }`}
          />
        </button>
      </header>

      {/* Hero image */}
      <section className="relative px-6 pt-2 pb-6">
        <div
          aria-hidden="true"
          className="absolute left-1/2 top-1/2 h-[280px] w-[280px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cup-orange-600/12 blur-3xl"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 240, damping: 22 }}
          className="relative mx-auto h-[260px] w-[260px] overflow-hidden rounded-full bg-cup-cream-100 shadow-elevated"
        >
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={name}
              fill
              priority
              sizes="260px"
              className="object-cover"
            />
          ) : null}
        </motion.div>
      </section>

      {/* Product info + quantity */}
      <section className="px-6 pb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="font-heading text-[28px] font-bold leading-tight text-cup-brown-900">
              {name}
            </h1>
            <div className="mt-1 flex items-center gap-1.5 text-sm">
              <Star className="h-4 w-4 fill-cup-star text-cup-star" />
              <span className="font-semibold text-cup-brown-900">
                {product.rating_avg.toFixed(1)}
              </span>
              <span className="text-cup-muted">/5</span>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-pill bg-white p-1.5 shadow-subtle">
            <button
              type="button"
              onClick={() => bumpQuantity(-1)}
              aria-label="Decrease quantity"
              className="grid h-8 w-8 place-items-center rounded-full bg-cup-paper text-cup-brown-900 transition active:scale-90"
            >
              <Minus className="h-4 w-4" />
            </button>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={quantity}
                initial={{ y: 8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -8, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="w-6 text-center font-heading text-base font-bold tabular-nums text-cup-brown-900"
              >
                {quantity}
              </motion.span>
            </AnimatePresence>
            <button
              type="button"
              onClick={() => bumpQuantity(1)}
              aria-label="Increase quantity"
              className="grid h-8 w-8 place-items-center rounded-full bg-cup-orange-600 text-white shadow-subtle transition active:scale-90"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        {description && (
          <p className="mt-3 text-sm leading-relaxed text-cup-brown-700">{description}</p>
        )}
      </section>

      {/* Option groups */}
      <section className="space-y-4 px-6">
        {GROUP_ORDER.map((g) => {
          const opts = groups[g];
          if (!opts || opts.length === 0) return null;
          return (
            <div key={g}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cup-muted">
                {groupLabel[g]}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {opts.map((opt) => {
                  const isSelected = selected[g] === opt.name_en;
                  const optLabel = language === 'ar' ? opt.name_ar : opt.name_en;
                  return (
                    <motion.button
                      key={opt.id}
                      type="button"
                      onClick={() => setSelected((s) => ({ ...s, [g]: opt.name_en }))}
                      whileTap={{ scale: 0.96 }}
                      animate={{
                        backgroundColor: isSelected ? '#C2410C' : '#FEF3C7',
                        color: isSelected ? '#FFFFFF' : '#1C1917',
                      }}
                      transition={{ type: 'spring', stiffness: 360, damping: 22 }}
                      className="rounded-pill px-4 py-2 text-sm font-semibold shadow-subtle"
                      aria-pressed={isSelected}
                    >
                      {optLabel}
                      {opt.price_delta_egp !== 0 && (
                        <span className="ms-1 text-[10px] font-normal italic opacity-80">
                          {opt.price_delta_egp > 0 ? '+' : ''}
                          {opt.price_delta_egp} EGP
                        </span>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </section>

      {/* Sticky bottom add-to-cart */}
      <div
        className="fixed inset-x-0 bottom-0 z-30 border-t border-cup-stroke bg-white/95 px-6 py-4 backdrop-blur"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={adding}
          className="flex w-full items-center justify-between rounded-pill bg-cup-orange-600 px-6 py-4 font-heading text-base font-semibold text-white shadow-[0_8px_24px_rgba(194,65,12,0.32)] transition active:scale-[0.98] disabled:opacity-70"
        >
          <span>{t('common.addToCart')}</span>
          <span className="flex items-center gap-2">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={total}
                initial={{ y: 8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -8, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                EGP {total}
              </motion.span>
            </AnimatePresence>
          </span>
        </button>
      </div>
    </main>
  );
}

function groupBy(options: ProductOption[]): Record<string, ProductOption[]> {
  const out: Record<string, ProductOption[]> = {};
  for (const opt of options) {
    (out[opt.group_name] ||= []).push(opt);
  }
  return out;
}

function ProductDetailSkeleton() {
  return (
    <main className="min-h-screen bg-cup-paper px-6 pt-6 pb-32">
      <div className="mx-auto max-w-md animate-pulse space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-10 w-10 rounded-full bg-cup-stroke" />
          <div className="h-4 w-20 rounded bg-cup-stroke" />
          <div className="h-10 w-10 rounded-full bg-cup-stroke" />
        </div>
        <div className="mx-auto h-[260px] w-[260px] rounded-full bg-cup-stroke" />
        <div className="space-y-2">
          <div className="h-6 w-3/4 rounded bg-cup-stroke" />
          <div className="h-4 w-1/3 rounded bg-cup-stroke" />
        </div>
        <div className="space-y-3">
          <div className="h-4 w-12 rounded bg-cup-stroke" />
          <div className="flex gap-2">
            <div className="h-8 w-20 rounded-pill bg-cup-stroke" />
            <div className="h-8 w-24 rounded-pill bg-cup-stroke" />
            <div className="h-8 w-20 rounded-pill bg-cup-stroke" />
          </div>
        </div>
      </div>
    </main>
  );
}
