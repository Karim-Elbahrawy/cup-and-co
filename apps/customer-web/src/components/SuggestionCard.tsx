'use client';

/**
 * Smart suggestion card — Phase 6.4 of UPGRADE-PLAN.md.
 *
 * Renders a single time-of-day + season-aware product suggestion just
 * below the greeting on the home screen. One-tap "Add" puts it in the
 * cart; "Hide" suppresses the card for 4 hours via sessionStorage so
 * a customer who's already decided isn't pestered.
 *
 * Self-fetches via api.mySuggestion(). Renders nothing on null /
 * dismissed / out-of-bucket scenarios — first-time users with no
 * history still get a seasonal bestseller suggestion.
 */

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Sparkles, Plus, X } from 'lucide-react';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';
import { api, type Suggestion } from '@/lib/api';
import { useCart } from '@/lib/cart';
import { useT, formatPrice } from '@/lib/i18n';

const DISMISS_KEY = 'cup-co-suggestion-dismissed-until';
const DISMISS_DURATION_MS = 4 * 60 * 60 * 1000; // 4 hours

function isDismissed(): boolean {
  if (typeof window === 'undefined') return false;
  const until = window.sessionStorage.getItem(DISMISS_KEY);
  if (!until) return false;
  return Date.now() < Number(until);
}

function dismissFor4h(): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_DURATION_MS));
}

export function SuggestionCard() {
  const { language, t } = useT();
  const reduce = useReducedMotion();
  const router = useRouter();
  const addToCart = useCart((s) => s.add);

  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (isDismissed()) {
      setHidden(true);
      return;
    }
    let cancelled = false;
    api
      .mySuggestion()
      .then((res) => {
        if (!cancelled) setSuggestion(res.suggestion);
      })
      .catch(() => {
        if (!cancelled) setSuggestion(null);
      });
    return () => { cancelled = true; };
  }, []);

  if (hidden || !suggestion) return null;

  const name = language === 'ar' ? suggestion.productNameAr : suggestion.productNameEn;
  const price = formatPrice(suggestion.basePriceEgp, language);

  const eyebrow = (() => {
    const isAr = language === 'ar';
    if (suggestion.reason === 'history') {
      return isAr ? `طلبك المعتاد لـ ${bucketLabel(suggestion.bucket, isAr)}` : `Your usual ${bucketLabel(suggestion.bucket, isAr)}`;
    }
    if (suggestion.reason === 'season') {
      return suggestion.season === 'summer'
        ? (isAr ? 'يومك الحار يستاهل بارد' : 'Hot day calls for iced')
        : (isAr ? 'دفء للصباح البارد' : 'Warm pick for a cool morning');
    }
    // bestseller
    return isAr ? 'الأكثر طلبًا الآن' : 'Most ordered right now';
  })();

  function handleAdd() {
    if (!suggestion) return;
    addToCart({
      productId: suggestion.productId,
      productNameEn: suggestion.productNameEn,
      productNameAr: suggestion.productNameAr,
      imageUrl: suggestion.imageUrl,
      options: {},
      unitPriceEgp: suggestion.basePriceEgp,
      quantity: 1,
    });
    setTimeout(() => router.push('/cart'), 220);
  }

  function handleDismiss() {
    dismissFor4h();
    setHidden(true);
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={reduce ? false : { opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="relative flex items-center gap-4 overflow-hidden rounded-card border border-[var(--cup-stroke)] bg-[linear-gradient(135deg,var(--cup-cream),#FFF6E8)] p-4 shadow-card"
      >
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-white shadow-subtle">
          <Image src={suggestion.imageUrl} alt="" fill sizes="64px" className="object-contain p-1.5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--cup-primary)]">
            <Sparkles size={11} aria-hidden="true" />
            {eyebrow}
          </p>
          <p className="mt-0.5 truncate font-heading text-base font-bold text-[var(--cup-espresso)]">
            {name}
          </p>
          <p className="text-xs font-semibold text-[var(--cup-cocoa)]">{price}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <button
            type="button"
            onClick={handleAdd}
            aria-label={t('common.addToCart')}
            className="inline-flex h-9 items-center gap-1 rounded-pill bg-[var(--cup-primary)] px-3 text-xs font-semibold text-white shadow-warm-glow transition active:scale-95"
          >
            <Plus size={14} aria-hidden="true" />
            {language === 'ar' ? 'أضف' : 'Add'}
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label={language === 'ar' ? 'إخفاء' : 'Hide'}
            className="grid h-7 w-7 place-items-center rounded-full text-[var(--cup-muted)] transition hover:text-[var(--cup-cocoa)]"
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function bucketLabel(bucket: 'morning' | 'midday' | 'evening', isAr: boolean): string {
  if (isAr) {
    if (bucket === 'morning') return 'الصباح';
    if (bucket === 'midday') return 'الظهر';
    return 'المساء';
  }
  if (bucket === 'morning') return 'morning';
  if (bucket === 'midday') return 'afternoon';
  return 'evening';
}
