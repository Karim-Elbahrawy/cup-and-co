'use client';

import { use, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Heart, Minus, Plus, Star, Send, User } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useCart } from '@/lib/cart';
import { useT } from '@/lib/i18n';
import type { Product, ProductOption, Review, ReviewInput } from '@/lib/types';

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
    reviews: Review[];
    is_favorited: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [favorite, setFavorite] = useState(false);
  const [adding, setAdding] = useState(false);

  // Review form state
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewSuccess, setReviewSuccess] = useState(false);

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
          reviews: (detail as unknown as { reviews?: Review[] }).reviews ?? [],
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

  async function toggleFavorite() {
    const next = !favorite;
    setFavorite(next);
    try {
      if (next) {
        await api.addFavorite(id);
      } else {
        await api.removeFavorite(id);
      }
    } catch {
      // Revert on failure
      setFavorite(!next);
    }
  }

  async function handleSubmitReview() {
    if (reviewRating === 0 || !reviewComment.trim() || submittingReview) return;
    setSubmittingReview(true);
    setReviewError(null);
    try {
      const input: ReviewInput = {
        productId: id,
        rating: reviewRating,
        comment: reviewComment.trim(),
      };
      const newReview = await api.submitReview(input);
      // Add new review to the list
      setData((prev) =>
        prev
          ? {
              ...prev,
              reviews: [
                {
                  id: newReview.id,
                  user_id: newReview.userId,
                  product_id: newReview.productId,
                  order_id: newReview.orderId,
                  rating: newReview.rating,
                  comment: newReview.comment,
                  hidden: newReview.hidden,
                  created_at: newReview.createdAt,
                } as unknown as Review,
                ...prev.reviews,
              ],
            }
          : prev,
      );
      setReviewRating(0);
      setReviewComment('');
      setReviewSuccess(true);
      setTimeout(() => setReviewSuccess(false), 3000);
    } catch (e) {
      setReviewError(e instanceof ApiError ? e.message : 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
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
          onClick={toggleFavorite}
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

      {/* Reviews section */}
      <section className="mt-8 space-y-4 px-6">
        <h2 className="font-heading text-lg font-bold text-cup-brown-900">Reviews</h2>

        {/* Write a review */}
        <div className="rounded-2xl border border-cup-stroke bg-white p-4 shadow-subtle">
          <p className="font-heading text-sm font-semibold text-cup-brown-900">
            Write a Review
          </p>

          {/* Star rating selector */}
          <div className="mt-3 flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setReviewRating(star)}
                aria-label={`Rate ${star} star${star !== 1 ? 's' : ''}`}
                className="transition active:scale-90"
              >
                <Star
                  className={`h-7 w-7 ${
                    star <= reviewRating
                      ? 'fill-cup-star text-cup-star'
                      : 'fill-transparent text-cup-stroke'
                  }`}
                />
              </button>
            ))}
          </div>

          {/* Comment */}
          <textarea
            value={reviewComment}
            onChange={(e) => setReviewComment(e.target.value)}
            placeholder="Share your experience..."
            rows={3}
            className="mt-3 w-full resize-none rounded-xl border border-cup-stroke bg-cup-paper px-4 py-3 font-body text-sm text-cup-brown-900 placeholder:text-cup-muted focus:border-cup-orange-500 focus:outline-none focus:ring-1 focus:ring-cup-orange-500"
          />

          {reviewError && (
            <p className="mt-2 text-xs text-cup-error">{reviewError}</p>
          )}

          {reviewSuccess && (
            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2 text-xs font-semibold text-cup-teal-600"
            >
              Review submitted! Thank you.
            </motion.p>
          )}

          <button
            type="button"
            onClick={handleSubmitReview}
            disabled={reviewRating === 0 || !reviewComment.trim() || submittingReview}
            className="mt-3 flex items-center gap-2 rounded-full bg-cup-orange-500 px-6 py-3 font-heading text-sm font-semibold text-white shadow-subtle transition active:scale-95 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            {submittingReview ? 'Submitting...' : 'Submit Review'}
          </button>
        </div>

        {/* Existing reviews */}
        {data.reviews.length > 0 ? (
          <motion.div
            className="space-y-3"
            initial="hidden"
            animate="visible"
            variants={{
              visible: { transition: { staggerChildren: 0.04 } },
            }}
          >
            {data.reviews
              .filter((r) => !r.hidden)
              .map((review) => (
                <motion.div
                  key={review.id}
                  variants={{
                    hidden: { opacity: 0, y: 8 },
                    visible: { opacity: 1, y: 0 },
                  }}
                  transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                  className="rounded-2xl border border-cup-stroke bg-white p-4 shadow-subtle"
                >
                  <div className="flex items-center gap-3">
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-cup-paper text-cup-muted">
                      <User className="h-4 w-4" />
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3.5 w-3.5 ${
                              i < review.rating
                                ? 'fill-cup-star text-cup-star'
                                : 'fill-transparent text-cup-stroke'
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-[10px] text-cup-muted">
                        {new Date(review.created_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                  {review.comment && (
                    <p className="mt-2 text-sm leading-relaxed text-cup-brown-700">
                      {review.comment}
                    </p>
                  )}
                </motion.div>
              ))}
          </motion.div>
        ) : (
          <div className="rounded-2xl border border-cup-stroke bg-white p-6 text-center shadow-subtle">
            <p className="text-sm text-cup-muted">No reviews yet. Be the first!</p>
          </div>
        )}
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
