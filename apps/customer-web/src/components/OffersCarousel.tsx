'use client';

import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Check, Copy, Flame, Sparkles, Tag, Timer } from 'lucide-react';
import type { Offer } from '@/lib/types';

interface OffersCarouselProps {
  offers: Offer[];
  language: 'en' | 'ar';
  label: string;
}

/**
 * Hero offers carousel for the home screen.
 *
 * Each offer renders as a wide gradient card with the headline value
 * (`70% OFF` / `EGP 25 OFF`) hero, the offer name, a tap-to-copy code
 * pill, and a "X days left" timer. Behind the content, two soft white
 * blobs and a subtle shimmer animation give the surface life without
 * yelling. Reduce-motion compliant.
 */
export function OffersCarousel({ offers, language, label }: OffersCarouselProps) {
  const reduce = useReducedMotion();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  if (offers.length === 0) return null;

  function copyCode(code: string) {
    void navigator.clipboard
      .writeText(code)
      .then(() => {
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(null), 1800);
      })
      .catch(() => null);
  }

  function valueLabel(offer: Offer): string {
    if (offer.type === 'percentage') return `${Math.round(offer.value)}%`;
    if (offer.type === 'fixed') return `EGP ${Math.round(offer.value)}`;
    return language === 'ar' ? 'هدية' : 'FREE';
  }

  function valueSuffix(offer: Offer): string {
    if (offer.type === 'percentage' || offer.type === 'fixed') {
      return language === 'ar' ? 'خصم' : 'OFF';
    }
    return language === 'ar' ? 'هدية' : 'ITEM';
  }

  function daysLeft(endsAt: string): number {
    const ms = new Date(endsAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
  }

  return (
    <section aria-label={label} className="space-y-2.5">
      <div className="flex items-center gap-2 px-1">
        <Sparkles
          size={14}
          className="text-[var(--cup-primary)]"
          aria-hidden="true"
        />
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--cup-primary)]">
          {label}
        </p>
      </div>

      <div
        className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2 scrollbar-hide"
        role="list"
      >
        {offers.map((offer, idx) => {
          const days = daysLeft(offer.ends_at);
          const isHot = days <= 2;
          const isCopied = copiedCode === offer.code;

          return (
            <motion.div
              key={offer.id}
              role="listitem"
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={reduce ? { duration: 0 } : { delay: idx * 0.05, duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className="relative isolate flex shrink-0 snap-start overflow-hidden rounded-[24px] shadow-[0_18px_40px_rgba(194,65,12,0.28)]"
              style={{
                width: 'min(86vw, 320px)',
                background:
                  'linear-gradient(135deg, #F4A261 0%, #C2410C 60%, #9A3412 100%)',
              }}
            >
              {/* Decorative blobs */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/15 blur-2xl"
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-10 -left-10 h-36 w-36 rounded-full bg-[#FEF3C7]/25 blur-2xl"
              />

              {/* Subtle shimmer sweep — disabled under reduce-motion */}
              {!reduce && (
                <motion.span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/14 to-transparent"
                  initial={{ x: 0 }}
                  animate={{ x: ['0%', '420%'] }}
                  transition={{ duration: 4.6, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1.4 }}
                />
              )}

              <div className="relative flex w-full flex-col justify-between gap-3 p-5 text-white">
                {/* Top row: value hero + days-left chip */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-heading text-[40px] font-black leading-none tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.15)]">
                      {valueLabel(offer)}
                    </span>
                    <span className="font-heading text-[13px] font-bold uppercase tracking-wider text-white/85">
                      {valueSuffix(offer)}
                    </span>
                  </div>

                  <span
                    className={[
                      'flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] backdrop-blur-sm',
                      isHot
                        ? 'bg-white text-[var(--cup-primary)]'
                        : 'bg-black/22 text-white',
                    ].join(' ')}
                  >
                    {isHot ? (
                      <Flame size={11} className="fill-current" aria-hidden="true" />
                    ) : (
                      <Timer size={11} aria-hidden="true" />
                    )}
                    {days === 0
                      ? language === 'ar'
                        ? 'ينتهي اليوم'
                        : 'Ends today'
                      : days === 1
                        ? language === 'ar'
                          ? 'يوم متبقي'
                          : '1 day left'
                        : language === 'ar'
                          ? `${days} أيام`
                          : `${days} days left`}
                  </span>
                </div>

                {/* Offer name */}
                <p className="line-clamp-2 font-heading text-[15px] font-semibold leading-tight text-white/95">
                  {language === 'ar' ? offer.name_ar : offer.name_en}
                </p>

                {/* Bottom row: tap-to-copy code or "Auto-applied" badge */}
                {offer.code ? (
                  <button
                    type="button"
                    onClick={() => copyCode(offer.code!)}
                    aria-label={
                      language === 'ar'
                        ? `انسخ كود ${offer.code}`
                        : `Copy code ${offer.code}`
                    }
                    className="group flex items-center justify-between gap-2 rounded-full border border-white/35 bg-white/14 px-3.5 py-2 text-start backdrop-blur-sm transition active:scale-[0.98]"
                  >
                    <span className="flex items-center gap-2">
                      <Tag size={13} aria-hidden="true" />
                      <span className="font-mono text-xs font-bold tracking-[0.18em] text-white">
                        {offer.code}
                      </span>
                    </span>
                    <span
                      className={[
                        'flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider transition-colors',
                        isCopied ? 'text-[#FEF3C7]' : 'text-white/85',
                      ].join(' ')}
                    >
                      {isCopied ? (
                        <>
                          <Check size={12} aria-hidden="true" />
                          {language === 'ar' ? 'تم النسخ' : 'Copied'}
                        </>
                      ) : (
                        <>
                          <Copy size={12} aria-hidden="true" />
                          {language === 'ar' ? 'انسخ' : 'Copy'}
                        </>
                      )}
                    </span>
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-white/14 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/95 backdrop-blur-sm">
                    <Sparkles size={11} aria-hidden="true" />
                    {language === 'ar' ? 'يطبق تلقائياً' : 'Auto-applied'}
                  </span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
