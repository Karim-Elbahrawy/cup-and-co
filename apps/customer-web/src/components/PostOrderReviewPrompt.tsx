'use client';

/**
 * Inline review prompt rendered on the order tracking page once the
 * order is `completed`. Closes the customer-side feedback loop — until
 * now the admin /reviews page existed but customers had no surface
 * that asked them to leave a rating.
 *
 * UX:
 *   - One row per unique product in the order (deduped by productId).
 *   - 5-star tap-to-rate per row.
 *   - One shared optional comment at the bottom (keeps the form compact
 *     and fast — most customers rate, few write paragraphs).
 *   - Submit posts one /reviews call per rated product. Unrated rows
 *     are skipped, so the customer can rate just the drink they cared
 *     about and leave the rest blank.
 *   - On success or "Not now", we stamp `reviewed:<orderId>` into
 *     localStorage so the prompt doesn't nag on refresh.
 *   - Failures keep the form interactive — next click retries.
 *
 * Self-contained EN/AR copy. When the API contract for /reviews stays
 * stable we'll move strings into packages/i18n.
 */

import { useMemo, useState } from 'react';
import { Star, Send, Check } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import type { ApiOrder } from '@/lib/types';

const STORAGE_KEY_PREFIX = 'cup-co-reviewed:';

export function reviewedKey(orderId: string): string {
  return `${STORAGE_KEY_PREFIX}${orderId}`;
}

/** Has the customer already (rated OR dismissed) reviews for this order? */
export function isOrderReviewed(orderId: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(reviewedKey(orderId)) !== null;
  } catch {
    // SSR or storage blocked — never gate on it.
    return false;
  }
}

function markReviewed(orderId: string, payload: 'submitted' | 'dismissed'): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(reviewedKey(orderId), payload);
  } catch {
    // Storage blocked — accept that we'll re-prompt next visit.
  }
}

/** Dedupe items by productId, preserving the first occurrence. */
function uniqueProducts(order: ApiOrder): ApiOrder['items'] {
  const seen = new Set<string>();
  return order.items.filter((it) => {
    if (seen.has(it.productId)) return false;
    seen.add(it.productId);
    return true;
  });
}

interface PostOrderReviewPromptProps {
  order: ApiOrder;
  language: 'en' | 'ar';
  /** Called after the user submits or dismisses. Parent should hide us. */
  onResolved: () => void;
}

export function PostOrderReviewPrompt({
  order,
  language,
  onResolved,
}: PostOrderReviewPromptProps) {
  const isAr = language === 'ar';
  const products = useMemo(() => uniqueProducts(order), [order]);

  // ratings keyed by productId (1..5). Missing = unrated.
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submittedOk, setSubmittedOk] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ratedCount = Object.values(ratings).filter((r) => r > 0).length;
  const canSubmit = ratedCount > 0 && !submitting && !submittedOk;

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      // Fire one /reviews call per rated product. Done sequentially so a
      // single failure leaves the others not-yet-attempted (safe to retry).
      for (const product of products) {
        const rating = ratings[product.productId];
        if (!rating) continue;
        await api.submitReview({
          productId: product.productId,
          orderId: order.id,
          rating,
          comment: comment.trim(),
        });
      }
      markReviewed(order.id, 'submitted');
      setSubmittedOk(true);
      // Hold the success state for ~1.4s so the customer sees the
      // confirmation before we collapse.
      window.setTimeout(onResolved, 1400);
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : isAr
            ? 'تعذّر إرسال التقييم. حاول مرة أخرى.'
            : 'Could not submit your review. Try again.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  function dismiss() {
    markReviewed(order.id, 'dismissed');
    onResolved();
  }

  if (submittedOk) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-card border border-cup-success/30 bg-[var(--cup-accent-tint)] p-5 text-center shadow-card"
      >
        <span className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-full bg-cup-success text-white">
          <Check className="h-5 w-5" aria-hidden="true" />
        </span>
        <p className="font-heading text-base font-bold text-[var(--cup-espresso)]">
          {isAr ? 'شكراً لتقييمك ☕' : 'Thanks for the review ☕'}
        </p>
      </div>
    );
  }

  return (
    <div
      data-testid="post-order-review-prompt"
      className="rounded-card border border-cup-stroke bg-white p-5 shadow-card"
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--cup-muted)]">
        {isAr ? 'تقييم سريع' : 'Quick review'}
      </p>
      <h2 className="mt-1 font-heading text-lg font-bold text-[var(--cup-espresso)]">
        {isAr ? 'إيه رأيك في طلبك؟' : 'How was your order?'}
      </h2>
      <p className="mt-1 text-sm text-[var(--cup-muted)]">
        {isAr
          ? 'قيّم كل منتج بنجمة واحدة على الأقل. التعليق اختياري.'
          : 'Tap a star for each item. The comment is optional.'}
      </p>

      <ul className="mt-4 space-y-3">
        {products.map((product) => {
          const name = isAr ? product.productNameAr : product.productNameEn;
          const current = ratings[product.productId] ?? 0;
          return (
            <li
              key={product.productId}
              className="flex items-center justify-between gap-3 rounded-2xl bg-[var(--cup-paper)] px-3 py-2.5"
            >
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--cup-espresso)]">
                {name}
              </span>
              <StarRow
                value={current}
                onChange={(v) =>
                  setRatings((prev) => ({ ...prev, [product.productId]: v }))
                }
                ariaLabel={isAr ? `قيّم ${name}` : `Rate ${name}`}
              />
            </li>
          );
        })}
      </ul>

      <label className="mt-4 block">
        <span className="sr-only">{isAr ? 'تعليق' : 'Comment'}</span>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={2}
          maxLength={400}
          placeholder={
            isAr
              ? 'إيه اللي عجبك؟ (اختياري)'
              : 'What did you like? (optional)'
          }
          className="w-full resize-none rounded-2xl border border-cup-stroke bg-white px-3 py-2.5 text-sm text-[var(--cup-espresso)] placeholder:text-[var(--cup-muted)] focus:border-cup-primary focus:outline-none"
        />
      </label>

      {error && (
        <p
          role="alert"
          className="mt-2 rounded-2xl bg-[var(--cup-error)]/10 px-3 py-2 text-xs font-medium text-[var(--cup-error)]"
        >
          {error}
        </p>
      )}

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={dismiss}
          disabled={submitting}
          className="flex-1 rounded-pill border border-cup-stroke bg-white px-4 py-2.5 text-sm font-semibold text-[var(--cup-cocoa)] transition hover:bg-[var(--cup-paper)] disabled:opacity-60"
        >
          {isAr ? 'لاحقاً' : 'Not now'}
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          className="flex flex-[2] items-center justify-center gap-2 rounded-pill bg-cup-primary px-4 py-2.5 text-sm font-bold uppercase tracking-wide text-white shadow-subtle transition hover:bg-cup-primary-hover disabled:opacity-50"
        >
          <Send className="h-4 w-4" aria-hidden="true" />
          {submitting
            ? isAr
              ? 'بنرسل…'
              : 'Sending…'
            : isAr
              ? `أرسل (${ratedCount})`
              : `Send (${ratedCount})`}
        </button>
      </div>
    </div>
  );
}

function StarRow({
  value,
  onChange,
  ariaLabel,
}: {
  value: number;
  onChange: (next: number) => void;
  ariaLabel: string;
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => {
        const active = n <= value;
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} ${n === 1 ? 'star' : 'stars'}`}
            onClick={() => onChange(n)}
            className="grid h-9 w-9 place-items-center rounded-full transition hover:bg-[var(--cup-cream)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cup-primary"
          >
            <Star
              className={`h-5 w-5 transition-colors ${
                active
                  ? 'fill-[var(--cup-star)] text-[var(--cup-star)]'
                  : 'text-cup-stroke'
              }`}
              aria-hidden="true"
            />
          </button>
        );
      })}
    </div>
  );
}
